from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate

def get_team(db: Session, team_id: str) -> Optional[Team]:
    return db.query(Team).filter(Team.id == team_id).first()

def get_team_by_name(db: Session, name: str) -> Optional[Team]:
    return db.query(Team).filter(Team.name == name).first()

def get_multi(db: Session, skip: int = 0, limit: int = 100) -> List[Team]:
    return db.query(Team).offset(skip).limit(limit).all()

def create(db: Session, obj_in: TeamCreate) -> Team:
    db_obj = Team(
        name=obj_in.name,
        description=obj_in.description
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, db_obj: Team, obj_in: TeamUpdate) -> Team:
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def remove(db: Session, team_id: str) -> Optional[Team]:
    team = db.query(Team).filter(Team.id == team_id).first()
    if team:
        db.delete(team)
        db.commit()
    return team
