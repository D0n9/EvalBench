from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, UUIDMixin

class Task(Base, UUIDMixin):
    __tablename__ = "tasks"

    name = Column(String, index=True, nullable=False)
    task_type = Column(String, nullable=False) # "eval" or "perf"
    
    status = Column(String, default="pending") # pending, running, completed, failed, cancelled
    evalscope_job_id = Column(String, nullable=True) # ID returned from EvalScope API
    celery_task_id = Column(String, nullable=True) # Celery task ID for cancellation
    output_dir = Column(String, nullable=True) # Directory in Docker Volume
    
    # Task configuration
    config = Column(JSON, nullable=False) 
    # Example for eval: {"model": "qwen", "datasets": ["gsm8k"], "limit": 10}
    # Example for perf: {"model": "qwen", "parallel": 10, "number": 100}

    # Resource control
    is_public = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False, index=True) # Soft delete flag

    # Relationships
    team_id = Column(String, ForeignKey("teams.id"), nullable=False, index=True)
    team = relationship("Team", back_populates="tasks")

    creator_id = Column(String, ForeignKey("users.username"), nullable=False, index=True)
    creator = relationship("User", back_populates="created_tasks")

    # Results relationship
    results = relationship("Result", back_populates="task", cascade="all, delete-orphan")
