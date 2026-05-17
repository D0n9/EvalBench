from sqlalchemy import Column, String, JSON

from app.models.base import Base


class PlatformSetting(Base):
    """Key-value platform configuration (e.g. LDAP)."""

    __tablename__ = "platform_settings"

    key = Column(String(64), primary_key=True)
    value = Column(JSON, nullable=False, default=dict)
