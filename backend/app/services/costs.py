"""
AI cost model — the single source of truth for what AI usage costs.

Used for two things:
  1. Recording an accurate estimated_cost_usd on every AIRequest (the admin
     "AI spend" figure). Previously this used Gemini 1.5-era rates and
     under-reported spend by roughly 10-25x.
  2. Proving each plan's limits can't cost more than the plan earns — see
     worst_case_monthly_cost() and tests/test_plan_economics.py.

Prices are USD per 1M tokens. Deliberately CONSERVATIVE: Gemini 3.6/3.7/3.8
Flash are on introductory pricing ($0.75 / $3.75) through Dec 31 2026 and
move to $1.50 / $7.50 on Jan 1 2027. Planning on the higher standard rate
means limits stay safe after the increase. Output price covers thinking
tokens, which are billed as output.
"""
from app.core.config import settings

# (input, output) USD per 1M tokens, matched by longest model-name prefix.
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "gemini-3.5-flash-lite": (0.30, 2.50),
    "gemini-3.1-flash-lite": (0.25, 1.50),
    "gemini-3.8-flash": (1.50, 7.50),
    "gemini-3.7-flash": (1.50, 7.50),
    "gemini-3.6-flash": (1.50, 7.50),
    "gemini-3.5-flash": (1.50, 9.00),
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-embedding": (0.15, 0.0),
}
# Unknown models are costed as an expensive Flash, never as free.
FALLBACK_PRICING = (1.50, 9.00)


def pricing_for(model: str) -> tuple[float, float]:
    matches = [p for p in MODEL_PRICING if model.startswith(p)]
    return MODEL_PRICING[max(matches, key=len)] if matches else FALLBACK_PRICING


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    inp, out = pricing_for(model)
    return (input_tokens * inp + output_tokens * out) / 1_000_000


# ---- Per-operation estimates ----------------------------------------------
# Typical tokens per call, output INCLUDING thinking at the effort each
# operation is configured with (low, except evaluation = medium). Rounded
# up. Audio: Gemini bills ~32 tokens/sec; a 90s answer is ~2.9k tokens.
OPERATIONS: dict[str, tuple[str, int, int]] = {
    # name: (model setting, input tokens, output tokens incl. thinking)
    "interview_question": ("GEMINI_MODEL_INTERVIEW", 1_500, 1_300),
    "answer_evaluation": ("GEMINI_MODEL_EVALUATION", 1_300, 3_500),
    "transcription": ("SPEECH_MODEL", 3_000, 1_300),
    "resume_extraction": ("GEMINI_MODEL_RESUME", 3_500, 2_600),
    "resume_generation": ("GEMINI_MODEL_RESUME", 1_500, 2_600),
    "job_match": ("GEMINI_MODEL_JOB_ANALYSIS", 4_000, 3_000),  # extraction + match, uncached
    "learning_plan": ("GEMINI_MODEL_DEFAULT", 900, 2_300),
}


def operation_cost(name: str) -> float:
    setting, inp, out = OPERATIONS[name]
    return estimate_cost(getattr(settings, setting), inp, out)


def worst_case_session_cost(session_type: str, caps: dict) -> float:
    """Most one session can cost under the plan's per-session caps,
    assuming every answer is spoken (so also transcribed)."""
    per_answer = operation_cost("answer_evaluation") + operation_cost("transcription")
    if session_type == "interview":
        return (caps["max_questions"] * operation_cost("interview_question")
                + caps["max_evaluations"] * per_answer)
    # Speech prompts come from a static bank: no AI cost to pick one.
    return caps["max_speech_attempts"] * per_answer


def worst_case_monthly_cost(limits: dict, caps: dict) -> float:
    """Upper bound on one user's monthly AI cost: every allowance used in
    full, every session run to its cap, every answer spoken. Real usage is
    far lower; this is the number that must stay below the plan price."""
    return (
        limits.get("interview_session", 0) * worst_case_session_cost("interview", caps)
        + limits.get("speech_practice", 0) * worst_case_session_cost("speech", caps)
        + limits.get("resume_analysis", 0) * operation_cost("resume_extraction")
        + limits.get("resume_generation", 0) * operation_cost("resume_generation")
        + limits.get("job_match", 0) * operation_cost("job_match")
        + limits.get("learning_plan", 0) * operation_cost("learning_plan")
    )
