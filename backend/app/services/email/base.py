"""
Email delivery behind a provider interface (same pattern as AIService,
SpeechProvider, BillingProvider). The default "log" provider just logs
the content server-side — enough to develop and test the full
registration/verification/password-reset flow without SMTP/API keys.
Swap in a real provider (SES, Postmark, Resend, ...) by implementing
this interface and switching EMAIL_PROVIDER.
"""
import logging
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger("jobready.email")


class EmailProvider(ABC):
    @abstractmethod
    async def send(self, *, to: str, subject: str, body: str) -> None: ...


class LogEmailProvider(EmailProvider):
    async def send(self, *, to: str, subject: str, body: str) -> None:
        logger.info("EMAIL to=%s subject=%r\n%s", to, subject, body)


def get_email_provider() -> EmailProvider:
    if settings.EMAIL_PROVIDER == "log":
        return LogEmailProvider()
    raise ValueError(f"Unknown EMAIL_PROVIDER: {settings.EMAIL_PROVIDER}")


async def send_verification_email(email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    await get_email_provider().send(
        to=email, subject="Verify your JobReady email",
        body=f"Confirm your email address: {link}\n\nThis link expires in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.",
    )


async def send_password_reset_email(email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    await get_email_provider().send(
        to=email, subject="Reset your JobReady password",
        body=f"Reset your password: {link}\n\nThis link expires in {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes. If you didn't request this, ignore this email.",
    )
