import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, func, String
from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    __name__: str
    
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UUIDMixin:
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
