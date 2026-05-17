from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DashboardStats(BaseModel):
    total_models: int
    total_datasets: int
    running_tasks: int
    total_evaluations: int

class RecentActivity(BaseModel):
    task_id: str
    task_name: str
    model_name: str
    dataset_name: Optional[str] = None
    score: Optional[float] = None
    status: str
    created_at: datetime

class ModelRanking(BaseModel):
    model_name: str
    avg_score: float
    eval_count: int

class DatasetUsage(BaseModel):
    dataset_name: str
    display_name: Optional[str] = None
    eval_count: int
    avg_score: Optional[float] = None

class PassRateStats(BaseModel):
    overall_pass_rate: float
    total_samples: int
    passed_samples: int
    failed_samples: int

class DashboardData(BaseModel):
    stats: DashboardStats
    recent_activity: List[RecentActivity]
    model_ranking: List[ModelRanking]
    dataset_usage: List[DatasetUsage]
    pass_rate: PassRateStats
