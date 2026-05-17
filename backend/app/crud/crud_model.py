from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.model_config import ModelConfig
from app.models.user import User
from app.schemas.model_config import ModelConfigCreate, ModelConfigUpdate

def get_models_for_user(
    db: Session, current_user: User, skip: int = 0, limit: int = 100
) -> List[ModelConfig]:
    query = db.query(ModelConfig)
    if not current_user.is_superuser:
        query = query.filter(
            or_(
                ModelConfig.team_id == current_user.team_id,
                ModelConfig.is_public == True
            )
        )
    
    return query.order_by(ModelConfig.id.desc()).offset(skip).limit(limit).all()

def create_model(db: Session, obj_in: ModelConfigCreate, current_user: User) -> ModelConfig:
    db_obj = ModelConfig(
        name=obj_in.name,
        evalscope_model_id=obj_in.evalscope_model_id,
        api_url=obj_in.api_url,
        api_key=obj_in.api_key,
        api_protocol=obj_in.api_protocol,
        custom_api_config=obj_in.custom_api_config,
        generation_config=obj_in.generation_config,
        model_types=obj_in.model_types,
        is_public=obj_in.is_public,
        is_readonly=obj_in.is_readonly,
        creator_id=current_user.id,
        team_id=current_user.team_id,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_model(db: Session, model_id: str) -> Optional[ModelConfig]:
    model = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if model:
        db.delete(model)
        db.commit()
    return model

def update_model(
    db: Session,
    model_id: str,
    obj_in: ModelConfigUpdate
) -> Optional[ModelConfig]:
    model = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not model:
        return None

    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(model, field, value)

    db.commit()
    db.refresh(model)
    return model
