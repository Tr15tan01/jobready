"""
Thin wrapper around the Gemini API used by every AIService operation.

Centralizes: JSON-mode invocation, one retry on invalid JSON, Pydantic
validation, and AIRequest logging for cost tracking (sections 25-27).
No caller talks to `google.genai` directly.
"""
import hashlib
import json
import time
from typing import Optional, Type, TypeVar
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.progress import AIRequest

T = TypeVar("T", bound=BaseModel)


def hash_input(*parts: str) -> str:
    """Stable cache key for a set of input strings (section 25 cost control)."""
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()

# Very rough per-1K-token USD estimates for cost tracking; override with
# real provider pricing once finalized. Never blocks a request if unknown.
_COST_PER_1K_INPUT = 0.000075
_COST_PER_1K_OUTPUT = 0.0003


async def _call_gemini_raw(prompt: str, model: str, max_output_tokens: int) -> tuple[str, int, int]:
    """Returns (text, input_tokens, output_tokens). Isolated so it's the
    only function that needs the real SDK/API key."""
    from google import genai  # imported lazily so tests never require it
    from google.genai import errors as genai_errors

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                # Hard ceiling on output — the expensive side of the bill.
                # Without it a model can pad a JSON field indefinitely.
                "max_output_tokens": max_output_tokens,
                # Deterministic-leaning output: better cache hit rates on
                # repeated inputs and less rambling.
                "temperature": 0.3,
            },
        )
    except genai_errors.ClientError as exc:
        # A 404 here almost always means the configured model ID is not
        # available to this API key — Google closes older models to new
        # keys ahead of their published shutdown date. Surface that as an
        # actionable message rather than a raw SDK stack trace.
        if getattr(exc, "code", None) == 404:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"The configured model '{model}' is not available to your API key. "
                    "Run 'python -m app.scripts.list_models' to see which models you "
                    "can use, then update the matching GEMINI_MODEL_* value in your .env."
                ),
            ) from exc
        raise

    text = response.text or "{}"
    usage = getattr(response, "usage_metadata", None)
    input_tokens = getattr(usage, "prompt_token_count", 0) if usage else 0
    output_tokens = getattr(usage, "candidates_token_count", 0) if usage else 0
    return text, input_tokens, output_tokens


async def generate_structured(
    db: AsyncSession,
    *,
    prompt: str,
    model: str,
    schema: Type[T],
    feature: str,
    user_id: Optional[UUID],
    cache_hit: bool = False,
    max_output_tokens: int = 2048,
) -> T:
    """Call Gemini, validate the JSON response against `schema`, retry once
    on failure, log an AIRequest row either way, and never raise on the
    AI's malformed output — it either succeeds or falls back to `schema()`
    populated with nothing but None/empty-defaults (never crashes the
    caller's request, per section 42)."""
    start = time.monotonic()
    last_error: Optional[Exception] = None
    input_tokens = output_tokens = 0

    for attempt in range(2):
        try:
            text, input_tokens, output_tokens = await _call_gemini_raw(prompt, model, max_output_tokens)
            data = json.loads(text)
            validated = schema.model_validate(data)
            await _log_request(
                db, feature=feature, model=model, user_id=user_id,
                input_tokens=input_tokens, output_tokens=output_tokens,
                latency_ms=int((time.monotonic() - start) * 1000),
                status="success", cache_hit=cache_hit,
            )
            return validated
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            continue

    # Both attempts failed — log the failure and return a safe empty
    # instance rather than raising, so the request degrades gracefully.
    await _log_request(
        db, feature=feature, model=model, user_id=user_id,
        input_tokens=input_tokens, output_tokens=output_tokens,
        latency_ms=int((time.monotonic() - start) * 1000),
        status="error", cache_hit=cache_hit,
    )
    return schema()


async def _log_request(
    db: AsyncSession, *, feature: str, model: str, user_id: Optional[UUID],
    input_tokens: int, output_tokens: int, latency_ms: int, status: str, cache_hit: bool,
) -> None:
    cost = (input_tokens / 1000 * _COST_PER_1K_INPUT) + (output_tokens / 1000 * _COST_PER_1K_OUTPUT)
    db.add(AIRequest(
        user_id=user_id, feature=feature, model=model,
        input_tokens=input_tokens, output_tokens=output_tokens,
        estimated_cost_usd=round(cost, 6), cache_hit=cache_hit,
        latency_ms=latency_ms, status=status,
    ))
    await db.commit()
