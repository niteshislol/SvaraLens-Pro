from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db import get_db
from ..config import settings
from ..models import TestCase, Capsule
from ..schemas import HealthResponse

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_ok = True
    scenarios_count = 0
    capsules_count = 0
    try:
        db.execute(text("SELECT 1"))
        scenarios_count = db.query(TestCase).count()
        capsules_count = db.query(Capsule).count()
    except Exception:
        db_ok = False

    is_mock = settings.MOCK_MODE or not bool(settings.GNANI_API_KEY)
    gnani_connected = bool(settings.GNANI_API_KEY and not settings.MOCK_MODE)
    execution_mode = "MOCK" if is_mock else "LIVE"

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        mock_mode=is_mock,
        version=settings.VERSION,
        timbre_model=settings.TIMBRE_MODEL,
        prisma_model=settings.PRISMA_MODEL,
        database_connected=db_ok,
        gnani_connected=gnani_connected,
        execution_mode=execution_mode,
        scenarios_count=scenarios_count,
        capsules_count=capsules_count
    )
