import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.session import engine, Base, SessionLocal
from app.api.v1.router import api_router
from app.models import ResearchSession
from app.utils.mock_data import seed_demo_investigation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("proofpath")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure DB tables exist
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # 2. Seed initial demo data if empty
    db = SessionLocal()
    try:
        count = db.query(ResearchSession).count()
        if count == 0:
            logger.info("Database empty. Seeding realistic enterprise demo investigation...")
            demo_id = seed_demo_investigation(db)
            logger.info(f"Demo investigation seeded with ID: {demo_id}")
    except Exception as e:
        logger.warning(f"Demo seed skipped or failed: {e}")
    finally:
        db.close()

    yield

    logger.info("Shutting down ProofPath AI Backend.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Forensic Information Intelligence Platform — Know what's missing before you decide.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "version": "2.0.0"
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "Know what's missing before you decide.",
        "api_docs": "/docs",
        "health": "/health"
    }
