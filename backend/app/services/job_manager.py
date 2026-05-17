"""
Async job manager backed by Redis.

``uvicorn --workers N`` runs N processes with separate heaps; an in-memory
job map caused ``GET /jobs/{id}`` to 404 when the poll hit a different worker
than the one that handled ``POST`` (202). Redis is shared across all workers.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import uuid
from enum import Enum
from typing import Any, Coroutine, Optional

import redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

TTL_SECONDS = 600  # keep finished jobs for 10 minutes (same as before)
MAX_RUNNING_TTL = 3600  # in-flight jobs may run up to 1 hour without disappearing

KEY_PREFIX = "lb:poll_job:"


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class JobEntry:
    __slots__ = ("id", "status", "result", "error")

    def __init__(
        self,
        job_id: str,
        status: JobStatus = JobStatus.pending,
        result: Any = None,
        error: Optional[str] = None,
    ) -> None:
        self.id = job_id
        self.status = status
        self.result = result
        self.error = error


_client: Optional[redis.Redis] = None
_client_lock = threading.Lock()


def _redis() -> redis.Redis:
    global _client
    with _client_lock:
        if _client is None:
            _client = redis.Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
        return _client


def _key(job_id: str) -> str:
    return f"{KEY_PREFIX}{job_id}"


def _persist(job_id: str, status: JobStatus, result: Any, error: Optional[str], finished: bool) -> None:
    payload = json.dumps(
        {"status": status.value, "result": result, "error": error},
        default=str,
    )
    r = _redis()
    key = _key(job_id)
    ex = TTL_SECONDS if finished else MAX_RUNNING_TTL
    r.setex(key, ex, payload)


async def _run_job(job_id: str, coro: Coroutine) -> None:
    _persist(job_id, JobStatus.running, None, None, finished=False)
    try:
        result = await coro
        _persist(job_id, JobStatus.completed, result, None, finished=True)
    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        _persist(job_id, JobStatus.failed, None, str(exc), finished=True)


def submit(coro: Coroutine) -> str:
    """Submit an async coroutine for background execution.

    Returns a job_id that can be polled via ``get()``.
    """
    job_id = uuid.uuid4().hex
    try:
        _persist(job_id, JobStatus.pending, None, None, finished=False)
    except RedisError as exc:
        logger.error("Cannot persist job %s to Redis: %s", job_id, exc)
        raise RuntimeError("Job queue unavailable (Redis)") from exc

    loop = asyncio.get_running_loop()
    loop.create_task(_run_job(job_id, coro))
    return job_id


def get(job_id: str) -> Optional[JobEntry]:
    """Return the current state of a job, or ``None`` if not found / Redis error."""
    try:
        raw = _redis().get(_key(job_id))
    except RedisError as exc:
        logger.warning("Redis error reading job %s: %s", job_id, exc)
        return None
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    try:
        status = JobStatus(data["status"])
    except (KeyError, ValueError):
        return None
    return JobEntry(
        job_id,
        status,
        data.get("result"),
        data.get("error"),
    )
