from typing import Optional, Dict, Any
from .base import CheckResult
from ..config import settings

def check_speaking_pace(
    reference: str,
    duration_s: float,
    pace_min: float = 1.8,
    pace_max: float = 4.0
) -> Optional[CheckResult]:
    """
    Check: PACE_OUT_OF_RANGE
    Reference word count divided by duration. Default band 1.8 to 4.0 words/s.
    Output status: WARN.
    """
    if duration_s <= 0.1:
        return None

    words = reference.strip().split()
    word_count = len(words)
    actual_pace = round(word_count / duration_s, 2)

    if actual_pace < pace_min:
        return CheckResult(
            check_type="PACE_OUT_OF_RANGE",
            status="WARN",
            severity="LOW",
            evidence={
                "pace_wps": actual_pace,
                "pace_min": pace_min,
                "pace_max": pace_max,
                "word_count": word_count,
                "duration_s": duration_s,
                "issue": "TOO_SLOW",
                "explanation": f"Speaking pace of {actual_pace} words/s is below expected minimum {pace_min} words/s."
            }
        )
    elif actual_pace > pace_max:
        return CheckResult(
            check_type="PACE_OUT_OF_RANGE",
            status="WARN",
            severity="MEDIUM",
            evidence={
                "pace_wps": actual_pace,
                "pace_min": pace_min,
                "pace_max": pace_max,
                "word_count": word_count,
                "duration_s": duration_s,
                "issue": "TOO_FAST",
                "explanation": f"Speaking pace of {actual_pace} words/s is above expected maximum {pace_max} words/s."
            }
        )

    return None
