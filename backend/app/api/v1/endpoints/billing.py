import logging
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import AuditLog, Subscription, User
from app.schemas.billing import CheckoutRequest, CheckoutResponse, SubscriptionOut
from app.services.auth.jwt import get_current_user
from app.services.billing.base import get_billing_provider

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    user: Annotated[User, Depends(get_current_user)],
) -> CheckoutResponse:
    provider = get_billing_provider()
    url = await provider.create_checkout(user_id=user.id, email=user.email, plan=payload.plan)
    return CheckoutResponse(checkout_url=url)


@router.get("/subscription", response_model=SubscriptionOut)
async def get_subscription(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionOut:
    sub = (await db.execute(select(Subscription).where(Subscription.user_id == user.id))).scalar_one_or_none()
    if sub is None:
        return SubscriptionOut(plan="free", status="active", billing_provider=None)
    return SubscriptionOut(
        plan=sub.plan, status=sub.status, billing_provider=sub.billing_provider,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def paddle_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    paddle_signature: Optional[str] = Header(default=None, alias="Paddle-Signature"),
) -> dict:
    """Receives Paddle Billing events. Signature is verified against the
    RAW request body (section 29 — untrusted input) before anything in
    the payload is trusted or acted on."""
    raw_body = await request.body()
    provider = get_billing_provider()

    if not provider.verify_webhook_signature(raw_body, paddle_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    payload = await request.json()
    event_type = payload.get("event_type", "")
    data = payload.get("data", {})

    if event_type in ("subscription.created", "subscription.activated", "subscription.updated"):
        await _upsert_subscription(db, provider, data)
    elif event_type == "subscription.canceled":
        await _cancel_subscription(db, data)
    else:
        logger.info("Unhandled Paddle event type: %s", event_type)

    return {"received": True}


async def _upsert_subscription(db: AsyncSession, provider, data: dict) -> None:
    custom_data = data.get("custom_data") or {}
    user_id = custom_data.get("user_id")
    if not user_id:
        logger.warning("Paddle webhook missing custom_data.user_id — cannot associate subscription")
        return

    items = data.get("items", [])
    price_id = items[0]["price"]["id"] if items and items[0].get("price") else None
    plan = provider.plan_for_price_id(price_id) if price_id else custom_data.get("plan", "free")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        logger.warning("Paddle webhook references unknown user_id=%s", user_id)
        return

    sub = (await db.execute(select(Subscription).where(Subscription.user_id == user.id))).scalar_one_or_none()
    period_end_raw = data.get("current_billing_period", {}).get("ends_at")
    period_end = datetime.fromisoformat(period_end_raw.replace("Z", "+00:00")) if period_end_raw else None

    if sub is None:
        sub = Subscription(
            user_id=user.id, plan=plan or "free", status="active", billing_provider="paddle",
            provider_customer_id=data.get("customer_id"), provider_subscription_id=data.get("id"),
            current_period_end=period_end,
        )
        db.add(sub)
    else:
        sub.plan = plan or sub.plan
        sub.status = "active"
        sub.billing_provider = "paddle"
        sub.provider_customer_id = data.get("customer_id") or sub.provider_customer_id
        sub.provider_subscription_id = data.get("id") or sub.provider_subscription_id
        sub.current_period_end = period_end or sub.current_period_end

    db.add(AuditLog(actor_user_id=user.id, action="subscription_updated", target_type="subscription", metadata_json={"plan": plan}))
    await db.commit()


async def _cancel_subscription(db: AsyncSession, data: dict) -> None:
    provider_subscription_id = data.get("id")
    if not provider_subscription_id:
        return
    sub = (await db.execute(
        select(Subscription).where(Subscription.provider_subscription_id == provider_subscription_id)
    )).scalar_one_or_none()
    if sub is None:
        return
    sub.status = "canceled"
    sub.plan = "free"
    db.add(AuditLog(actor_user_id=sub.user_id, action="subscription_canceled", target_type="subscription"))
    await db.commit()
