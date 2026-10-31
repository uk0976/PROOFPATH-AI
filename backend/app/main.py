import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.session import engine, Base, SessionLocal
from app.api.v1.router import api_router
from app.models import ResearchSession
from app.utils.mock_data import seed_demo_investigation
from app.core.exceptions import register_exception_handlers
from app.core.middleware import RequestLoggingMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("proofpath")


def ensure_database_schema(eng):
    try:
        with eng.connect() as conn:
            cursor = conn.connection.cursor()
            cursor.execute("PRAGMA table_info(requirements)")
            cols = {row[1] for row in cursor.fetchall()}
            new_cols = [
                ("question", "TEXT"),
                ("description", "TEXT"),
                ("importance", "VARCHAR(50) DEFAULT 'high'"),
                ("priority", "VARCHAR(50) DEFAULT 'P1'"),
                ("is_decision_critical", "BOOLEAN DEFAULT 0"),
                ("origin", "VARCHAR(50) DEFAULT 'ai_suggested'"),
                ("is_approved", "BOOLEAN DEFAULT 0"),
            ]
            for col_name, col_type in new_cols:
                if col_name not in cols:
                    cursor.execute(f"ALTER TABLE requirements ADD COLUMN {col_name} {col_type}")

            # Check and update sources table
            cursor.execute("PRAGMA table_info(sources)")
            source_cols = {row[1] for row in cursor.fetchall()}
            source_new_cols = [
                ("domain", "VARCHAR(255)"),
                ("last_modified_date", "DATETIME"),
                ("extraction_timestamp", "DATETIME"),
                ("processing_status", "VARCHAR(50) DEFAULT 'processed'"),
                ("error_details", "TEXT"),
                ("content_hash", "VARCHAR(64)"),
                ("word_count", "INTEGER DEFAULT 0"),
                ("char_count", "INTEGER DEFAULT 0"),
            ]
            for col_name, col_type in source_new_cols:
                if col_name not in source_cols:
                    cursor.execute(f"ALTER TABLE sources ADD COLUMN {col_name} {col_type}")

            conn.connection.commit()
    except Exception as e:
        logger.warning(f"Schema migration check: {e}")

# Run schema migrations on import
ensure_database_schema(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database tables & apply schema upgrades
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    ensure_database_schema(engine)

    # 2. Seed initial demo data if database is empty
    db = SessionLocal()
    try:
        count = db.query(ResearchSession).count()
        if count == 0:
            logger.info("Database empty. Seeding enterprise demo investigation...")
            demo_id = seed_demo_investigation(db)
            logger.info(f"Demo investigation seeded with ID: {demo_id}")
    except Exception as e:
        logger.warning(f"Demo seed skipped or failed: {e}")
    finally:
        db.close()

    yield

    logger.info("Shutting down ProofPath AI Backend.")


app = FastAPI(
    title="PROOFPATH AI — Forensic Intelligence API",
    description="""
## Forensic Information Intelligence Platform Backend
Investigates information from multiple sources and discovers:
- Missing information & unaddressed criteria
- Incomplete claims lacking critical parameters
- Cross-source contradictory claims & divergent benchmarks
- Potentially outdated information & temporal decay
- Unverified claims lacking empirical evidence
- BlindSpot questions the user forgot to ask

Strictly grounded in anti-hallucination quote validation.
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# 1. Register Custom Exception Handlers
register_exception_handlers(app)

# 2. Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 3. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Mount API v1 Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "version": "2.0.0",
        "database": "connected",
        "docs": "/docs"
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "Know what's missing before you decide.",
        "api_docs": "/docs",
        "redoc": "/redoc",
        "health": "/health"
    }
