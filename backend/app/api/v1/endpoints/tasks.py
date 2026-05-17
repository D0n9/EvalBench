import json
import os
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.crud import crud_task
from app.models.user import User
from app.schemas.task import Task, TaskCreate, TaskPage, TaskProgressFileResponse
from app.services.evalscope import run_eval_task
from app.core.celery_app import celery_app

router = APIRouter()


def _candidate_progress_paths(task_id: str, output_dir: Optional[str]) -> List[str]:
    """EvalScope writes progress.json under work_dir (outputs/<task_id>/)."""
    seen: set[str] = set()
    ordered: List[str] = []
    primary = os.path.join(settings.EVALSCOPE_OUTPUT_DIR, task_id, "progress.json")
    if primary not in seen:
        seen.add(primary)
        ordered.append(primary)
    if output_dir:
        alt = os.path.join(os.path.normpath(output_dir), "progress.json")
        if alt not in seen:
            seen.add(alt)
            ordered.append(alt)
    return ordered

@router.get("/", response_model=TaskPage)
def read_tasks(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Retrieve tasks with pagination.
    """
    tasks, total = crud_task.get_tasks_for_user(db, current_user, skip, limit)
    return TaskPage(items=tasks, total=total, skip=skip, limit=limit)

@router.post("/", response_model=Task)
def create_task(
    *,
    db: Session = Depends(deps.get_db),
    task_in: TaskCreate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Create new task and trigger EvalScope engine asynchronously via Celery.
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=400,
            detail="You must belong to a team to create a task."
        )
    task = crud_task.create_task(db=db, obj_in=task_in, current_user=current_user)
    
    # Trigger celery task and store the task_id
    celery_task = run_eval_task.delay(task.id)
    task.celery_task_id = celery_task.id
    db.commit()
    
    return task

@router.get("/{task_id}/progress")
def read_task_progress(
    task_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Read EvalScope progress.json from the task work directory (when progress tracker is enabled).
    Returns with no-cache headers so every poll gets fresh data.
    """
    from app.models.task import Task as TaskModel

    task = deps.get_resource_or_404(db, TaskModel, task_id, current_user)
    payload: dict = {"found": False, "progress": None}
    for path in _candidate_progress_paths(task.id, task.output_dir):
        if not os.path.isfile(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                payload = {"found": True, "progress": data}
        except (OSError, json.JSONDecodeError):
            continue
        break
    return JSONResponse(
        content=payload,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@router.get("/{task_id}", response_model=Task)
def read_task(
    task_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get task by ID.
    """
    # Import the Task model here to avoid circular imports if needed, or use string
    from app.models.task import Task as TaskModel
    task = deps.get_resource_or_404(db, TaskModel, task_id, current_user)
    return task

@router.post("/{task_id}/rerun", response_model=Task)
def rerun_task(
    task_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Rerun an existing task by duplicating it.
    """
    from app.models.task import Task as TaskModel
    task = deps.get_resource_or_404(db, TaskModel, task_id, current_user)
    
    if not current_user.team_id:
        raise HTTPException(
            status_code=400,
            detail="You must belong to a team to create a task."
        )
        
    task_in = TaskCreate(
        name=f"{task.name}_copy",
        task_type=task.task_type,
        config=task.config,
        is_public=task.is_public,
        is_readonly=task.is_readonly
    )
    
    new_task = crud_task.create_task(db=db, obj_in=task_in, current_user=current_user)
    
    # Trigger celery task and store the task_id
    celery_task = run_eval_task.delay(new_task.id)
    new_task.celery_task_id = celery_task.id
    db.commit()
    
    return new_task

@router.post("/{task_id}/stop", response_model=Task)
def stop_task(
    task_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Stop a running Celery task.
    """
    from app.models.task import Task as TaskModel
    task = deps.get_resource_or_404(db, TaskModel, task_id, current_user)
    deps.validate_resource_modification(task, current_user)
    
    if task.status != "running":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot stop task with status '{task.status}'. Only running tasks can be stopped."
        )
    
    if not task.celery_task_id:
        raise HTTPException(
            status_code=400,
            detail="此任务没有记录 Celery 任务 ID（可能是旧任务）。请尝试重启 Celery Worker 来终止此任务，或重新创建任务。新创建的任务将支持即时停止功能。"
        )
    
    try:
        celery_app.control.revoke(task.celery_task_id, terminate=True)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to revoke Celery task: {str(e)}"
        )
    
    task.status = "cancelled"
    db.commit()
    
    from app.services.webhook_sender import fire_event
    fire_event("task.cancelled", task, db)
    
    return task

@router.delete("/{task_id}", response_model=Task)
def delete_task(
    task_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Delete a task.
    """
    from app.models.task import Task as TaskModel
    task = deps.get_resource_or_404(db, TaskModel, task_id, current_user)
    deps.validate_resource_modification(task, current_user)
    
    task = crud_task.delete_task(db=db, task_id=task_id)
    return task
