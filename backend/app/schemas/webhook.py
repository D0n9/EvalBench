from typing import List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl

WebhookEvent = Literal["task.started", "task.completed", "task.failed", "task.cancelled"]

ALL_EVENTS: List[WebhookEvent] = ["task.started", "task.completed", "task.failed", "task.cancelled"]


class WebhookBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    url: str = Field(..., min_length=1, max_length=1024)
    events: List[WebhookEvent] = Field(default_factory=lambda: list(ALL_EVENTS))
    enabled: bool = True


class WebhookCreate(WebhookBase):
    secret: Optional[str] = None


class WebhookUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    url: Optional[str] = Field(None, min_length=1, max_length=1024)
    events: Optional[List[WebhookEvent]] = None
    enabled: Optional[bool] = None
    secret: Optional[str] = None


class WebhookResponse(WebhookBase):
    id: str
    secret_configured: bool = False
    created_by: Optional[str] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


class WebhookTestRequest(BaseModel):
    event: WebhookEvent = "task.completed"
