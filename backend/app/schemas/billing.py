from typing import Literal

from pydantic import BaseModel

PlanName = Literal["premium", "pro"]


class CheckoutRequest(BaseModel):
    plan: PlanName


class CheckoutResponse(BaseModel):
    checkout_url: str


class SubscriptionOut(BaseModel):
    plan: str
    status: str
    billing_provider: str | None
    current_period_end: str | None = None
