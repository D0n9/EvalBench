from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.webhook import Webhook
from app.schemas.webhook import WebhookCreate, WebhookUpdate, WebhookResponse


def _to_response(wh: Webhook) -> WebhookResponse:
    return WebhookResponse(
        id=wh.id,
        name=wh.name,
        url=wh.url,
        events=wh.events or [],
        enabled=bool(wh.enabled),
        secret_configured=bool(wh.secret),
        created_by=wh.created_by,
        created_at=wh.created_at.isoformat() if wh.created_at else None,
    )


def list_webhooks(db: Session) -> List[WebhookResponse]:
    rows = db.query(Webhook).order_by(Webhook.created_at.asc()).all()
    return [_to_response(r) for r in rows]


def get_webhook(db: Session, webhook_id: str) -> Optional[Webhook]:
    return db.query(Webhook).filter(Webhook.id == webhook_id).first()


def create_webhook(db: Session, obj_in: WebhookCreate, created_by: str) -> WebhookResponse:
    wh = Webhook(
        name=obj_in.name,
        url=obj_in.url,
        events=list(obj_in.events),
        enabled=obj_in.enabled,
        secret=obj_in.secret or None,
        created_by=created_by,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return _to_response(wh)


def update_webhook(db: Session, webhook_id: str, obj_in: WebhookUpdate) -> Optional[WebhookResponse]:
    wh = get_webhook(db, webhook_id)
    if not wh:
        return None
    data = obj_in.model_dump(exclude_unset=True)
    secret = data.pop("secret", None)
    if secret is not None:
        wh.secret = secret or None
    for key, val in data.items():
        setattr(wh, key, val)
    db.commit()
    db.refresh(wh)
    return _to_response(wh)


def delete_webhook(db: Session, webhook_id: str) -> bool:
    wh = get_webhook(db, webhook_id)
    if not wh:
        return False
    db.delete(wh)
    db.commit()
    return True


def get_webhooks_for_event(db: Session, event: str) -> List[Webhook]:
    """Return all enabled webhooks subscribed to *event*."""
    rows = db.query(Webhook).filter(Webhook.enabled == True).all()  # noqa: E712
    return [wh for wh in rows if event in (wh.events or [])]
