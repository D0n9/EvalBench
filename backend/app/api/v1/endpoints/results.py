import csv
import io
import logging
from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.crud import crud_result
from app.models.user import User
from app.schemas import result as schemas
from app.models.result import SampleResult, Result
from app.models.task import Task as TaskModel

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/task/{task_id}", response_model=List[schemas.Result])
def read_task_results(
    task_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get all results for a specific task.
    """
    deps.get_resource_or_404(db, TaskModel, task_id, current_user)
    
    results = crud_result.get_results_by_task(db, task_id=task_id)
    return results

@router.get("/{result_id}/samples", response_model=schemas.SampleResultPage)
def read_result_samples(
    result_id: str,
    skip: int = 0,
    limit: int = 10,
    is_passed: Optional[str] = None,
    severity: Optional[str] = None,
    dimension: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get paginated sample results for a specific result.
    """
    result = crud_result.get_result(db, result_id=result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    deps.get_resource_or_404(db, TaskModel, result.task_id, current_user)
    
    samples = crud_result.get_sample_results(
        db, 
        result_id=result_id, 
        skip=skip, 
        limit=limit,
        is_passed=is_passed,
        severity=severity,
        dimension=dimension
    )
    total = crud_result.count_sample_results(
        db, 
        result_id=result_id,
        is_passed=is_passed,
        severity=severity,
        dimension=dimension
    )
    
    return {
        "items": samples,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{result_id}/stats")
def read_result_stats(
    result_id: str,
    max_chart_items: int = 5000,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    result = crud_result.get_result(db, result_id=result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    deps.get_resource_or_404(db, TaskModel, result.task_id, current_user)

    from sqlalchemy import case
    stats_row = db.query(
        func.count(SampleResult.id).label("total"),
        func.count(case((SampleResult.is_passed == "passed", 1))).label("passed"),
        func.count(case((SampleResult.is_passed == "failed", 1))).label("failed")
    ).filter(SampleResult.result_id == result_id).one()

    total = stats_row.total
    passed = stats_row.passed
    failed = stats_row.failed

    severity_rows = (
        db.query(SampleResult.severity, func.count(SampleResult.id))
        .filter(SampleResult.result_id == result_id)
        .group_by(SampleResult.severity)
        .all()
    )
    severity_counts: Dict[str, int] = {}
    for sev, cnt in severity_rows:
        severity_counts[str(sev) if sev is not None else "unknown"] = int(cnt)

    chart_rows = (
        db.query(SampleResult.question_id, SampleResult.score, SampleResult.is_passed)
        .filter(SampleResult.result_id == result_id)
        .order_by(SampleResult.created_at.asc())
        .limit(max_chart_items)
        .all()
    )
    sample_scores = [
        {"question_id": qid, "score": sc, "is_passed": ip}
        for (qid, sc, ip) in chart_rows
    ]

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "severity_counts": severity_counts,
        "sample_scores": sample_scores,
    }

@router.post("/{result_id}/samples/{sample_id}/retry")
async def retry_sample(
    result_id: str,
    sample_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Submit an async retry job for a single evaluation sample.

    Returns HTTP 202 with a ``job_id``.  The caller should poll
    ``GET /jobs/{job_id}`` until ``status`` is ``completed`` or ``failed``.
    """
    result = crud_result.get_result(db, result_id=result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    deps.get_resource_or_404(db, TaskModel, result.task_id, current_user)

    sample = db.query(SampleResult).filter(
        SampleResult.id == sample_id,
        SampleResult.result_id == result_id,
    ).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    from app.services.job_manager import submit as submit_job

    async def _do_retry() -> dict:
        from app.db.session import SessionLocal
        from app.services.sample_retry import retry_single_sample

        bg_db = SessionLocal()
        try:
            bg_result = crud_result.get_result(bg_db, result_id=result_id)
            bg_task = bg_db.query(TaskModel).filter(TaskModel.id == bg_result.task_id).first()
            bg_sample = bg_db.query(SampleResult).filter(SampleResult.id == sample_id).first()
            updated = await retry_single_sample(bg_sample, bg_result, bg_task, bg_db)
            return schemas.SampleResult.model_validate(updated).model_dump(mode="json")
        except Exception:
            bg_db.rollback()
            raise
        finally:
            bg_db.close()

    try:
        job_id = submit_job(_do_retry())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return JSONResponse(
        status_code=202,
        content={"job_id": job_id, "status": "pending"},
    )


@router.put("/{result_id}/samples/{sample_id}/promote", response_model=schemas.SampleResult)
def promote_sample_version(
    result_id: str,
    sample_id: str,
    body: Dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Promote a historical version to the current result."""
    result = crud_result.get_result(db, result_id=result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    _ = deps.get_resource_or_404(db, TaskModel, result.task_id, current_user)

    sample = db.query(SampleResult).filter(
        SampleResult.id == sample_id,
        SampleResult.result_id == result_id,
    ).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    history_index = body.get("history_index")
    if history_index is None or not isinstance(history_index, int):
        raise HTTPException(status_code=422, detail="history_index (int) is required")

    from app.services.sample_retry import promote_history_version

    try:
        updated = promote_history_version(sample, result, history_index, db)
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Promote failed for sample %s: %s", sample_id, exc, exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{result_id}/export/csv")
def export_result_csv(
    result_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Export all sample results for a result as a CSV file."""
    result = crud_result.get_result(db, result_id=result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    deps.get_resource_or_404(db, TaskModel, result.task_id, current_user)

    samples = (
        db.query(SampleResult)
        .filter(SampleResult.result_id == result_id)
        .order_by(SampleResult.created_at.asc())
        .all()
    )

    CSV_COLUMNS = [
        "question_id",
        "dataset",
        "subset",
        "category",
        "dimension",
        "severity",
        "prompt",
        "model_response",
        "reference_answer",
        "score",
        "is_passed",
        "judge_explanation",
        "model_name",
        "retry_count",
    ]

    def _extract_judge_explanation(raw_data: Optional[dict]) -> str:
        if not raw_data or not isinstance(raw_data, dict):
            return ""
        ss = raw_data.get("sample_score")
        if isinstance(ss, dict):
            inner = ss.get("score")
            if isinstance(inner, dict):
                exp = inner.get("explanation", "")
                if exp:
                    return str(exp)
        return str(raw_data.get("retry_explanation", ""))

    def _extract_subset(raw_data: Optional[dict]) -> str:
        if not raw_data or not isinstance(raw_data, dict):
            return ""
        return str(raw_data.get("subset_key", ""))

    buf = io.StringIO()
    buf.write("\ufeff")
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)

    for s in samples:
        writer.writerow([
            s.question_id or "",
            result.dataset_name or "",
            _extract_subset(s.raw_data),
            s.category or "",
            s.dimension or "",
            s.severity or "",
            s.prompt or "",
            s.response or "",
            s.reference or "",
            s.score if s.score is not None else "",
            s.is_passed or "",
            _extract_judge_explanation(s.raw_data),
            result.model_name or "",
            s.retry_count or 0,
        ])

    buf.seek(0)
    safe_name = (result.dataset_name or "result").replace("/", "_").replace(" ", "_")
    filename = f"{safe_name}_{result.model_name or 'model'}.csv"

    return StreamingResponse(
        buf,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/compare")
def compare_tasks(
    task_ids: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Compare results across multiple tasks.

    ``task_ids`` is a comma-separated list of task IDs (2–8 tasks).
    Returns per-task score summaries aligned by dataset, including
    category/dimension breakdowns, score statistics, and pairwise
    question-level agreement analysis.
    """
    import math
    from sqlalchemy import case as sa_case

    ids = [tid.strip() for tid in task_ids.split(",") if tid.strip()]
    if len(ids) < 2:
        raise HTTPException(status_code=422, detail="Provide at least 2 task IDs")
    if len(ids) > 8:
        raise HTTPException(status_code=422, detail="Cannot compare more than 8 tasks at once")

    comparison = []

    for task_id in ids:
        task = deps.get_resource_or_404(db, TaskModel, task_id, current_user)
        results_rows = crud_result.get_results_by_task(db, task_id=task_id)

        datasets_summary = []
        for r in results_rows:
            # Basic pass/fail stats + avg score
            stats = db.query(
                func.count(SampleResult.id).label("total"),
                func.count(sa_case((SampleResult.is_passed == "passed", 1))).label("passed"),
                func.avg(SampleResult.score).label("avg_score"),
                func.min(SampleResult.score).label("min_score"),
                func.max(SampleResult.score).label("max_score"),
            ).filter(SampleResult.result_id == r.id).one()

            # Std deviation (manual — SQLite compatible)
            all_scores = db.query(SampleResult.score).filter(
                SampleResult.result_id == r.id,
                SampleResult.score.isnot(None),
            ).all()
            score_values = [row[0] for row in all_scores]
            if len(score_values) >= 2:
                mean = sum(score_values) / len(score_values)
                variance = sum((x - mean) ** 2 for x in score_values) / len(score_values)
                std_score = round(math.sqrt(variance), 4)
            else:
                std_score = None

            # Category breakdown
            cat_rows = db.query(
                SampleResult.category,
                func.count(SampleResult.id).label("total"),
                func.count(sa_case((SampleResult.is_passed == "passed", 1))).label("passed"),
            ).filter(
                SampleResult.result_id == r.id,
                SampleResult.category.isnot(None),
            ).group_by(SampleResult.category).all()

            category_breakdown = [
                {
                    "name": row.category or "unknown",
                    "total": row.total,
                    "passed": row.passed,
                    "pass_rate": round(row.passed / row.total, 4) if row.total else None,
                }
                for row in cat_rows
            ]

            # Dimension breakdown
            dim_rows = db.query(
                SampleResult.dimension,
                func.count(SampleResult.id).label("total"),
                func.count(sa_case((SampleResult.is_passed == "passed", 1))).label("passed"),
            ).filter(
                SampleResult.result_id == r.id,
                SampleResult.dimension.isnot(None),
            ).group_by(SampleResult.dimension).all()

            dimension_breakdown = [
                {
                    "name": row.dimension or "unknown",
                    "total": row.total,
                    "passed": row.passed,
                    "pass_rate": round(row.passed / row.total, 4) if row.total else None,
                }
                for row in dim_rows
            ]

            # Question-level lookup map: question_id → is_passed
            q_rows = db.query(SampleResult.question_id, SampleResult.is_passed).filter(
                SampleResult.result_id == r.id,
                SampleResult.question_id.isnot(None),
            ).all()
            question_map = {qid: ip for qid, ip in q_rows}

            datasets_summary.append({
                "result_id": r.id,
                "dataset_name": r.dataset_name,
                "score": r.score,
                "metrics": r.metrics,
                "total_samples": stats.total,
                "passed": stats.passed,
                "failed": stats.total - stats.passed,
                "avg_score": round(float(stats.avg_score), 4) if stats.avg_score is not None else None,
                "min_score": round(float(stats.min_score), 4) if stats.min_score is not None else None,
                "max_score": round(float(stats.max_score), 4) if stats.max_score is not None else None,
                "std_score": std_score,
                "category_breakdown": category_breakdown,
                "dimension_breakdown": dimension_breakdown,
                "_question_map": question_map,  # internal, stripped before return
            })

        config = task.config or {}
        overall = None
        if datasets_summary:
            scores = [d["score"] for d in datasets_summary if d["score"] is not None]
            overall = round(sum(scores) / len(scores), 4) if scores else None

        comparison.append({
            "task_id": task.id,
            "task_name": task.name,
            "status": task.status,
            "model_name": config.get("model", ""),
            "datasets_config": config.get("datasets", []),
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "datasets": datasets_summary,
            "overall_score": overall,
        })

    # Collect all dataset names (union) for alignment
    all_datasets: List[str] = []
    seen: set = set()
    for entry in comparison:
        for d in entry["datasets"]:
            n = d["dataset_name"]
            if n not in seen:
                all_datasets.append(n)
                seen.add(n)

    # Pairwise agreement analysis across all pairs (i, j) where i < j
    # For each pair, for each shared dataset, count both_pass / both_fail / i_only / j_only
    pairwise_agreement = []
    for i in range(len(comparison)):
        for j in range(i + 1, len(comparison)):
            task_a = comparison[i]
            task_b = comparison[j]

            ds_map_a = {d["dataset_name"]: d["_question_map"] for d in task_a["datasets"]}
            ds_map_b = {d["dataset_name"]: d["_question_map"] for d in task_b["datasets"]}

            shared_datasets = set(ds_map_a.keys()) & set(ds_map_b.keys())
            per_dataset = []
            total_both_pass = total_both_fail = total_a_only = total_b_only = 0

            for ds_name in sorted(shared_datasets):
                q_a = ds_map_a[ds_name]
                q_b = ds_map_b[ds_name]
                shared_questions = set(q_a.keys()) & set(q_b.keys())
                if not shared_questions:
                    continue

                both_pass = sum(1 for q in shared_questions if q_a[q] == "passed" and q_b[q] == "passed")
                both_fail = sum(1 for q in shared_questions if q_a[q] != "passed" and q_b[q] != "passed")
                a_only = sum(1 for q in shared_questions if q_a[q] == "passed" and q_b[q] != "passed")
                b_only = sum(1 for q in shared_questions if q_a[q] != "passed" and q_b[q] == "passed")
                total = len(shared_questions)

                per_dataset.append({
                    "dataset_name": ds_name,
                    "shared_questions": total,
                    "both_pass": both_pass,
                    "both_fail": both_fail,
                    "a_only_pass": a_only,
                    "b_only_pass": b_only,
                    "agreement_rate": round((both_pass + both_fail) / total, 4) if total else None,
                    "flip_rate": round((a_only + b_only) / total, 4) if total else None,
                })
                total_both_pass += both_pass
                total_both_fail += both_fail
                total_a_only += a_only
                total_b_only += b_only

            grand_total = total_both_pass + total_both_fail + total_a_only + total_b_only
            pairwise_agreement.append({
                "task_a_id": task_a["task_id"],
                "task_a_name": task_a["task_name"],
                "task_b_id": task_b["task_id"],
                "task_b_name": task_b["task_name"],
                "per_dataset": per_dataset,
                "summary": {
                    "both_pass": total_both_pass,
                    "both_fail": total_both_fail,
                    "a_only_pass": total_a_only,
                    "b_only_pass": total_b_only,
                    "agreement_rate": round((total_both_pass + total_both_fail) / grand_total, 4) if grand_total else None,
                    "flip_rate": round((total_a_only + total_b_only) / grand_total, 4) if grand_total else None,
                },
            })

    # Strip internal _question_map before returning
    for entry in comparison:
        for d in entry["datasets"]:
            d.pop("_question_map", None)

    return {
        "tasks": comparison,
        "dataset_names": all_datasets,
        "pairwise_agreement": pairwise_agreement,
    }


@router.get("/{result_id}", response_model=schemas.Result)
def read_result(
    result_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get result row (scores, metrics, logs, config). Does not load samples — use
    GET /{result_id}/samples with skip/limit to avoid huge payloads.
    """
    result = crud_result.get_result(db, result_id=result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    deps.get_resource_or_404(db, TaskModel, result.task_id, current_user)

    return result

