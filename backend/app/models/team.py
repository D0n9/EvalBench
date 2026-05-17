from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from app.models.base import Base, UUIDMixin

class Team(Base, UUIDMixin):
    __tablename__ = "teams"

    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    users = relationship("User", back_populates="team")
    model_configs = relationship("ModelConfig", back_populates="team")
    datasets = relationship("Dataset", back_populates="team")
    tasks = relationship("Task", back_populates="team")
