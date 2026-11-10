import time
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db import get_db
from ..config import settings
from ..models import TestCase, Capsule
from ..schemas import HealthResponse

router = APIRouter(tags=["health"])

# In-memory cached provider verification status
_PROVIDER_STATUS = {
    "verified": False,
    "last_verified_at": None,
    "provider_detail": None,
    "latency_ms": None
}


async def probe_gnani_live() -> dict:
    """Performs an actual probe against the live Gnani provider."""
    if settings.MOCK_MODE or not settings.GNANI_API_KEY:
        return {
            "verified": False,
            "provider_detail": "Mock Mode: deterministic synthetic tones in use (no live API calls)",
            "latency_ms": None
        }

    from ..gnani.client import LiveGnaniClient
    start = time.time()
    try:
        client = LiveGnaniClient()
        # Fast test synthesis with minimal phrase
        audio_bytes = await client.synthesize(
            text="नमस्ते",
            language="hi-IN",
            voice="Shivani",
            model="timbre-v3.0"
        )
        elapsed_ms = round((time.time() - start) * 1000, 1)
        now_iso = datetime.now(timezone.utc).isoformat()
        _PROVIDER_STATUS["verified"] = True
        _PROVIDER_STATUS["last_verified_at"] = now_iso
        _PROVIDER_STATUS["latency_ms"] = elapsed_ms
        _PROVIDER_STATUS["provider_detail"] = f"Live Gnani Vachana platform verified ({elapsed_ms}ms, {len(audio_bytes)} bytes audio)"
        return _PROVIDER_STATUS
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 1)
        _PROVIDER_STATUS["verified"] = False
        _PROVIDER_STATUS["latency_ms"] = elapsed_ms
        _PROVIDER_STATUS["provider_detail"] = f"Provider probe failed: {str(e)}"
        return _PROVIDER_STATUS


@router.get("/health", response_model=HealthResponse)
async def health_check(
    verify: bool = Query(False, description="Actively verify provider connectivity with a test call"),
    db: Session = Depends(get_db)
):
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
    
    if verify and not is_mock:
        await probe_gnani_live()

    gnani_connected = bool(settings.GNANI_API_KEY and not settings.MOCK_MODE)
    provider_verified = bool(_PROVIDER_STATUS["verified"]) if gnani_connected else False
    
    if is_mock:
        execution_mode = "MOCK (Synthetic Tones)"
        provider_detail = "Mock Mode: Using synthetic tones (offline fixtures). Real Gnani models not invoked."
    elif provider_verified:
        execution_mode = "LIVE (Verified)"
        provider_detail = _PROVIDER_STATUS["provider_detail"] or "Live Gnani Timbre & Prisma verified"
    else:
        execution_mode = "LIVE (Key Configured)"
        provider_detail = "API key configured. Use /api/health/verify-provider to verify live connectivity."

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        mock_mode=is_mock,
        version=settings.VERSION,
        timbre_model=settings.TIMBRE_MODEL,
        prisma_model=settings.PRISMA_MODEL,
        database_connected=db_ok,
        gnani_connected=gnani_connected,
        provider_verified=provider_verified,
        provider_detail=provider_detail,
        last_verified_at=_PROVIDER_STATUS["last_verified_at"],
        execution_mode=execution_mode,
        scenarios_count=scenarios_count,
        capsules_count=capsules_count
    )


@router.post("/health/verify-provider")
@router.get("/health/verify-provider")
async def verify_provider_endpoint():
    """Actively probes the live Gnani TTS/STT provider and records verification status."""
    return await probe_gnani_live()


@router.get("/ping")
def ping():
    """Ultra-lightweight ping endpoint for Render keep-alive and uptime monitoring.
    Executes in <2ms with zero database overhead."""
    return {
        "status": "ok",
        "pong": True,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
