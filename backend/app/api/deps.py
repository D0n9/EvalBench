from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import settings
from app.core import security
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.token import TokenPayload
from app.schemas.user import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/access-token")

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get current authenticated user.
    Requires user to be active and have a role assigned.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = db.query(User).filter(User.id == token_data.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Base dependency for any authenticated user with a role assigned"""
    if current_user.is_superuser:
        return current_user
    if current_user.role is None or current_user.role == UserRole.NONE:
        raise HTTPException(
            status_code=403,
            detail="No role assigned. Please contact administrator to get a role."
        )
    return current_user

def require_role(min_role: int):
    """
    Factory function to create a dependency that requires minimum role level.
    
    Role hierarchy:
    - SUPER_ADMIN (999): Full system access (via is_superuser flag)
    - TEAM_LEAD (1): Team management
    - MEMBER (2): Basic access
    - NONE (-1): No role assigned, cannot access protected endpoints
    """
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        if current_user.role is None or current_user.role == UserRole.NONE:
            raise HTTPException(
                status_code=403, 
                detail="No role assigned. Please contact administrator to get a role."
            )
        if current_user.role > min_role:
            raise HTTPException(
                status_code=403, 
                detail="Insufficient privileges for this operation"
            )
        return current_user
    return dependency

def require_team_membership():
    """Dependency that requires user to be a member of a team with a role assigned"""
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        if not current_user.is_team_member():
            raise HTTPException(
                status_code=403,
                detail="You must be assigned to a team with a role to access this resource"
            )
        return current_user
    return dependency

# Convenience dependencies for common role requirements
require_team_lead = require_role(UserRole.TEAM_LEAD)
require_member = require_role(UserRole.MEMBER)

# RBAC Resource Access Validator Helper
def get_resource_or_404(db: Session, model: any, resource_id: str, current_user: User):
    """
    Fetch a resource applying Team-based RBAC:
    - User can access if:
        1. They are superuser
        2. The resource is public (is_public=True) AND it's NOT a Task
        3. The resource belongs to their team (team_id == current_user.team_id)
    """
    from app.models.task import Task
    query = db.query(model).filter(model.id == resource_id)
    if hasattr(model, 'is_deleted'):
        query = query.filter(model.is_deleted == False)
    
    resource = query.first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    if current_user.is_superuser:
        return resource
        
    # Strictly team-private for Tasks
    if isinstance(resource, Task):
        if resource.team_id == current_user.team_id:
            return resource
        raise HTTPException(status_code=403, detail="Not enough permissions to access this task")

    if getattr(resource, 'is_public', False):
        return resource
        
    if getattr(resource, 'team_id', None) == current_user.team_id:
        return resource
        
    raise HTTPException(status_code=403, detail="Not enough permissions to access this resource")

def validate_resource_modification(resource: any, current_user: User):
    """
    Validate if user can modify the resource:
    - User can modify if:
        1. They are superuser or platform admin
        2. They are the creator
        3. It belongs to their team AND is NOT readonly
    """
    if current_user.is_superuser:
        return True
        
    if getattr(resource, 'creator_id', None) == current_user.id:
        return True
        
    if getattr(resource, 'team_id', None) == current_user.team_id and not getattr(resource, 'is_readonly', True):
        return True
        
    raise HTTPException(status_code=403, detail="Not enough permissions to modify this resource")
