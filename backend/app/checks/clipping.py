from typing import Optional, Dict, Any
from .base import CheckResult
from ..config import settings

def check_audio_clipping(audio_analysis: Dict[str, Any]) -> Optional[CheckResult]:
    """
    Check: CLIPPING
    Fraction of samples with abs >= 0.99 on raw decoded audio.
    Warn at 0.1%, fail at 1%.
    """
    clip_ratio = audio_analysis.get("clip_ratio", 0.0)
    peak_db = audio_analysis.get("peak_db", -100.0)

    if clip_ratio >= settings.CLIPPING_FAIL_FRACTION:
        return CheckResult(
            check_type="CLIPPING",
            status="FAIL",
            severity="HIGH",
            evidence={
                "clip_ratio": clip_ratio,
                "clip_percent": round(clip_ratio * 100, 3),
                "peak_db": peak_db,
                "explanation": f"Acoustic saturation detected: {round(clip_ratio * 100, 3)}% of samples exceeded ±0.99 amplitude threshold (fails >= 1.0%)."
            }
        )
    elif clip_ratio >= settings.CLIPPING_WARN_FRACTION:
        return CheckResult(
            check_type="CLIPPING",
            status="WARN",
            severity="MEDIUM",
            evidence={
                "clip_ratio": clip_ratio,
                "clip_percent": round(clip_ratio * 100, 3),
                "peak_db": peak_db,
                "explanation": f"Mild clipping detected: {round(clip_ratio * 100, 3)}% of samples near saturation threshold (warning >= 0.1%)."
            }
        )

    return None
