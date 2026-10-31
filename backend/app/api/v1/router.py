from fastapi import APIRouter
from app.api.v1.endpoints import (
    research,
    sources,
    requirements,
    claims,
    findings,
    evidence,
    blindspots,
    verification,
    reports,
)

api_router = APIRouter()

# 1. Research
api_router.include_router(research.router)

# 2. Sources
api_router.include_router(sources.router)

# 3. Requirements
api_router.include_router(requirements.router)

# 4. Claims
api_router.include_router(claims.router)

# 5. Findings
api_router.include_router(findings.router)

# 6. Evidence
api_router.include_router(evidence.router)

# 7. Blindspots
api_router.include_router(blindspots.router)

# 8. Verification
api_router.include_router(verification.router)

# 9. Reports
api_router.include_router(reports.router)
