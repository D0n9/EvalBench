from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app import models
from app.api import deps
from app.schemas.dashboard import DashboardData, DashboardStats, RecentActivity, ModelRanking, DatasetUsage, PassRateStats

router = APIRouter()

@router.get("/", response_model=DashboardData)
def get_dashboard_data(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get dashboard statistics and recent activity.
    """
    is_admin = current_user.is_superuser

    # 1. Total Models
    models_query = db.query(func.count(models.ModelConfig.id))
    if not is_admin:
        models_query = models_query.filter(
            (models.ModelConfig.team_id == current_user.team_id) | (models.ModelConfig.is_public == True)
        )
    total_models = models_query.scalar()

    # 2. Total Datasets
    datasets_query = db.query(func.count(models.Dataset.id))
    if not is_admin:
        datasets_query = datasets_query.filter(
            (models.Dataset.team_id == current_user.team_id) | 
            (models.Dataset.is_public == True) |
            (models.Dataset.is_builtin == True)
        )
    total_datasets = datasets_query.scalar()

    # 3. Running Tasks
    running_query = db.query(func.count(models.Task.id)).filter(
        models.Task.status.in_(["pending", "running"]),
        models.Task.is_deleted == False
    )
    if not is_admin:
        running_query = running_query.filter(models.Task.team_id == current_user.team_id)
    running_tasks = running_query.scalar()

    # 4. Total Evaluations (completed tasks)
    eval_query = db.query(func.count(models.Task.id)).filter(
        models.Task.status == "completed",
        models.Task.is_deleted == False
    )
    if not is_admin:
        eval_query = eval_query.filter(models.Task.team_id == current_user.team_id)
    total_evaluations = eval_query.scalar()

    # 5. Recent Activity (last 5 tasks)
    activity_query = db.query(models.Task).filter(models.Task.is_deleted == False)
    if not is_admin:
        activity_query = activity_query.filter(models.Task.team_id == current_user.team_id)
    recent_tasks = activity_query.order_by(desc(models.Task.created_at)).limit(5).all()

    activity_list = []
    for task in recent_tasks:
        score = None
        model_name = "Unknown"
        dataset_name = None
        
        if task.status == "completed" and task.results:
            result = task.results[0]
            score = result.score
            model_name = result.model_name
            dataset_name = result.dataset_name
        else:
            config = task.config or {}
            model_name = config.get("model_id", "Unknown")
            datasets = config.get("datasets", [])
            if datasets:
                dataset_name = datasets[0].get("name") if isinstance(datasets[0], dict) else str(datasets[0])

        activity_list.append(RecentActivity(
            task_id=task.id,
            task_name=task.name,
            model_name=model_name,
            dataset_name=dataset_name,
            score=score,
            status=task.status,
            created_at=task.created_at
        ))

    # 6. Model Ranking
    ranking_query = db.query(
        models.Result.model_name,
        func.avg(models.Result.score).label("avg_score"),
        func.count(models.Result.id).label("eval_count")
    ).join(models.Task).filter(
        models.Task.status == "completed",
        models.Result.score.isnot(None)
    )
    if not is_admin:
        ranking_query = ranking_query.filter(models.Task.team_id == current_user.team_id)
    
    model_scores = ranking_query.group_by(models.Result.model_name).order_by(desc("avg_score")).limit(5).all()

    model_ranking = [
        ModelRanking(
            model_name=m.model_name,
            avg_score=float(m.avg_score) if m.avg_score else 0.0,
            eval_count=m.eval_count
        ) for m in model_scores
    ]

    # 7. Dataset Usage Statistics
    # EvalScope maps custom datasets to generic template identifiers (e.g. general_qa).
    # We resolve them back to the original user-defined dataset names.
    TEMPLATE_KEYS = {
        "general_qa", "General-QA", "general-qa",
        "general_mcq", "General-MCQ", "general-mcq",
    }

    usage_base = db.query(
        models.Result.dataset_name,
        models.Result.score,
        models.Task.config,
    ).join(models.Task).filter(
        models.Task.status == "completed",
        models.Task.is_deleted == False,
        models.Result.dataset_name.isnot(None),
    )
    if not is_admin:
        usage_base = usage_base.filter(models.Task.team_id == current_user.team_id)
    all_result_rows = usage_base.all()

    # Resolve each Result's dataset_name to the original user-defined name.
    per_name_scores: dict[str, list[float | None]] = {}
    for ds_name, score, config in all_result_rows:
        resolved: str | None = None
        if ds_name in TEMPLATE_KEYS:
            cfg = config or {}
            for ds in cfg.get("datasets", []):
                n = ds.get("name") if isinstance(ds, dict) else str(ds)
                if n and n not in TEMPLATE_KEYS:
                    resolved = n
                    break
        per_name_scores.setdefault(resolved or ds_name, []).append(score)

    # Build display name map: original name → friendly name from Dataset table.
    all_resolved_names = list(per_name_scores.keys())
    ds_display_map: dict[str, str] = {}
    if all_resolved_names:
        for row in db.query(models.Dataset.name, models.Dataset.standard_name).filter(
            models.Dataset.name.in_(all_resolved_names)
        ).all():
            ds_display_map[row.name] = row.standard_name or row.name

    # Assemble final list, sorted by eval_count descending, capped at 10.
    dataset_usage_unsorted = []
    for name, scores in per_name_scores.items():
        valid = [s for s in scores if s is not None]
        dataset_usage_unsorted.append(DatasetUsage(
            dataset_name=name,
            display_name=ds_display_map.get(name),
            eval_count=len(scores),
            avg_score=sum(valid) / len(valid) if valid else None,
        ))
    dataset_usage_unsorted.sort(key=lambda x: x.eval_count, reverse=True)
    dataset_usage = dataset_usage_unsorted[:10]

    # 8. Pass Rate Statistics
    pass_rate_base = db.query(models.SampleResult.id).join(
        models.Result
    ).join(models.Task).filter(
        models.Task.is_deleted == False
    )
    if not is_admin:
        pass_rate_base = pass_rate_base.filter(models.Task.team_id == current_user.team_id)
    
    total_samples = pass_rate_base.count()
    passed_samples = pass_rate_base.filter(models.SampleResult.is_passed == "passed").count()
    failed_samples = pass_rate_base.filter(models.SampleResult.is_passed == "failed").count()

    overall_pass_rate = (passed_samples / total_samples * 100) if total_samples > 0 else 0.0

    pass_rate = PassRateStats(
        overall_pass_rate=overall_pass_rate,
        total_samples=total_samples,
        passed_samples=passed_samples,
        failed_samples=failed_samples
    )

    return DashboardData(
        stats=DashboardStats(
            total_models=total_models,
            total_datasets=total_datasets,
            running_tasks=running_tasks,
            total_evaluations=total_evaluations
        ),
        recent_activity=activity_list,
        model_ranking=model_ranking,
        dataset_usage=dataset_usage,
        pass_rate=pass_rate
    )
