"""
Guards against a real regression. On Gemini 3 models max_output_tokens is a
COMBINED thinking + output budget. Tight caps with default (high) thinking
let reasoning consume the whole budget, truncating the JSON and silently
producing empty results — which surfaced as a "1-day learning plan".
"""
import inspect

import pytest

from app.services.ai import base, gemini_client
from app.services.ai.gemini_client import _thinking_config


def test_gemini3_uses_thinking_level():
    assert _thinking_config("gemini-3.6-flash", "low") == {"thinking_level": "low"}


def test_gemini25_uses_numeric_budget_not_level():
    """Sending thinking_level to a 2.5 model (or both params) is an API error."""
    cfg = _thinking_config("gemini-2.5-flash", "low")
    assert "thinking_budget" in cfg and "thinking_level" not in cfg


def test_unknown_model_gets_no_thinking_params():
    assert _thinking_config("some-other-model", "low") == {}


def test_every_ai_call_declares_thinking_effort():
    src = inspect.getsource(base.GeminiAIService)
    calls = src.count("generate_structured(")
    assert src.count('thinking="') == calls, "every AI call must set an explicit thinking effort"


def test_budgets_leave_room_for_thinking():
    """Low-effort thinking alone can use ~1.5k tokens. Any budget below this
    floor risks the model exhausting it before writing output."""
    import re
    src = inspect.getsource(base.GeminiAIService)
    budgets = [int(b) for b in re.findall(r"max_output_tokens=(\d+)", src)]
    assert budgets and min(budgets) >= 2500, f"budget too small for thinking: {min(budgets)}"


def test_no_temperature_in_request_config():
    """Google's Gemini 3 guidance is to leave sampling params at defaults."""
    src = inspect.getsource(gemini_client._call_gemini_raw)
    assert '"temperature"' not in src


@pytest.mark.asyncio
async def test_mock_learning_plan_is_complete():
    """Mock mode must return a full plan — an empty one now correctly errors."""
    plan = await base.MockAIService().generate_learning_plan(
        None, None, days=7, job_title=None, skill_gaps=[], recurring_weaknesses=[], locale="en",
    )
    assert len(plan.items) == 7
    assert [i.day_number for i in plan.items] == list(range(1, 8))
