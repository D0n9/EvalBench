from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "LLM Benchmark API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # SECURITY
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # APPLICATION
    ENVIRONMENT: str = "production"

    # DATABASE
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "evaluser"
    POSTGRES_PASSWORD: str = "evalpass"
    POSTGRES_DB: str = "evaldb"
    DATABASE_URL: str = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # REDIS / CELERY
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

    # EVALSCOPE Configuration (Python SDK Mode)
    EVALSCOPE_OUTPUT_DIR: str = "/workspace/outputs"
    EVALSCOPE_DATASET_DIR: str = "/workspace/datasets"
    # Optional ISO timestamp; if unset, backend reads ``evalscope_engine_updated_at`` file (Docker build).
    EVALSCOPE_ENGINE_UPDATED_AT: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
