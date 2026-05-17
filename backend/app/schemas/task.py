from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class TaskBase(BaseModel):
    name: str = Field(..., example="Qwen GSM8K Eval")
    task_type: str = Field(..., example="eval")
    config: Dict[str, Any] = Field(..., example={"model": "qwen-plus", "datasets": ["gsm8k"], "limit": 10})
    is_readonly: bool = False

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    is_readonly: Optional[bool] = None

class TaskInDBBase(TaskBase):
    id: str
    status: str
    evalscope_job_id: Optional[str] = None
    celery_task_id: Optional[str] = None
    output_dir: Optional[str] = None
    error_message: Optional[str] = None
    team_id: str
    creator_id: str
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Task(TaskInDBBase):
    pass

class TaskPage(BaseModel):
    items: List[Task]
    total: int
    skip: int
    limit: int


class TaskProgressFileResponse(BaseModel):
    """EvalScope progress.json payload (shape may vary by version)."""

    found: bool
    progress: Optional[Dict[str, Any]] = None
