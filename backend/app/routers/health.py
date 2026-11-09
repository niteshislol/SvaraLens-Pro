from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db import get_db
from ..config import settings
from ..schemas import HealthResponse

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        mock_mode=settings.MOCK_MODE or not bool(settings.GNANI_API_KEY),
        version=settings.VERSION,
        timbre_model=settings.TIMBRE_MODEL,
        prisma_model=settings.PRISMA_MODEL,
        database_connected=db_ok
    )
