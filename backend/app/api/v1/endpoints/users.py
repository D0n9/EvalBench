from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_user
from app.schemas.user import User, UserCreate
from app.models.user import User as UserModel

router = APIRouter()

@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = crud_user.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = crud_user.create(db, obj_in=user_in)
    return user

@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.require_team_lead),
) -> Any:
    """
    Retrieve users. Allowed for Team Leads and above to add members.
    """
    users = crud_user.get_multi(db, skip=skip, limit=limit)
    for user in users:
        if user.team:
            user.team_name = user.team.name
    return users

@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    if current_user.team:
        current_user.team_name = current_user.team.name
    return current_user
