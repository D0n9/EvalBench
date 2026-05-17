from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_user, crud_team, crud_platform_setting
from app.schemas.user import User, UserUpdate
from app.schemas.team import Team, TeamCreate, TeamUpdate, TeamMemberUpdate
from app.schemas.ldap_settings import LdapSettingsResponse, LdapSettingsUpdate
from app.schemas.oauth_settings import OAuthOidcSettingsResponse, OAuthOidcSettingsUpdate
from app.models.user import User as UserModel
from app.core.ldap_auth import clear_ldap_auth_cache

router = APIRouter()


@router.get("/settings/ldap", response_model=LdapSettingsResponse)
def read_ldap_settings(
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """Get LDAP configuration (password is never returned)."""
    return crud_platform_setting.get_ldap_settings(db)


@router.put("/settings/ldap", response_model=LdapSettingsResponse)
def update_ldap_settings(
    *,
    db: Session = Depends(deps.get_db),
    settings_in: LdapSettingsUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """Update LDAP configuration stored in the database."""
    if settings_in.enabled and (not settings_in.server_uri.strip() or not settings_in.user_search_base.strip()):
        raise HTTPException(
            status_code=400,
            detail="LDAP server URI and user search base are required when LDAP is enabled.",
        )
    result = crud_platform_setting.update_ldap_settings(db, settings_in)
    clear_ldap_auth_cache()
    return result


@router.get("/settings/oauth-oidc", response_model=OAuthOidcSettingsResponse)
def read_oauth_oidc_settings(
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """Get OAuth2/OIDC configuration (client secret is never returned)."""
    return crud_platform_setting.get_oauth_oidc_settings(db)


@router.put("/settings/oauth-oidc", response_model=OAuthOidcSettingsResponse)
def update_oauth_oidc_settings(
    *,
    db: Session = Depends(deps.get_db),
    settings_in: OAuthOidcSettingsUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """Update OAuth2/OIDC configuration stored in the database."""
    if settings_in.enabled:
        required = {
            "client_id": settings_in.client_id,
            "authorization_endpoint": settings_in.authorization_endpoint,
            "token_endpoint": settings_in.token_endpoint,
        }
        missing = [name for name, value in required.items() if not value.strip()]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required OAuth2/OIDC settings: {', '.join(missing)}",
            )
    return crud_platform_setting.update_oauth_oidc_settings(db, settings_in)


# User Management
@router.get("/users", response_model=List[User])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    users = crud_user.get_multi(db, skip=skip, limit=limit)
    for user in users:
        if user.team:
            user.team_name = user.team.name
    return users

@router.put("/users/{username}", response_model=User)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    username: str,
    user_in: UserUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user.
    """
    user = crud_user.get_by_username(db, username=username)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user does not exist in the system",
        )
    user = crud_user.update(db, db_obj=user, obj_in=user_in)
    return user

# Team Management
@router.get("/teams", response_model=List[Team])
def read_teams(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve teams.
    """
    teams = crud_team.get_multi(db, skip=skip, limit=limit)
    for team in teams:
        team.member_count = len(team.users)
    return teams

@router.post("/teams", response_model=Team)
def create_team(
    *,
    db: Session = Depends(deps.get_db),
    team_in: TeamCreate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new team.
    """
    team = crud_team.get_team_by_name(db, name=team_in.name)
    if team:
        raise HTTPException(
            status_code=400,
            detail="The team with this name already exists in the system.",
        )
    team = crud_team.create(db, obj_in=team_in)
    return team

@router.put("/teams/{team_id}", response_model=Team)
def update_team(
    *,
    db: Session = Depends(deps.get_db),
    team_id: str,
    team_in: TeamUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a team.
    """
    team = crud_team.get_team(db, team_id=team_id)
    if not team:
        raise HTTPException(
            status_code=404,
            detail="The team with this id does not exist in the system",
        )
    team = crud_team.update(db, db_obj=team, obj_in=team_in)
    return team

@router.delete("/teams/{team_id}", response_model=Team)
def delete_team(
    *,
    db: Session = Depends(deps.get_db),
    team_id: str,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a team.
    """
    team = crud_team.get_team(db, team_id=team_id)
    if not team:
        raise HTTPException(
            status_code=404,
            detail="The team with this id does not exist in the system",
        )
    # Check if team has users
    if team.users:
         raise HTTPException(
            status_code=400,
            detail="Cannot delete team with existing members. Please move or remove members first.",
        )
    team = crud_team.remove(db, team_id=team_id)
    return team

@router.get("/teams/{team_id}/members", response_model=List[User])
def read_team_members(
    *,
    db: Session = Depends(deps.get_db),
    team_id: str,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve team members.
    """
    team = crud_team.get_team(db, team_id=team_id)
    if not team:
        raise HTTPException(
            status_code=404,
            detail="The team with this id does not exist in the system",
        )
    return team.users

@router.post("/teams/{team_id}/members", response_model=List[User])
def add_team_members(
    *,
    db: Session = Depends(deps.get_db),
    team_id: str,
    member_data: TeamMemberUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Add members to a team.
    """
    team = crud_team.get_team(db, team_id=team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    for username in member_data.usernames:
        user = crud_user.get_by_username(db, username=username)
        if user:
            user.team_id = team_id
            if user.role == -1 or user.role is None:
                user.role = 2  # Set to MEMBER
            db.add(user)
    
    db.commit()
    return team.users

@router.delete("/teams/{team_id}/members", response_model=List[User])
def remove_team_members(
    *,
    db: Session = Depends(deps.get_db),
    team_id: str,
    member_data: TeamMemberUpdate,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Remove members from a team.
    """
    team = crud_team.get_team(db, team_id=team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    for username in member_data.usernames:
        user = crud_user.get_by_username(db, username=username)
        if user and user.team_id == team_id:
            user.team_id = None
            user.role = -1  # Set to NONE
            db.add(user)
    
    db.commit()
    return team.users
