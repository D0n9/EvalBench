from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_team, crud_user
from app.schemas.user import User
from app.schemas.team import Team, TeamMemberUpdate
from app.models.user import User as UserModel

router = APIRouter()

@router.get("/me", response_model=Team)
def read_my_team(
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.require_team_lead),
) -> Any:
    """
    Retrieve current user's team.
    """
    if not current_user.team_id:
        raise HTTPException(status_code=404, detail="User has no team")
    team = crud_team.get_team(db, team_id=current_user.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team.member_count = len(team.users)
    return team

@router.get("/me/members", response_model=List[User])
def read_my_team_members(
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.require_team_lead),
) -> Any:
    """
    Retrieve current user's team members.
    """
    if not current_user.team_id:
        raise HTTPException(status_code=404, detail="User has no team")
    team = crud_team.get_team(db, team_id=current_user.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team.users

@router.post("/me/members", response_model=List[User])
def add_my_team_members(
    *,
    db: Session = Depends(deps.get_db),
    member_data: TeamMemberUpdate,
    current_user: UserModel = Depends(deps.require_team_lead),
) -> Any:
    """
    Add members to current user's team.
    """
    if not current_user.team_id:
        raise HTTPException(status_code=404, detail="User has no team")
    team = crud_team.get_team(db, team_id=current_user.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    for username in member_data.usernames:
        user = crud_user.get_by_username(db, username=username)
        if user:
            user.team_id = current_user.team_id
            if user.role == -1 or user.role is None:
                user.role = 2  # Set to MEMBER
            db.add(user)
    
    db.commit()
    return team.users

@router.delete("/me/members", response_model=List[User])
def remove_my_team_members(
    *,
    db: Session = Depends(deps.get_db),
    member_data: TeamMemberUpdate,
    current_user: UserModel = Depends(deps.require_team_lead),
) -> Any:
    """
    Remove members from current user's team.
    """
    if not current_user.team_id:
        raise HTTPException(status_code=404, detail="User has no team")
    team = crud_team.get_team(db, team_id=current_user.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    for username in member_data.usernames:
        if username == current_user.username:
            raise HTTPException(status_code=400, detail="Cannot remove yourself from the team")
        user = crud_user.get_by_username(db, username=username)
        if user and user.team_id == current_user.team_id:
            user.team_id = None
            user.role = -1  # Set to NONE
            db.add(user)
    
    db.commit()
    return team.users
