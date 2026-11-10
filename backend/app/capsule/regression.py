"""Thin adapter between the API layer and the pure fail-closed engine in assertion_engine.py.
All verdict logic lives in assertion_engine.py (unit-tested without DB/provider dependencies)."""
from typing import Dict, Any, List, Tuple, Optional
from ..text.compare import match_single_phrase, evaluate_last_sentence_match
from ..text.normalize_hi import normalize_text_hindi
from .assertion_engine import Evidence, run_regression


def evaluate_capsule_assertions(
    capsule_spec: Dict[str, Any],
    new_run,
    new_metrics: Dict[str, Any],
    new_findings: List[Any],
    approved_by_reviewer: bool = False,       # DEPRECATED: a bool is not an identity; ignored
    signed_off_by: Optional[str] = None,      # authenticated reviewer id (None until sign-off)
    asr_status: Optional[str] = None,
) -> Tuple[str, List[Dict[str, Any]]]:
    transcript = new_run.transcript_text or ""
    if asr_status is None:
        asr_status = "SUCCESS" if transcript.strip() else "FAILED"   # empty transcript is never a success
    if signed_off_by is None and approved_by_reviewer:
        signed_off_by = "reviewer"
    reference = capsule_spec.get("reference_text", "")
    variants = {cp.get("text"): cp.get("variants", []) for cp in capsule_spec.get("critical_phrases", [])}
    metrics = dict(new_metrics or {})
    if "analysis_ok" not in metrics:
        if any(k in metrics for k in ("clip_ratio", "silence_regions_count", "pace_wps", "duration_s")):
            metrics["analysis_ok"] = True

    ev = Evidence(
        transcript=transcript, asr_status=asr_status, metrics=metrics,
        reference_text=reference, phrase_matcher=match_single_phrase, normalizer=normalize_text_hindi,
        last_sentence_eval=evaluate_last_sentence_match(reference, transcript) if transcript.strip() else None,
        phrase_variants=variants, human_signoff_by=signed_off_by,
        new_findings=[f.check_type if hasattr(f, "check_type") else f.get("check_type") for f in new_findings],
    )
    return run_regression(capsule_spec, ev)
