"""
Speech-to-text is behind a provider interface (section 17) so the
business logic never hard-codes a specific vendor. Audio bytes are
processed only in memory for the duration of the call and are never
written to disk or object storage — this file is the ONLY place raw
audio bytes exist, and they go out of scope the moment the function
returns (section 15/16/31 privacy requirements).
"""
from abc import ABC, abstractmethod

from fastapi import HTTPException, status

from app.core.config import settings


class SpeechProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str, locale: str) -> str: ...


class GeminiSpeechProvider(SpeechProvider):
    async def transcribe(self, audio_bytes: bytes, mime_type: str, locale: str) -> str:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.SPEECH_MODEL,
            contents=[
                f"Transcribe this audio verbatim, in the language it's spoken in "
                f"(expected: {locale}). Return only the transcript text, nothing else.",
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            ],
        )
        return (response.text or "").strip()


class MockSpeechProvider(SpeechProvider):
    """Used by the test suite — no real audio processing required."""

    async def transcribe(self, audio_bytes: bytes, mime_type: str, locale: str) -> str:
        return ""


def get_speech_provider() -> SpeechProvider:
    """Same fail-fast contract as get_ai_service(): a missing key gives a
    clear 503 rather than an opaque SDK error mid-transcription."""
    if settings.ENVIRONMENT == "test" or settings.AI_PROVIDER == "mock":
        return MockSpeechProvider()

    if settings.SPEECH_PROVIDER != "gemini":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unknown SPEECH_PROVIDER '{settings.SPEECH_PROVIDER}'.",
        )

    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Voice answers require GEMINI_API_KEY to be configured. "
                "Set it in your .env, or use text answers instead."
            ),
        )

    return GeminiSpeechProvider()
