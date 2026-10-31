from fastapi import APIRouter
from app.api.v1.endpoints import (
    research,
    sources,
    requirements,
    findings,
    evidence,
    blindspots,
    reports,
)

api_router = APIRouter()
api_router.include_router(research.router)
api_router.include_router(sources.router)
api_router.include_router(requirements.router)
api_router.include_router(findings.router)
api_router.include_router(evidence.router)
api_router.include_router(blindspots.router)
api_router.include_router(reports.router)
