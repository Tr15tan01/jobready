from app.data.speech_prompts import PROMPT_BANK, SPEECH_PRACTICE_LABELS, SPEECH_PRACTICE_MODES, get_random_prompt
from app.prompts.answer_evaluation import CRITERIA_BY_MODE


def test_exactly_six_speech_practice_modes():
    assert len(SPEECH_PRACTICE_MODES) == 6


def test_every_mode_has_a_label():
    for mode in SPEECH_PRACTICE_MODES:
        assert mode in SPEECH_PRACTICE_LABELS
        assert SPEECH_PRACTICE_LABELS[mode]


def test_every_mode_has_multiple_prompts():
    for mode in SPEECH_PRACTICE_MODES:
        assert mode in PROMPT_BANK
        assert len(PROMPT_BANK[mode]) >= 5


def test_every_mode_has_evaluation_criteria():
    for mode in SPEECH_PRACTICE_MODES:
        assert mode in CRITERIA_BY_MODE
        assert CRITERIA_BY_MODE[mode]


def test_get_random_prompt_returns_prompt_from_bank():
    for mode in SPEECH_PRACTICE_MODES:
        prompt = get_random_prompt(mode)
        assert prompt in PROMPT_BANK[mode]


def test_get_random_prompt_rejects_unknown_mode():
    import pytest
    with pytest.raises(ValueError):
        get_random_prompt("not-a-real-mode")


def test_speech_modes_dont_collide_with_interview_modes():
    """Speech Practice modes must be distinguishable from job-interview
    modes so evaluation criteria and prompts never mix up."""
    interview_modes = {"behavioral", "domain", "hr", "general", "custom"}
    assert interview_modes.isdisjoint(set(SPEECH_PRACTICE_MODES))
