"""
Provider selection must fail loudly and usefully when misconfigured.
A missing API key previously surfaced as an opaque 500 from deep inside
the Google SDK; these pin the clear-503 behavior instead.
"""
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.ai.base import GeminiAIService, MockAIService, get_ai_service
from app.services.speech.base import GeminiSpeechProvider, MockSpeechProvider, get_speech_provider


@pytest.fixture
def restore_settings():
    original = (settings.ENVIRONMENT, settings.AI_PROVIDER, settings.GEMINI_API_KEY,
                settings.SPEECH_PROVIDER)
    yield
    (settings.ENVIRONMENT, settings.AI_PROVIDER, settings.GEMINI_API_KEY,
     settings.SPEECH_PROVIDER) = original


def test_mock_provider_selected_explicitly(restore_settings):
    settings.ENVIRONMENT = "development"
    settings.AI_PROVIDER = "mock"
    assert isinstance(get_ai_service(), MockAIService)


def test_missing_api_key_raises_clear_503(restore_settings):
    settings.ENVIRONMENT = "development"
    settings.AI_PROVIDER = "gemini"
    settings.GEMINI_API_KEY = ""
    with pytest.raises(HTTPException) as exc:
        get_ai_service()
    assert exc.value.status_code == 503
    # The message must tell the user what to actually do.
    assert "GEMINI_API_KEY" in exc.value.detail
    assert "AI_PROVIDER=mock" in exc.value.detail


def test_gemini_selected_when_key_present(restore_settings):
    settings.ENVIRONMENT = "development"
    settings.AI_PROVIDER = "gemini"
    settings.GEMINI_API_KEY = "fake-key-for-selection-test"
    assert isinstance(get_ai_service(), GeminiAIService)


def test_unknown_provider_rejected(restore_settings):
    settings.ENVIRONMENT = "development"
    settings.AI_PROVIDER = "not-a-provider"
    with pytest.raises(HTTPException) as exc:
        get_ai_service()
    assert exc.value.status_code == 503


def test_test_environment_always_uses_mock(restore_settings):
    settings.ENVIRONMENT = "test"
    settings.AI_PROVIDER = "gemini"
    settings.GEMINI_API_KEY = ""
    assert isinstance(get_ai_service(), MockAIService)


def test_speech_provider_missing_key_raises_503(restore_settings):
    settings.ENVIRONMENT = "development"
    settings.AI_PROVIDER = "gemini"
    settings.SPEECH_PROVIDER = "gemini"
    settings.GEMINI_API_KEY = ""
    with pytest.raises(HTTPException) as exc:
        get_speech_provider()
    assert exc.value.status_code == 503
    assert "text answers" in exc.value.detail


def test_speech_provider_uses_mock_when_ai_provider_is_mock(restore_settings):
    settings.ENVIRONMENT = "development"
    settings.AI_PROVIDER = "mock"
    assert isinstance(get_speech_provider(), MockSpeechProvider)


def test_speech_provider_selected_when_key_present(restore_settings):
    settings.ENVIRONMENT = "development"
    settings.AI_PROVIDER = "gemini"
    settings.SPEECH_PROVIDER = "gemini"
    settings.GEMINI_API_KEY = "fake-key-for-selection-test"
    assert isinstance(get_speech_provider(), GeminiSpeechProvider)
