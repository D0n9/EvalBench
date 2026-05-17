from typing import Optional, List
from pydantic import BaseModel

class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(TeamBase):
    name: Optional[str] = None

class TeamMemberUpdate(BaseModel):
    usernames: List[str]

class Team(TeamBase):
    id: str
    member_count: Optional[int] = 0

    class Config:
        from_attributes = True

class TeamWithMembers(Team):
    pass
