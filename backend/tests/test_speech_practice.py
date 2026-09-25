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


# ---- Topic tiers and randomness ------------------------------------------

from app.core.config import settings  # noqa: E402
from app.data.speech_prompts import available_prompts  # noqa: E402


def test_every_mode_has_enough_topics_for_pro():
    for mode in SPEECH_PRACTICE_MODES:
        assert len(PROMPT_BANK[mode]) >= settings.PRO_SPEECH_TOPICS
        assert len(set(PROMPT_BANK[mode])) == len(PROMPT_BANK[mode]), f"duplicate topic in {mode}"


def test_paid_plans_unlock_more_topics():
    assert settings.FREE_SPEECH_TOPICS < settings.PREMIUM_SPEECH_TOPICS < settings.PRO_SPEECH_TOPICS


def test_free_plan_only_draws_from_its_slice():
    free = set(available_prompts("impromptu", settings.FREE_SPEECH_TOPICS))
    assert len(free) == settings.FREE_SPEECH_TOPICS
    for _ in range(200):
        assert get_random_prompt("impromptu", limit=settings.FREE_SPEECH_TOPICS) in free


def test_never_repeats_until_pool_is_used_up():
    limit = settings.FREE_SPEECH_TOPICS
    history: list[str] = []
    for _ in range(limit):
        p = get_random_prompt("impromptu", limit=limit, recent=list(reversed(history)))
        assert p not in history
        history.append(p)
    assert set(history) == set(available_prompts("impromptu", limit))


def test_after_pool_used_the_latest_topic_is_not_repeated():
    limit = settings.FREE_SPEECH_TOPICS
    pool = available_prompts("debate", limit)
    recent = list(pool)  # newest first
    for _ in range(100):
        assert get_random_prompt("debate", limit=limit, recent=recent) not in recent[: limit // 2]


def test_first_topic_is_actually_random():
    firsts = {get_random_prompt("storytelling", limit=settings.FREE_SPEECH_TOPICS) for _ in range(200)}
    assert len(firsts) >= 6
