"""
Billing sits behind a provider interface, same pattern as AIService and
SpeechProvider — the rest of the app only ever calls `BillingProvider`
methods, never Paddle's SDK/HTTP API directly (section 24: "keep billing
provider replaceable").

Uses Paddle Billing (the current Paddle platform, API v2 — not
"Paddle Classic"). Checkout is hosted: we create a transaction server-side
and hand the candidate a checkout URL to redirect to, so no Paddle.js
integration is required on the frontend for a first pass.
"""
import hashlib
import hmac
import time
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

PADDLE_API_BASES = {
    "sandbox": "https://sandbox-api.paddle.com",
    "production": "https://api.paddle.com",
}

PLAN_TO_PRICE_ID = {
    "premium": settings.PADDLE_PRICE_ID_PREMIUM,
    "pro": settings.PADDLE_PRICE_ID_PRO,
}
PRICE_ID_TO_PLAN = {v: k for k, v in PLAN_TO_PRICE_ID.items() if v}


class BillingProvider(ABC):
    @abstractmethod
    async def create_checkout(self, *, user_id: UUID, email: str, plan: str) -> str:
        """Returns a checkout URL the candidate is redirected to."""
        ...

    @abstractmethod
    def verify_webhook_signature(self, raw_body: bytes, signature_header: Optional[str]) -> bool: ...

    @abstractmethod
    def plan_for_price_id(self, price_id: str) -> Optional[str]: ...


class PaddleBillingProvider(BillingProvider):
    def __init__(self) -> None:
        self.base_url = PADDLE_API_BASES.get(settings.PADDLE_ENVIRONMENT, PADDLE_API_BASES["sandbox"])
        self.api_key = settings.PADDLE_API_KEY
        self.webhook_secret = settings.PADDLE_WEBHOOK_SECRET

    async def create_checkout(self, *, user_id: UUID, email: str, plan: str) -> str:
        price_id = PLAN_TO_PRICE_ID.get(plan)
        if not price_id:
            raise ValueError(f"No Paddle price configured for plan '{plan}'")

        async with httpx.AsyncClient(base_url=self.base_url, timeout=15) as client:
            response = await client.post(
                "/transactions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "items": [{"price_id": price_id, "quantity": 1}],
                    "customer": {"email": email},
                    # Read back in the webhook to associate the Paddle
                    # subscription with our own user id.
                    "custom_data": {"user_id": str(user_id), "plan": plan},
                },
            )
            response.raise_for_status()
            data = response.json()["data"]
            return data["checkout"]["url"]

    def verify_webhook_signature(self, raw_body: bytes, signature_header: Optional[str]) -> bool:
        """Paddle Billing signs webhooks as `Paddle-Signature: ts=<unix>;h1=<hmac>`,
        where h1 = HMAC-SHA256(webhook_secret, f"{ts}:{raw_body}")."""
        if not signature_header or not self.webhook_secret:
            return False
        parts = dict(p.split("=", 1) for p in signature_header.split(";") if "=" in p)
        ts, h1 = parts.get("ts"), parts.get("h1")
        if not ts or not h1:
            return False

        signed_payload = f"{ts}:{raw_body.decode('utf-8')}".encode("utf-8")
        expected = hmac.new(self.webhook_secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, h1)

    def plan_for_price_id(self, price_id: str) -> Optional[str]:
        return PRICE_ID_TO_PLAN.get(price_id)


class MockBillingProvider(BillingProvider):
    """Used by the test suite — no real Paddle API calls."""

    async def create_checkout(self, *, user_id: UUID, email: str, plan: str) -> str:
        return f"https://sandbox-checkout.paddle.com/mock/{plan}"

    def verify_webhook_signature(self, raw_body: bytes, signature_header: Optional[str]) -> bool:
        return signature_header == "test-valid-signature"

    def plan_for_price_id(self, price_id: str) -> Optional[str]:
        return {"price_premium_mock": "premium", "price_pro_mock": "pro"}.get(price_id)


def get_billing_provider() -> BillingProvider:
    """Same fail-fast contract as get_ai_service(): an unconfigured
    provider returns a clear 503 rather than blowing up as an unhandled
    500 (which also loses CORS headers, so the browser reports a
    confusing CORS error instead of the real problem)."""
    if settings.ENVIRONMENT == "test":
        return MockBillingProvider()

    if settings.BILLING_PROVIDER != "paddle":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unknown BILLING_PROVIDER '{settings.BILLING_PROVIDER}'. Use 'paddle'.",
        )

    missing = [
        name for name, value in (
            ("PADDLE_API_KEY", settings.PADDLE_API_KEY),
            ("PADDLE_PRICE_ID_PREMIUM", settings.PADDLE_PRICE_ID_PREMIUM),
            ("PADDLE_PRICE_ID_PRO", settings.PADDLE_PRICE_ID_PRO),
        ) if not value
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Billing is not configured on this server, so upgrades are "
                f"unavailable. Missing: {', '.join(missing)}. See the Paddle "
                "setup notes in backend/README.md."
            ),
        )

    return PaddleBillingProvider()
