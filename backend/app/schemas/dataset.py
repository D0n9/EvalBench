from typing import Optional, List
from pydantic import BaseModel


class DatasetBase(BaseModel):
    name: str
    standard_name: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    subsets: Optional[List[str]] = None
    link: Optional[str] = None
    is_builtin: bool = False
    is_public: bool = True
    is_readonly: bool = False


class DatasetCreate(DatasetBase):
    file_path: Optional[str] = None


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    standard_name: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    subsets: Optional[List[str]] = None
    link: Optional[str] = None
    is_public: Optional[bool] = None
    is_readonly: Optional[bool] = None


class DatasetInDBBase(DatasetBase):
    id: str
    file_path: Optional[str] = None
    team_id: Optional[str] = None
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    team_name: Optional[str] = None

    class Config:
        from_attributes = True


class Dataset(DatasetInDBBase):
    pass


class DatasetGrouped(BaseModel):
    category: str
    datasets: List[Dataset]
    count: int
