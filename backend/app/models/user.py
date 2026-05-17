from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base

class User(Base):
    """
    User Model

    User Types:
    - Super Admin (is_superuser=True): Built-in administrators, non-LDAP, stored in DB with hashed password
    - Platform User (is_superuser=False, is_ldap_user=True): LDAP authenticated users, created on first login

    Future Role System:
    - role field will be used for platform user role management (admin, team_lead, member, etc.)
    - role=0: Platform Admin (can manage teams and users within platform)
    - role=1: Team Lead (can manage team resources)
    - role=2: Member (basic access)
    - role=None: No specific role assigned
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, index=True)
    is_active = Column(Boolean, default=True)

    is_superuser = Column(Boolean, default=False, index=True)

    team_id = Column(String, ForeignKey("teams.id"), index=True)
    team = relationship("Team", back_populates="users")

    is_ldap_user = Column(Boolean, default=False, index=True)
    ldap_dn = Column(String, nullable=True)
    nickname = Column(String, nullable=True)
    mobile = Column(String, nullable=True)

    role = Column(Integer, nullable=True)
    last_login = Column(DateTime, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    created_models = relationship("ModelConfig", back_populates="creator")
    created_datasets = relationship("Dataset", back_populates="creator")
    created_tasks = relationship("Task", back_populates="creator")
