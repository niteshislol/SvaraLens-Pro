from typing import List, Dict, Any, Optional
from .base import CheckResult
from ..text.compare import match_single_phrase
from ..text.normalize_hi import normalize_text_hindi
from ..config import settings

def check_critical_phrases(
    critical_phrases: List[Dict[str, Any]],
    transcript: str
) -> List[CheckResult]:
    """
    Check: CRITICAL_PHRASE_MISSING
    Per phrase: exact normalised match, then variants, then rapidfuzz partial_ratio >= 85.
    No match produces a finding FAIL (auto), severity from the phrase.
    """
    hyp_norm = normalize_text_hindi(transcript)
    results: List[CheckResult] = []

    for phrase_obj in critical_phrases:
        phrase_text = phrase_obj.get("text", "")
        variants = phrase_obj.get("variants", [])
        severity = phrase_obj.get("severity", "HIGH")

        matched, score, match_type = match_single_phrase(
            phrase_text,
            variants,
            hyp_norm,
            min_ratio=settings.PHRASE_RAPIDFUZZ_MIN_RATIO
        )

        if not matched:
            results.append(
                CheckResult(
                    check_type="CRITICAL_PHRASE_MISSING",
                    status="FAIL",
                    severity=severity,
                    evidence={
                        "phrase": phrase_text,
                        "variants": variants,
                        "best_match_score": score,
                        "normalized_transcript": hyp_norm,
                        "explanation": f"Required critical phrase '{phrase_text}' was not detected in recognized transcript (best match score: {score}%)."
                    }
                )
            )

    return results
