from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.result import Result, SampleResult
from app.schemas.result import ResultCreate, SampleResultCreate

def create_result(db: Session, obj_in: ResultCreate) -> Result:
    db_obj = Result(
        task_id=obj_in.task_id,
        model_name=obj_in.model_name,
        dataset_name=obj_in.dataset_name,
        score=obj_in.score,
        metrics=obj_in.metrics,
        config_content=obj_in.config_content,
        log_content=obj_in.log_content,
        report_file=obj_in.report_file,
        html_report_file=obj_in.html_report_file,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def create_sample_result(db: Session, obj_in: SampleResultCreate) -> SampleResult:
    db_obj = SampleResult(
        result_id=obj_in.result_id,
        question_id=obj_in.question_id,
        category=obj_in.category,
        dimension=obj_in.dimension,
        severity=obj_in.severity,
        prompt=obj_in.prompt,
        response=obj_in.response,
        reference=obj_in.reference,
        is_passed=obj_in.is_passed,
        score=obj_in.score,
        raw_data=obj_in.raw_data
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def bulk_create_sample_results(db: Session, objs_in: List[SampleResultCreate]) -> None:
    db_objs = [
        SampleResult(
            result_id=obj.result_id,
            question_id=obj.question_id,
            category=obj.category,
            dimension=obj.dimension,
            severity=obj.severity,
            prompt=obj.prompt,
            response=obj.response,
            reference=obj.reference,
            is_passed=obj.is_passed,
            score=obj.score,
            raw_data=obj.raw_data
        )
        for obj in objs_in
    ]
    db.bulk_save_objects(db_objs)
    db.commit()

def get_result(db: Session, result_id: str) -> Optional[Result]:
    return db.query(Result).filter(Result.id == result_id).first()

def get_results_by_task(db: Session, task_id: str) -> List[Result]:
    return db.query(Result).filter(Result.task_id == task_id).all()

def get_sample_results(
    db: Session, 
    result_id: str, 
    skip: int = 0, 
    limit: int = 10,
    is_passed: Optional[str] = None,
    severity: Optional[str] = None,
    dimension: Optional[str] = None
) -> List[SampleResult]:
    query = db.query(SampleResult).filter(SampleResult.result_id == result_id)
    if is_passed:
        query = query.filter(SampleResult.is_passed == is_passed)
    if severity:
        query = query.filter(SampleResult.severity == severity)
    if dimension:
        query = query.filter(SampleResult.dimension == dimension)

    query = query.order_by(SampleResult.created_at.asc())
    return query.offset(skip).limit(limit).all()

def count_sample_results(
    db: Session, 
    result_id: str,
    is_passed: Optional[str] = None,
    severity: Optional[str] = None,
    dimension: Optional[str] = None
) -> int:
    query = db.query(SampleResult).filter(SampleResult.result_id == result_id)
    if is_passed:
        query = query.filter(SampleResult.is_passed == is_passed)
    if severity:
        query = query.filter(SampleResult.severity == severity)
    if dimension:
        query = query.filter(SampleResult.dimension == dimension)
    
    return query.count()

