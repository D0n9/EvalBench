from datetime import datetime
from typing import Optional, Any
from enum import IntEnum
from pydantic import BaseModel, EmailStr, computed_field

class UserRole(IntEnum):
    """User role hierarchy (higher value = more privileges)"""
    NONE = -1
    MEMBER = 2
    TEAM_LEAD = 1
    SUPER_ADMIN = 999  # Special flag, not stored in role field

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_superuser: bool = False

class UserCreate(UserBase):
    password: Optional[str] = None
    team_id: Optional[str] = None
    role: Optional[int] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_superuser: Optional[bool] = None
    team_id: Optional[str] = None
    nickname: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[int] = None
    is_active: Optional[bool] = None

class UserInDBBase(UserBase):
    id: str
    team_id: Optional[str] = None
    is_active: bool = True
    is_ldap_user: bool = False
    nickname: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[int] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    team_name: Optional[str] = None

    @property
    def effective_role(self) -> int:
        """Get effective role value, considering superuser status"""
        if self.is_superuser:
            return UserRole.SUPER_ADMIN
        if self.role is None:
            return UserRole.NONE
        return self.role

    def has_role(self, required_role: int) -> bool:
        """Check if user has at least the required role level"""
        return self.effective_role <= required_role

    def is_platform_admin(self) -> bool:
        """Check if user is superuser"""
        return self.is_superuser

    def is_team_member(self) -> bool:
        """Check if user is assigned to a team with a role"""
        return self.team_id is not None and self.role != UserRole.NONE

    @computed_field
    @property
    def role_display(self) -> str:
        """Get human-readable role name for API response"""
        if self.is_superuser:
            return "超级管理员"
        role_map = {
            UserRole.TEAM_LEAD: "团队管理员",
            UserRole.MEMBER: "成员",
            UserRole.NONE: "暂无",
        }
        return role_map.get(self.effective_role, "未知")
