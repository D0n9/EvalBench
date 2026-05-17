from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.team import Team
from app.schemas.user import UserCreate, UserUpdate, UserRole
from app.core.security import get_password_hash, verify_password
DEFAULT_ROLE = UserRole.NONE  # Default role for new users

def get_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.id == username).first()

def get_multi(db: Session, *, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).outerjoin(Team).offset(skip).limit(limit).all()

def update(db: Session, *, db_obj: User, obj_in: UserUpdate | Dict[str, Any]) -> User:
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.model_dump(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        hashed_password = get_password_hash(update_data["password"])
        db_obj.hashed_password = hashed_password
        del update_data["password"]

    for field in update_data:
        if hasattr(db_obj, field):
            setattr(db_obj, field, update_data[field])

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def authenticate(db: Session, username: str, password: str) -> Optional[User]:
    user = get_by_username(db, username=username)
    if not user:
        return None
    if user.is_ldap_user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def authenticate_ldap(
    db: Session,
    username: str,
    ldap_info: Dict[str, Any],
    *,
    always_update_user: bool = True,
) -> User:
    user = get_by_username(db, username=username)

    if not user:
        placeholder_hash = get_password_hash(f"ldap_{ldap_info.get('dn', '')}")
        user = User(
            id=username,
            username=username,
            email=ldap_info.get("mail"),
            hashed_password=placeholder_hash,
            is_ldap_user=True,
            ldap_dn=ldap_info.get("dn"),
            full_name=ldap_info.get("nickname") or ldap_info.get("uid"),
            nickname=ldap_info.get("nickname"),
            mobile=ldap_info.get("mobile"),
            is_active=True,
            role=DEFAULT_ROLE  # Set default role for new LDAP users
        )
        db.add(user)
    else:
        if always_update_user:
            user.is_ldap_user = True
            user.ldap_dn = ldap_info.get("dn")
            user.nickname = ldap_info.get("nickname", user.nickname)
            user.mobile = ldap_info.get("mobile", user.mobile)
            if ldap_info.get("nickname") or ldap_info.get("uid"):
                user.full_name = ldap_info.get("nickname") or ldap_info.get("uid")

    db.commit()
    db.refresh(user)
    return user


def authenticate_oauth_oidc(
    db: Session,
    *,
    username: str,
    email: Optional[str],
    full_name: Optional[str],
    auto_create_users: bool = True,
    always_update_user: bool = True,
) -> Optional[User]:
    user = get_by_username(db, username=username)
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        if not auto_create_users:
            return None
        user = User(
            id=username,
            username=username,
            email=email,
            hashed_password=get_password_hash(f"oauth_{username}"),
            is_ldap_user=False,
            full_name=full_name or username,
            nickname=full_name,
            is_active=True,
            role=DEFAULT_ROLE,
        )
        db.add(user)
    elif always_update_user:
        if email:
            user.email = email
        if full_name:
            user.full_name = full_name
            user.nickname = full_name

    db.commit()
    db.refresh(user)
    return user


def create(db: Session, obj_in: UserCreate) -> User:
    role = obj_in.role if obj_in.role is not None else DEFAULT_ROLE
    db_obj = User(
        id=obj_in.username,
        username=obj_in.username,
        email=obj_in.email,
        hashed_password=get_password_hash(obj_in.password) if obj_in.password else None,
        full_name=obj_in.full_name,
        is_superuser=obj_in.is_superuser,
        team_id=obj_in.team_id,
        role=role
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
