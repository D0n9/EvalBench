from typing import Optional

from pydantic import BaseModel


class EvalScopeMeta(BaseModel):
    evalscope_version: str
    engine_updated_at: Optional[str] = None
