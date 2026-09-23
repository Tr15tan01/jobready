"""
Thin wrapper around the Gemini API used by every AIService operation.

Centralizes: JSON-mode invocation, one retry on invalid JSON, Pydantic
validation, and AIRequest logging for cost tracking (sections 25-27).
No caller talks to `google.genai` directly.
"""
import hashlib
import logging
import json
import time
from typing import Optional, Type, TypeVar
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.progress import AIRequest
from app.services.costs import estimate_cost

T = TypeVar("T", bound=BaseModel)


def hash_input(*parts: str) -> str:
    """Stable cache key for a set of input strings (section 25 cost control)."""
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()

# Costs come from app/services/costs.py (per-model, current pricing).


def _thinking_config(model: str, level: str) -> dict:
    """Maps a thinking effort to whichever parameter this model family uses.

    Why this matters (both for correctness and cost):
    - On Gemini 3 models, max_output_tokens is a COMBINED budget for
      thinking + visible output. At the default effort the model can spend
      thousands of tokens reasoning, exhausting the budget before it writes
      any JSON — which is exactly what produced truncated, empty responses.
    - Thinking tokens are billed as output tokens. Structured extraction
      and rewriting don't need deep reasoning, so "low" effort cuts cost
      substantially without affecting result quality.

    Gemini 3.x uses the string `thinking_level`; 2.5 uses a numeric
    `thinking_budget`. Sending both in one request is an error.
    """
    if model.startswith("gemini-3"):
        # "minimal" isn't supported on every 3.x model (not on 3.8 Flash),
        # so "low" is the safe floor across the whole family.
        return {"thinking_level": level}
    if model.startswith("gemini-2.5"):
        return {"thinking_budget": {"low": 512, "medium": 2048, "high": 8192}.get(level, 512)}
    return {}


async def _call_gemini_raw(
    prompt: str, model: str, max_output_tokens: int, thinking: str = "low",
) -> tuple[str, int, int]:
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
                # Ceiling on thinking + output combined (see
                # _thinking_config). A ceiling, not a cost: billing follows
                # tokens actually used, so headroom here is free and only
                # prevents truncation.
                "max_output_tokens": max_output_tokens,
                # No temperature: Google's guidance for Gemini 3.x is to
                # leave sampling parameters at their defaults.
                "thinking_config": _thinking_config(model, thinking),
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

    finish = None
    try:
        finish = str(response.candidates[0].finish_reason) if response.candidates else None
    except (AttributeError, IndexError):
        pass
    if finish and "MAX_TOKENS" in finish:
        # Surfaced loudly: a silent truncation previously looked like a
        # normal empty result and was papered over by fallbacks.
        logging.getLogger("jobready.ai").warning(
            "Gemini response truncated (MAX_TOKENS) model=%s budget=%d thinking=%s",
            model, max_output_tokens, thinking,
        )

    text = response.text or "{}"
    usage = getattr(response, "usage_metadata", None)
    input_tokens = getattr(usage, "prompt_token_count", 0) if usage else 0
    output_tokens = getattr(usage, "candidates_token_count", 0) if usage else 0
    # Thinking tokens are billed as output but reported separately.
    output_tokens += (getattr(usage, "thoughts_token_count", 0) or 0) if usage else 0
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
    max_output_tokens: int = 4096,
    thinking: str = "low",
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
            text, input_tokens, output_tokens = await _call_gemini_raw(prompt, model, max_output_tokens, thinking)
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
    cost = estimate_cost(model, input_tokens, output_tokens)
    db.add(AIRequest(
        user_id=user_id, feature=feature, model=model,
        input_tokens=input_tokens, output_tokens=output_tokens,
        estimated_cost_usd=round(cost, 6), cache_hit=cache_hit,
        latency_ms=latency_ms, status=status,
    ))
    await db.commit()
