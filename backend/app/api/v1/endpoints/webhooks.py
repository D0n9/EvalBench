from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_webhook
from app.models.user import User
from app.schemas.webhook import WebhookCreate, WebhookResponse, WebhookTestRequest, WebhookUpdate

router = APIRouter()


def _require_superuser(current_user: User = Depends(deps.get_current_active_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser access required")
    return current_user


@router.get("/", response_model=List[WebhookResponse])
def list_webhooks(
    db: Session = Depends(deps.get_db),
    _: User = Depends(_require_superuser),
) -> Any:
    return crud_webhook.list_webhooks(db)


@router.post("/", response_model=WebhookResponse, status_code=201)
def create_webhook(
    obj_in: WebhookCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_superuser),
) -> Any:
    return crud_webhook.create_webhook(db, obj_in, created_by=current_user.username)


@router.put("/{webhook_id}", response_model=WebhookResponse)
def update_webhook(
    webhook_id: str,
    obj_in: WebhookUpdate,
    db: Session = Depends(deps.get_db),
    _: User = Depends(_require_superuser),
) -> Any:
    result = crud_webhook.update_webhook(db, webhook_id, obj_in)
    if not result:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return result


@router.delete("/{webhook_id}", status_code=204)
def delete_webhook(
    webhook_id: str,
    db: Session = Depends(deps.get_db),
    _: User = Depends(_require_superuser),
) -> None:
    ok = crud_webhook.delete_webhook(db, webhook_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Webhook not found")


@router.post("/{webhook_id}/test")
def test_webhook(
    webhook_id: str,
    body: WebhookTestRequest,
    db: Session = Depends(deps.get_db),
    _: User = Depends(_require_superuser),
) -> Any:
    wh = crud_webhook.get_webhook(db, webhook_id)
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    from app.services.webhook_sender import fire_test
    return fire_test(wh.url, wh.secret, body.event)
