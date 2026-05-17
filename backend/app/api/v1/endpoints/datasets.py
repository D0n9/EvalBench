import os
import shutil
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
import json

from app.api import deps
from app.crud import crud_dataset
from app.models.user import User
from app.schemas.dataset import Dataset, DatasetCreate, DatasetUpdate, DatasetGrouped

router = APIRouter()

DATASET_DIR = "/workspace/datasets"


@router.get("/", response_model=List[Dataset])
def read_datasets(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 1000,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Retrieve datasets accessible by the user (including built-in).
    """
    datasets = crud_dataset.get_datasets_for_user(db, current_user, skip, limit)
    return datasets


@router.get("/grouped", response_model=List[DatasetGrouped])
def read_datasets_grouped(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Retrieve datasets grouped by category.
    """
    return crud_dataset.get_datasets_grouped(db, current_user)

@router.post("/upload", response_model=Dataset)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("LLM评测集"),
    tags: str = Form(None),
    is_public: bool = Form(True),
    is_readonly: bool = Form(False),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Upload a custom dataset file and create a Dataset record.
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=400,
            detail="You must belong to a team to upload datasets."
        )

    if not file.filename.endswith((".jsonl", ".csv", ".tsv")):
        raise HTTPException(status_code=400, detail="Only .jsonl, .csv, and .tsv files are allowed")

    team_dir = os.path.join(DATASET_DIR, f"team_{current_user.team_id}")
    os.makedirs(team_dir, exist_ok=True)
    
    tags_list = None
    if tags:
        try:
            tags_list = json.loads(tags)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid tags JSON")

    filename = file.filename
    base, ext = os.path.splitext(filename)
    
    if tags_list and ("MCQ" in tags_list or "QA" in tags_list):
        if not base.endswith("_val") and not base.endswith("_dev") and not base.endswith("_test"):
            filename = f"{base}_val{ext}"
    
    file_path = os.path.join(team_dir, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    dataset_in = DatasetCreate(
        name=name,
        category=category,
        tags=tags_list,
        is_builtin=False,
        file_path=file_path,
        is_public=is_public,
        is_readonly=is_readonly
    )
    
    dataset = crud_dataset.create_dataset(db=db, obj_in=dataset_in, current_user=current_user)
    return dataset


@router.patch("/{dataset_id}", response_model=Dataset)
def update_dataset(
    dataset_id: str,
    dataset_in: DatasetUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update a custom dataset.
    """
    from app.models.dataset import Dataset as DatasetModel
    dataset = deps.get_resource_or_404(db, DatasetModel, dataset_id, current_user)
    
    if dataset.is_builtin:
        raise HTTPException(status_code=400, detail="Cannot update built-in datasets")
    
    deps.validate_resource_modification(dataset, current_user)
    
    dataset = crud_dataset.update_dataset(db=db, dataset_id=dataset_id, obj_in=dataset_in)
    return dataset


@router.post("/{dataset_id}/file", response_model=Dataset)
async def update_dataset_file(
    dataset_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update a custom dataset file.
    """
    from app.models.dataset import Dataset as DatasetModel
    dataset = deps.get_resource_or_404(db, DatasetModel, dataset_id, current_user)
    
    if dataset.is_builtin:
        raise HTTPException(status_code=400, detail="Cannot update built-in datasets")
    
    deps.validate_resource_modification(dataset, current_user)
    
    if not file.filename.endswith((".jsonl", ".csv", ".tsv")):
        raise HTTPException(status_code=400, detail="Only .jsonl, .csv, and .tsv files are allowed")
    
    team_dir = os.path.join(DATASET_DIR, f"team_{current_user.team_id}")
    os.makedirs(team_dir, exist_ok=True)
    
    filename = file.filename
    base, ext = os.path.splitext(filename)
    
    if dataset.tags and ("MCQ" in dataset.tags or "QA" in dataset.tags):
        if not base.endswith("_val") and not base.endswith("_dev") and not base.endswith("_test"):
            filename = f"{base}_val{ext}"
    
    new_file_path = os.path.join(team_dir, filename)
    
    if dataset.file_path and dataset.file_path != new_file_path and os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
        except OSError:
            pass
    
    try:
        with open(new_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    
    dataset.file_path = new_file_path
    db.commit()
    db.refresh(dataset)
    
    return dataset


@router.delete("/{dataset_id}", response_model=Dataset)
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Delete a custom dataset.
    """
    from app.models.dataset import Dataset as DatasetModel
    dataset = deps.get_resource_or_404(db, DatasetModel, dataset_id, current_user)
    
    if dataset.is_builtin:
        raise HTTPException(status_code=400, detail="Cannot delete built-in datasets")
        
    deps.validate_resource_modification(dataset, current_user)
    
    if dataset.file_path and os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
        except OSError:
            pass
            
    dataset = crud_dataset.delete_dataset(db=db, dataset_id=dataset_id)
    return dataset
