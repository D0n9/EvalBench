from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends
from importlib.metadata import PackageNotFoundError, version

from app import models
from app.api import deps
from app.core.config import settings
from app.schemas.system import EvalScopeMeta

router = APIRouter()


def _evalscope_version() -> str:
    try:
        return version("evalscope")
    except PackageNotFoundError:
        return "unknown"


def _engine_updated_at() -> Optional[str]:
    env = (settings.EVALSCOPE_ENGINE_UPDATED_AT or "").strip()
    if env:
        return env
    for path in (
        Path("/app/evalscope_engine_updated_at"),
        Path(__file__).resolve().parents[4] / "evalscope_engine_updated_at",
    ):
        try:
            if path.is_file():
                text = path.read_text(encoding="utf-8").strip()
                return text or None
        except OSError:
            continue
    return None


@router.get("/evalscope", response_model=EvalScopeMeta)
def read_evalscope_meta(
    _current_user: models.User = Depends(deps.get_current_active_user),
) -> EvalScopeMeta:
    """Installed EvalScope version and last engine image build / update time."""
    return EvalScopeMeta(
        evalscope_version=_evalscope_version(),
        engine_updated_at=_engine_updated_at(),
    )
