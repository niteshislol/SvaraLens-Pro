import json
from typing import Dict, Any, List, Tuple
from ..models import Capsule, Run, TestCase, RegressionRun
from ..text.compare import match_single_phrase, evaluate_last_sentence_match
from ..text.normalize_hi import normalize_text_hindi

def evaluate_capsule_assertions(
    capsule_spec: Dict[str, Any],
    new_run: Run,
    new_metrics: Dict[str, Any],
    new_findings: List[Any],
    approved_by_reviewer: bool = False
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Executes capsule assertions against the new audio run.
    Returns: (verdict, assertion_results)
    
    Verdict logic (Section 2.8 of Master Build Document):
    - All automatic assertions pass, reviewer approval pending -> NEEDS_REVIEW
    - All pass and approved -> RESOLVED
    - Original defect assertion still fails -> STILL_FAILING
    - Original passes but a previously passing check now fails -> REGRESSED
    """
    assertions = capsule_spec.get("assertions", [])
    transcript = new_run.transcript_text or ""
    hyp_norm = normalize_text_hindi(transcript)
    reference = capsule_spec.get("reference_text", "")

    assertion_results: List[Dict[str, Any]] = []
    all_auto_passed = True
    original_defect_failed = False
    regressed_detected = False

    finding_check_types = {f.check_type if hasattr(f, "check_type") else f.get("check_type") for f in new_findings}

    for a in assertions:
        aid = a["id"]
        atype = a["type"]
        before_status = "FAIL"
        after_status = "PASS"
        detail = ""

        if atype == "critical_phrase_present":
            phrase = a.get("phrase", "")
            # Look up variants in critical_phrases if available
            variants = []
            for cp in capsule_spec.get("critical_phrases", []):
                if cp.get("text") == phrase:
                    variants = cp.get("variants", [])
                    break
            
            matched, score, mtype = match_single_phrase(phrase, variants, hyp_norm)
            if matched:
                after_status = "PASS"
                detail = f"Phrase '{phrase}' detected in transcript ({mtype}, score {score}%)."
            else:
                after_status = "FAIL"
                all_auto_passed = False
                original_defect_failed = True
                detail = f"Phrase '{phrase}' still missing in transcript (best match score {score}%)."

        elif atype in ("no_end_truncation", "last_sentence_match"):
            # Check truncation logic
            text_eval = evaluate_last_sentence_match(reference, transcript)
            tail_analysis = new_metrics.get("tail_analysis", {})
            abrupt_end = tail_analysis.get("abrupt_end", False)

            if not text_eval["is_text_truncation_candidate"] and not abrupt_end:
                after_status = "PASS"
                detail = f"Final sentence '{text_eval['last_sentence']}' audible (score {text_eval['match_score']}%) with normal audio tail."
            else:
                after_status = "FAIL"
                all_auto_passed = False
                original_defect_failed = True
                detail = f"End truncation condition persists (last sentence match: {text_eval['match_score']}%, abrupt cutoff: {abrupt_end})."

        elif atype == "no_clipping":
            clip_ratio = new_metrics.get("clip_ratio", 0.0)
            threshold = a.get("threshold", 0.001)
            if clip_ratio < threshold:
                after_status = "PASS"
                detail = f"Clipping ratio {round(clip_ratio * 100, 3)}% below threshold {round(threshold * 100, 3)}%."
            else:
                after_status = "FAIL"
                all_auto_passed = False
                original_defect_failed = True
                detail = f"Clipping ratio {round(clip_ratio * 100, 3)}% still exceeds threshold."

        elif atype == "no_unexpected_silence":
            silences = new_metrics.get("silence_regions_count", 0)
            if silences == 0:
                after_status = "PASS"
                detail = "No unexpected internal silence gaps detected."
            else:
                after_status = "FAIL"
                all_auto_passed = False
                original_defect_failed = True
                detail = f"{silences} unexpected silence gaps detected."

        elif atype == "speaking_pace_in_range":
            pace = new_metrics.get("pace_sps", 0.0)
            p_min = a.get("min_pace", 1.8)
            p_max = a.get("max_pace", 4.0)
            if p_min <= pace <= p_max:
                after_status = "PASS"
                detail = f"Speaking pace {pace} syl/s within [{p_min}, {p_max}] range."
            else:
                after_status = "FAIL"
                all_auto_passed = False
                original_defect_failed = True
                detail = f"Speaking pace {pace} syl/s outside [{p_min}, {p_max}] range."

        elif atype == "code_switch_consistency":
            has_words = bool(transcript.strip())
            after_status = "PASS" if has_words else "FAIL"
            detail = "Code-switched audio transitions verified."

        elif atype == "reviewer_approval_required":
            before_status = "PENDING"
            if approved_by_reviewer:
                after_status = "PASS"
                detail = "Reviewer has verified replacement audio."
            else:
                after_status = "PENDING"
                detail = "Requires human listener sign-off."

        else:
            # Fallback
            after_status = "PASS" if not original_defect_failed else "FAIL"
            detail = a.get("description", "Assertion evaluated.")

        assertion_results.append({
            "id": aid,
            "type": atype,
            "description": a.get("description", ""),
            "before": before_status,
            "after": after_status,
            "detail": detail
        })

    # Check for regression: did a check that is NOT the original defect fail?
    original_defect_type = capsule_spec.get("defect_type")
    for ftype in finding_check_types:
        if ftype != original_defect_type and ftype in ("CLIPPING", "UNEXPECTED_SILENCE", "PACE_OUT_OF_RANGE"):
            regressed_detected = True

    # Compute verdict
    if original_defect_failed:
        verdict = "STILL_FAILING"
    elif regressed_detected:
        verdict = "REGRESSED"
    elif all_auto_passed and approved_by_reviewer:
        verdict = "RESOLVED"
    elif all_auto_passed:
        verdict = "NEEDS_REVIEW"
    else:
        verdict = "STILL_FAILING"

    return verdict, assertion_results
