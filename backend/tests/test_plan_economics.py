"""
Guarantees no plan can cost more in AI than it earns.

The worst case assumes every monthly allowance is used in full, every
session is run to its per-session cap, and every answer is spoken (so it
is also transcribed) — at Gemini's standard post-Jan-2027 pricing. Real
usage is far below this. If someone raises a limit in config.py, this
fails before the change can ship.
"""
import pytest

from app.core.config import settings
from app.services.costs import (
    FALLBACK_PRICING, estimate_cost, pricing_for, worst_case_monthly_cost, worst_case_session_cost,
)
from app.services.usage import SESSION_CAPS, _LIMITS

PADDLE_FEE_PCT, PADDLE_FEE_FIXED = 0.05, 0.50
MAX_SHARE_OF_REVENUE = 0.75  # worst-case AI spend must leave >= 25% for everything else


def net_revenue(price: float) -> float:
    return price * (1 - PADDLE_FEE_PCT) - PADDLE_FEE_FIXED


@pytest.mark.parametrize("plan,price", [
    ("premium", settings.PREMIUM_PRICE_USD),
    ("pro", settings.PRO_PRICE_USD),
])
def test_paid_plan_worst_case_cost_stays_below_revenue(plan, price):
    worst = worst_case_monthly_cost(_LIMITS[plan], SESSION_CAPS[plan])
    share = worst / net_revenue(price)
    assert share <= MAX_SHARE_OF_REVENUE, (
        f"{plan}: worst-case AI cost ${worst:.2f} is {share:.0%} of net revenue "
        f"${net_revenue(price):.2f} (limit {MAX_SHARE_OF_REVENUE:.0%}). Lower its limits or caps."
    )


def test_free_tier_has_the_requested_allowances():
    free = _LIMITS["free"]
    assert (free["resume_analysis"], free["job_match"], free["interview_session"],
            free["speech_practice"]) == (2, 12, 6, 12)


def test_free_tier_worst_case_is_bounded():
    """Free earns nothing, so its exposure must be small and known."""
    assert worst_case_monthly_cost(_LIMITS["free"], SESSION_CAPS["free"]) < 5.0


def test_every_session_is_capped():
    """Without per-session caps a monthly SESSION limit bounds nothing."""
    for plan, caps in SESSION_CAPS.items():
        assert all(v > 0 for v in caps.values()), plan
        assert worst_case_session_cost("interview", caps) < 1.0, f"{plan} interview session uncapped"


def test_paid_tiers_are_strictly_more_generous():
    for feature in _LIMITS["free"]:
        assert _LIMITS["free"][feature] <= _LIMITS["premium"][feature] <= _LIMITS["pro"][feature], feature


def test_learning_plans_are_limited():
    assert all("learning_plan" in _LIMITS[p] for p in _LIMITS)


def test_pricing_uses_longest_prefix():
    """flash-lite must not be priced as full flash."""
    assert pricing_for("gemini-3.5-flash-lite") == (0.30, 2.50)
    assert pricing_for("gemini-3.5-flash") == (1.50, 9.00)


def test_unknown_model_is_never_costed_as_free():
    assert pricing_for("some-future-model") == FALLBACK_PRICING
    assert estimate_cost("some-future-model", 1000, 1000) > 0


def test_cost_estimate_is_not_the_old_underreported_rate():
    """Regression: the old tracker used $0.075/$0.30 per 1M (Gemini 1.5-era),
    under-reporting 3.x Flash spend by ~10-25x."""
    assert estimate_cost("gemini-3.6-flash", 1_000_000, 1_000_000) >= 9.0
