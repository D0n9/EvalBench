from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

class SampleResultBase(BaseModel):
    result_id: str
    question_id: Optional[str] = None
    category: Optional[str] = None
    dimension: Optional[str] = None
    severity: Optional[str] = None
    prompt: str
    response: str
    reference: Optional[str] = None
    is_passed: Optional[str] = None
    score: Optional[float] = None
    raw_data: Optional[Dict[str, Any]] = None
    retry_count: int = 0

class SampleResultCreate(SampleResultBase):
    pass

class SampleResult(SampleResultBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ResultBase(BaseModel):
    task_id: str
    model_name: str
    dataset_name: Optional[str] = None
    score: Optional[float] = None
    metrics: Optional[Any] = None
    config_content: Optional[str] = None
    log_content: Optional[str] = None
    report_file: Optional[str] = None
    html_report_file: Optional[str] = None

class ResultCreate(ResultBase):
    pass

class ResultInDBBase(ResultBase):
    id: str

    class Config:
        from_attributes = True

class Result(ResultInDBBase):
    pass

class ResultDetail(Result):
    samples: List[SampleResult] = []


class SampleResultPage(BaseModel):
    items: List[SampleResult]
    total: int
    skip: int
    limit: int

