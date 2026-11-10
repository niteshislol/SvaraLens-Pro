from typing import List, Dict, Any
from .base import CheckResult
from .phrases import check_critical_phrases
from .truncation import check_end_truncation
from .clipping import check_audio_clipping
from .silence import check_unexpected_silence
from .pace import check_speaking_pace
from .entities import check_entity_mismatch, check_transcript_divergence
from ..text.compare import compute_wer_cer

def run_all_checks(
    reference_text: str,
    critical_phrases: List[Dict[str, Any]],
    transcript_text: str,
    audio_analysis: Dict[str, Any],
    pace_min: float = 1.8,
    pace_max: float = 4.0
) -> Dict[str, Any]:
    """
    Executes the 6 automatic checks according to Section 2.6 of Master Build Document:
    1. CRITICAL_PHRASE_MISSING
    2. END_TRUNCATION_SUSPECTED
    3. CLIPPING
    4. UNEXPECTED_SILENCE
    5. PACE_OUT_OF_RANGE
    6. ENTITY_MISMATCH & TRANSCRIPT_DIVERGENCE
    """
    findings: List[CheckResult] = []

    # Text difference metrics
    wer_cer = compute_wer_cer(reference_text, transcript_text)

    # 1. Critical phrases
    findings.extend(check_critical_phrases(critical_phrases, transcript_text))

    # 2. End truncation suspected
    trunc_finding = check_end_truncation(reference_text, transcript_text, audio_analysis)
    if trunc_finding:
        findings.append(trunc_finding)

    # 3. Audio clipping
    clip_finding = check_audio_clipping(audio_analysis)
    if clip_finding:
        findings.append(clip_finding)

    # 4. Unexpected silence
    findings.extend(check_unexpected_silence(audio_analysis))

    # 5. Speaking pace
    pace_finding = check_speaking_pace(
        reference_text,
        audio_analysis.get("duration_s", 0.0),
        pace_min=pace_min,
        pace_max=pace_max
    )
    if pace_finding:
        findings.append(pace_finding)

    # 6. Entity mismatch
    findings.extend(check_entity_mismatch(reference_text, transcript_text, critical_phrases))

    # 7. Transcript divergence (informational WARN)
    div_finding = check_transcript_divergence(wer_cer)
    if div_finding:
        findings.append(div_finding)

    return {
        "findings": findings,
        "metrics": {
            "wer": wer_cer["wer"],
            "cer": wer_cer["cer"],
            "insertions": wer_cer["insertions"],
            "deletions": wer_cer["deletions"],
            "substitutions": wer_cer["substitutions"],
            "analysis_ok": bool(audio_analysis.get("analysis_ok", False)),
            "duration_s": audio_analysis.get("duration_s", 0.0),
            "sample_rate": audio_analysis.get("sample_rate", 16000),
            "peak_db": audio_analysis.get("peak_db", -100.0),
            "clip_ratio": audio_analysis.get("clip_ratio", 0.0),
            "silence_regions_count": len(audio_analysis.get("silence_regions", [])),
            "tail_analysis": audio_analysis.get("tail_analysis", {}),
            "pace_wps": round(len(reference_text.split()) / max(audio_analysis.get("duration_s", 1.0), 0.1), 2)
        }
    }
