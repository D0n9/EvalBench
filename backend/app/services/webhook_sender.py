"""Webhook delivery service.

Sends signed HTTP POST requests to all webhooks subscribed to a given event.
Called from Celery tasks (synchronous context) and FastAPI endpoints.

Payload format
--------------
{
  "event": "task.completed",
  "timestamp": "2026-05-17T12:00:00Z",
  "task": {
    "id": "...",
    "name": "...",
    "status": "completed",
    "model": "...",
    "datasets": [...],
    "created_at": "...",
    "output_dir": "..."
  }
}

Signature header
----------------
X-Signature: sha256=<hex>

The HMAC is computed over the raw JSON body with the webhook secret as key.
If no secret is configured the header is omitted.
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 10.0  # seconds per delivery attempt


def _build_payload(event: str, task: Any) -> Dict:
    config = task.config or {}
    return {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "task": {
            "id": task.id,
            "name": task.name,
            "status": task.status,
            "model": config.get("model", ""),
            "datasets": config.get("datasets", []),
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "output_dir": task.output_dir,
        },
    }


def _sign(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _deliver(url: str, payload: Dict, secret: Optional[str]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode()
    headers = {"Content-Type": "application/json", "User-Agent": "LLM-Benchmark-Webhook/1.0"}
    if secret:
        headers["X-Signature"] = _sign(body, secret)
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(url, content=body, headers=headers)
            resp.raise_for_status()
        logger.info("Webhook %s delivered for event=%s status=%s", url, payload["event"], resp.status_code)
    except Exception as exc:
        logger.warning("Webhook delivery failed url=%s event=%s: %s", url, payload["event"], exc)


def fire_event(event: str, task: Any, db: Any) -> None:
    """Fire webhooks for *event* synchronously.  Never raises – failures are logged only."""
    try:
        from app.crud.crud_webhook import get_webhooks_for_event
        webhooks = get_webhooks_for_event(db, event)
        if not webhooks:
            return
        payload = _build_payload(event, task)
        for wh in webhooks:
            _deliver(wh.url, payload, wh.secret)
    except Exception as exc:
        logger.error("fire_event(%s) error: %s", event, exc, exc_info=True)


def fire_test(url: str, secret: Optional[str], event: str) -> Dict:
    """Deliver a synthetic test payload and return {success, status_code, error}."""
    payload = {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "task": {
            "id": "00000000-0000-0000-0000-000000000000",
            "name": "Test Task",
            "status": event.split(".")[-1],
            "model": "test-model",
            "datasets": ["example_dataset"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "output_dir": None,
        },
    }
    body = json.dumps(payload, ensure_ascii=False).encode()
    headers = {"Content-Type": "application/json", "User-Agent": "LLM-Benchmark-Webhook/1.0"}
    if secret:
        headers["X-Signature"] = _sign(body, secret)
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(url, content=body, headers=headers)
        return {"success": resp.is_success, "status_code": resp.status_code, "error": None}
    except Exception as exc:
        return {"success": False, "status_code": None, "error": str(exc)}
