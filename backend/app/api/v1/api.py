from fastapi import APIRouter
from app.api.v1.endpoints import tasks, login, users, models, datasets, results, dashboard, admin, teams, jobs, system, webhooks

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(results.router, prefix="/results", tags=["results"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(webhooks.router, prefix="/admin/webhooks", tags=["webhooks"])
