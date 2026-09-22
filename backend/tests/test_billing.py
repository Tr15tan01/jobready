import hashlib
import hmac
import time

from app.services.billing.base import PaddleBillingProvider


def _sign(secret: str, ts: str, body: bytes) -> str:
    signed_payload = f"{ts}:{body.decode('utf-8')}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()


def test_valid_paddle_signature_accepted():
    provider = PaddleBillingProvider()
    provider.webhook_secret = "test-secret"
    body = b'{"event_type": "subscription.created"}'
    ts = str(int(time.time()))
    h1 = _sign("test-secret", ts, body)
    header = f"ts={ts};h1={h1}"
    assert provider.verify_webhook_signature(body, header) is True


def test_tampered_body_rejected():
    provider = PaddleBillingProvider()
    provider.webhook_secret = "test-secret"
    ts = str(int(time.time()))
    h1 = _sign("test-secret", ts, b'{"event_type": "subscription.created"}')
    header = f"ts={ts};h1={h1}"
    tampered_body = b'{"event_type": "subscription.canceled"}'
    assert provider.verify_webhook_signature(tampered_body, header) is False


def test_wrong_secret_rejected():
    provider = PaddleBillingProvider()
    provider.webhook_secret = "real-secret"
    body = b'{"event_type": "subscription.created"}'
    ts = str(int(time.time()))
    h1 = _sign("wrong-secret", ts, body)
    header = f"ts={ts};h1={h1}"
    assert provider.verify_webhook_signature(body, header) is False


def test_missing_header_rejected():
    provider = PaddleBillingProvider()
    provider.webhook_secret = "test-secret"
    assert provider.verify_webhook_signature(b"{}", None) is False


def test_malformed_header_rejected():
    provider = PaddleBillingProvider()
    provider.webhook_secret = "test-secret"
    assert provider.verify_webhook_signature(b"{}", "not-a-valid-header") is False


def test_no_secret_configured_rejects_everything():
    provider = PaddleBillingProvider()
    provider.webhook_secret = ""
    ts = str(int(time.time()))
    header = f"ts={ts};h1=whatever"
    assert provider.verify_webhook_signature(b"{}", header) is False
