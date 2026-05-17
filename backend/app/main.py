from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting application...")
    from app.db.session import SessionLocal
    from app.crud import crud_platform_setting

    db = SessionLocal()
    try:
        ldap = crud_platform_setting.get_ldap_settings(db)
        if ldap.enabled:
            logger.info("LDAP authentication is enabled (configured in platform settings)")
        else:
            logger.info("LDAP authentication is disabled")
    finally:
        db.close()

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)
