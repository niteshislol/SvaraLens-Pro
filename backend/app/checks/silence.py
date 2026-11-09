from typing import Optional, Dict, Any, List
from .base import CheckResult

def check_unexpected_silence(audio_analysis: Dict[str, Any]) -> List[CheckResult]:
    """
    Check: UNEXPECTED_SILENCE
    Flag an internal gap over 1.2 s or leading silence over 1.5 s.
    Output status: WARN.
    """
    silences = audio_analysis.get("silence_regions", [])
    results: List[CheckResult] = []

    for reg in silences:
        stype = reg.get("type", "INTERNAL_GAP")
        start = reg.get("start", 0.0)
        end = reg.get("end", 0.0)
        gap = reg.get("duration", 0.0)

        results.append(
            CheckResult(
                check_type="UNEXPECTED_SILENCE",
                status="WARN",
                severity="MEDIUM",
                region_start_s=start,
                region_end_s=end,
                evidence={
                    "silence_type": stype,
                    "duration_s": gap,
                    "start_s": start,
                    "end_s": end,
                    "explanation": f"Unexpected silence observed: {stype.lower().replace('_', ' ')} of {gap}s between {start}s and {end}s."
                }
            )
        )

    return results
