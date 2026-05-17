from sqlalchemy import Column, String, Boolean, JSON, ForeignKey
from app.models.base import Base, UUIDMixin


class Webhook(Base, UUIDMixin):
    __tablename__ = "webhooks"

    name = Column(String(128), nullable=False)
    url = Column(String(1024), nullable=False)
    # List of event strings: "task.started" | "task.completed" | "task.failed" | "task.cancelled"
    events = Column(JSON, nullable=False, default=list)
    # HMAC-SHA256 signing secret – stored in plaintext (admin-only table)
    secret = Column(String(256), nullable=True)
    enabled = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(64), ForeignKey("users.username"), nullable=True)
