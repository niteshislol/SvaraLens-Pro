from typing import Optional, Dict, Any
from .base import CheckResult
from ..text.compare import evaluate_last_sentence_match

def check_end_truncation(
    reference: str,
    transcript: str,
    audio_analysis: Dict[str, Any]
) -> Optional[CheckResult]:
    """
    Check: END_TRUNCATION_SUSPECTED
    Split reference into sentences. If the last sentence best-match score is below 60
    and transcript length ratio is below 0.85, it is a candidate.
    Corroborate with audio: RMS of the last 150 ms above -40 dBFS and no fade-out
    (tail energy at least 50% of median energy).
    Both signals present = high confidence SUSPECTED finding.
    """
    text_eval = evaluate_last_sentence_match(reference, transcript)
    is_text_candidate = text_eval["is_text_truncation_candidate"]

    tail_info = audio_analysis.get("tail_analysis", {})
    is_audio_candidate = tail_info.get("abrupt_end", False)

    duration_s = audio_analysis.get("duration_s", 0.0)

    if is_text_candidate or is_audio_candidate:
        confidence = "HIGH" if (is_text_candidate and is_audio_candidate) else "MEDIUM"
        severity = "CRITICAL" if confidence == "HIGH" else "HIGH"

        # Highlight failing region at the end of the audio (e.g. final 1.5 seconds)
        region_start = max(0.0, round(duration_s - 1.5, 2))
        region_end = round(duration_s, 2)

        return CheckResult(
            check_type="END_TRUNCATION_SUSPECTED",
            status="SUSPECTED",
            severity=severity,
            region_start_s=region_start,
            region_end_s=region_end,
            evidence={
                "confidence": confidence,
                "text_candidate": is_text_candidate,
                "audio_candidate": is_audio_candidate,
                "missing_last_sentence": text_eval["last_sentence"],
                "last_sentence_match_score": text_eval["match_score"],
                "transcript_length_ratio": text_eval["transcript_length_ratio"],
                "tail_rms_dbfs": tail_info.get("tail_rms_dbfs"),
                "tail_energy_ratio": tail_info.get("tail_energy_ratio"),
                "duration_s": duration_s,
                "explanation": (
                    f"Possible end-of-speech truncation ({confidence.lower()} confidence). "
                    f"Last sentence '{text_eval['last_sentence']}' was not audible in recognized transcript "
                    f"(match: {text_eval['match_score']}%, length ratio: {text_eval['transcript_length_ratio']}), "
                    f"and audio terminated {'abruptly without fade-out' if is_audio_candidate else 'normally'}."
                )
            }
        )

    return None
