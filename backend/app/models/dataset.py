from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, UUIDMixin


class DatasetCategory(str):
    LLM = "LLM评测集"
    VLM = "VLM评测集"
    AGENT = "AGENT评测集"
    AIGC = "AIGC评测集"
    OTHER = "其他数据集"

    @classmethod
    def all(cls) -> list:
        return [cls.LLM, cls.VLM, cls.AGENT, cls.AIGC, cls.OTHER]


class Dataset(Base, UUIDMixin):
    __tablename__ = "datasets"

    name = Column(String, index=True, nullable=False)
    standard_name = Column(String, nullable=True)
    category = Column(String, nullable=True, index=True)
    tags = Column(JSON, nullable=True)
    subsets = Column(JSON, nullable=True)
    link = Column(String, nullable=True)
    is_builtin = Column(Boolean, default=False)

    file_path = Column(String, nullable=True)

    is_public = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)

    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    team = relationship("Team", back_populates="datasets")

    creator_id = Column(String, ForeignKey("users.username"), nullable=True)
    creator = relationship("User", back_populates="created_datasets")
