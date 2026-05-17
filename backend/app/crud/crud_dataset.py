from typing import List, Optional, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.models.dataset import Dataset, DatasetCategory
from app.models.user import User
from app.models.team import Team
from app.schemas.dataset import DatasetCreate, DatasetUpdate, DatasetGrouped


def _populate_dataset_fields(datasets: List[Dataset], db: Session) -> List[Dataset]:
    """Populate creator_name and team_name fields for datasets"""
    for ds in datasets:
        if ds.creator_id:
            user = db.query(User).filter(User.id == ds.creator_id).first()
            if user:
                ds.creator_name = user.username
        if ds.team_id:
            team = db.query(Team).filter(Team.id == ds.team_id).first()
            if team:
                ds.team_name = team.name
    return datasets


def get_datasets_for_user(
    db: Session, current_user: User, skip: int = 0, limit: int = 1000
) -> List[Dataset]:
    if current_user.is_superuser:
        datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).offset(skip).limit(limit).all()
    else:
        datasets = db.query(Dataset).filter(
            or_(
                Dataset.is_builtin == True,
                Dataset.team_id == current_user.team_id,
                Dataset.is_public == True
            )
        ).order_by(Dataset.created_at.desc()).offset(skip).limit(limit).all()
    
    return _populate_dataset_fields(datasets, db)


def get_datasets_grouped(db: Session, current_user: User) -> List[DatasetGrouped]:
    datasets = db.query(Dataset).filter(Dataset.is_builtin == True).all()
    
    groups: Dict[str, List[Dataset]] = {}
    for ds in datasets:
        category = ds.category or DatasetCategory.OTHER
        if category not in groups:
            groups[category] = []
        groups[category].append(ds)
    
    ordered_categories = DatasetCategory.all()
    result = []
    for cat in ordered_categories:
        if cat in groups:
            result.append(DatasetGrouped(
                category=cat,
                datasets=groups[cat],
                count=len(groups[cat])
            ))
    
    for cat, ds_list in groups.items():
        if cat not in ordered_categories:
            result.append(DatasetGrouped(
                category=cat,
                datasets=ds_list,
                count=len(ds_list)
            ))
    
    return result


def create_dataset(db: Session, obj_in: DatasetCreate, current_user: User) -> Dataset:
    db_obj = Dataset(
        name=obj_in.name,
        standard_name=obj_in.standard_name,
        category=obj_in.category,
        tags=obj_in.tags,
        link=obj_in.link,
        is_builtin=obj_in.is_builtin,
        file_path=obj_in.file_path,
        is_public=obj_in.is_public,
        is_readonly=obj_in.is_readonly,
        creator_id=None if obj_in.is_builtin else current_user.id,
        team_id=None if obj_in.is_builtin else current_user.team_id,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_dataset(db: Session, dataset_id: int) -> Optional[Dataset]:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if dataset:
        db.delete(dataset)
        db.commit()
    return dataset


def update_dataset(db: Session, dataset_id: int, obj_in: DatasetUpdate) -> Optional[Dataset]:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        return None
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dataset, field, value)
    
    db.commit()
    db.refresh(dataset)
    return dataset
