from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate

def get_task(db: Session, task_id: str) -> Optional[Task]:
    return db.query(Task).filter(
        Task.id == task_id,
        Task.is_deleted == False
    ).first()

def get_tasks_for_user(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> Tuple[List[Task], int]:
    base_query = db.query(Task).filter(Task.is_deleted == False)
    
    if not current_user.is_superuser:
        base_query = base_query.filter(Task.team_id == current_user.team_id)
    
    total = base_query.count()
    items = base_query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    
    return items, total

def create_task(db: Session, obj_in: TaskCreate, current_user: User) -> Task:
    db_obj = Task(
        name=obj_in.name,
        task_type=obj_in.task_type,
        config=obj_in.config,
        is_public=False,
        is_readonly=obj_in.is_readonly,
        creator_id=current_user.id,
        team_id=current_user.team_id,
        status="pending"
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_task_status(db: Session, task_id: str, status: str, output_dir: Optional[str] = None) -> Optional[Task]:
    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        task.status = status
        if output_dir:
            task.output_dir = output_dir
        db.commit()
        db.refresh(task)
    return task

def delete_task(db: Session, task_id: str) -> Optional[Task]:
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.is_deleted == False
    ).first()
    if task:
        task.is_deleted = True
        db.commit()
        db.refresh(task)
    return task
