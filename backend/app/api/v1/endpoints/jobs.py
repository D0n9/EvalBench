from typing import Any, Optional
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.services.job_manager import get as get_job

router = APIRouter()


@router.get("/{job_id}")
def read_job(job_id: str) -> Any:
    """Poll the status / result of an async job."""
    entry = get_job(job_id)
    if entry is None:
        return JSONResponse(
            status_code=404,
            content={"status": "not_found", "result": None, "error": "Job not found or expired"},
            headers={"Cache-Control": "no-store"},
        )
    payload: dict[str, Any] = {
        "status": entry.status.value,
        "result": entry.result,
        "error": entry.error,
    }
    return JSONResponse(
        content=payload,
        headers={"Cache-Control": "no-store"},
    )
