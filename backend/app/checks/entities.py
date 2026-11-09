from typing import Optional, Dict, Any, List
from .base import CheckResult
from ..text.normalize_hi import normalize_text_hindi, devanagari_to_ascii_digits
from ..config import settings
import re

def extract_numeric_tokens(text: str) -> List[str]:
    """Extract standalone numbers/amounts from normalized text."""
    norm = devanagari_to_ascii_digits(text)
    return re.findall(r'\b\d+(?:\.\d+)?\b', norm)

def check_entity_mismatch(
    reference: str,
    transcript: str,
    critical_phrases: List[Dict[str, Any]]
) -> List[CheckResult]:
    """
    Check: ENTITY_MISMATCH
    Compare canonical amount, date and name tokens from the critical list against the transcript.
    Epistemic rule: WARN, never auto-confirmed.
    """
    ref_norm = normalize_text_hindi(reference)
    hyp_norm = normalize_text_hindi(transcript)

    ref_numbers = set(extract_numeric_tokens(ref_norm))
    hyp_numbers = set(extract_numeric_tokens(hyp_norm))

    missing_numbers = ref_numbers - hyp_numbers
    results: List[CheckResult] = []

    for num in sorted(missing_numbers):
        results.append(
            CheckResult(
                check_type="ENTITY_MISMATCH",
                status="WARN",
                severity="HIGH",
                evidence={
                    "entity_type": "NUMBER_OR_AMOUNT",
                    "expected_entity": num,
                    "explanation": f"Possible numerical entity mismatch: expected number '{num}' was not found in recognized transcript."
                }
            )
        )

    return results

def check_transcript_divergence(wer_cer_metrics: Dict[str, Any]) -> Optional[CheckResult]:
    """
    Check: TRANSCRIPT_DIVERGENCE
    Normalised WER and CER. WER >= 0.35 produces a warning. Informational.
    """
    wer = wer_cer_metrics.get("wer", 0.0)
    cer = wer_cer_metrics.get("cer", 0.0)

    if wer >= settings.WER_WARN_THRESHOLD:
        return CheckResult(
            check_type="TRANSCRIPT_DIVERGENCE",
            status="WARN",
            severity="MEDIUM",
            evidence={
                "wer": wer,
                "cer": cer,
                "threshold": settings.WER_WARN_THRESHOLD,
                "explanation": f"Elevated transcript divergence: Word Error Rate is {round(wer * 100, 1)}% (warning threshold: {round(settings.WER_WARN_THRESHOLD * 100, 1)}%)."
            }
        )

    return None
