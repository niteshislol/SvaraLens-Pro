import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from pathlib import Path
from ..models import Finding, TestCase, Run, Capsule
from ..schemas import CapsuleSpec, CapsuleAssertion

def compute_sha256(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return f"sha256:{h.hexdigest()}"

def build_assertions_for_defect(defect_type: str, finding_evidence: Dict[str, Any], test_case: TestCase) -> List[Dict[str, Any]]:
    """
    Assertions come from a fixed mapping defect_type -> assertion templates.
    No free-form generation (per Section 2.7).
    """
    assertions = []

    if defect_type in ("END_TRUNCATION", "END_TRUNCATION_SUSPECTED"):
        last_sent = finding_evidence.get("missing_last_sentence", "")
        if last_sent:
            assertions.append({
                "id": "A1",
                "type": "critical_phrase_present",
                "phrase": last_sent,
                "description": f"Mandatory final sentence '{last_sent}' must be audible in transcript."
            })
        else:
            assertions.append({
                "id": "A1",
                "type": "last_sentence_match",
                "threshold": 60.0,
                "description": "Last sentence best match score must exceed 60%."
            })
        assertions.append({
            "id": "A2",
            "type": "no_end_truncation",
            "description": "Audio must not terminate abruptly without fade-out."
        })
        assertions.append({
            "id": "A3",
            "type": "reviewer_approval_required",
            "description": "QA reviewer must listen to replacement audio and approve natural delivery."
        })

    elif defect_type == "CRITICAL_PHRASE_MISSING":
        phrase = finding_evidence.get("phrase", "")
        assertions.append({
            "id": "A1",
            "type": "critical_phrase_present",
            "phrase": phrase,
            "description": f"Critical phrase '{phrase}' must be present in transcript."
        })
        assertions.append({
            "id": "A2",
            "type": "reviewer_approval_required",
            "description": "QA reviewer must verify accurate pronunciation."
        })

    elif defect_type == "CLIPPING":
        assertions.append({
            "id": "A1",
            "type": "no_clipping",
            "threshold": 0.001,
            "description": "Audio sample clipping fraction must be below 0.1%."
        })
        assertions.append({
            "id": "A2",
            "type": "reviewer_approval_required",
            "description": "QA reviewer must confirm clear audio free of digital distortion."
        })

    elif defect_type == "UNEXPECTED_SILENCE":
        assertions.append({
            "id": "A1",
            "type": "no_unexpected_silence",
            "description": "Audio must contain no internal silence gaps > 1.2s or leading silence > 1.5s."
        })
        assertions.append({
            "id": "A2",
            "type": "reviewer_approval_required",
            "description": "QA reviewer must confirm natural conversational pacing."
        })

    else:
        assertions.append({
            "id": "A1",
            "type": "general_defect_fixed",
            "description": f"Defect condition '{defect_type}' must be resolved."
        })
        assertions.append({
            "id": "A2",
            "type": "reviewer_approval_required",
            "description": "QA reviewer must inspect and approve replacement audio."
        })

    return assertions

def compile_defect_capsule(
    capsule_id: str,
    finding: Finding,
    run: Run,
    test_case: TestCase
) -> Dict[str, Any]:
    """
    Compiles an immutable defect capsule record with regression specification.
    """
    evidence = json.loads(finding.evidence_json) if isinstance(finding.evidence_json, str) else finding.evidence_json
    critical_phrases = json.loads(test_case.critical_phrases_json) if isinstance(test_case.critical_phrases_json, str) else test_case.critical_phrases_json

    audio_hash = run.audio_sha256 or (compute_sha256(run.audio_path) if run.audio_path else "sha256:unknown")
    assertions = build_assertions_for_defect(finding.check_type, evidence, test_case)

    # Determine failing region
    regions = []
    if finding.region_start_s is not None and finding.region_end_s is not None:
        regions.append([finding.region_start_s, finding.region_end_s])

    spec = {
        "capsule_id": capsule_id,
        "case_id": test_case.id,
        "language": test_case.language,
        "defect_type": finding.check_type,
        "severity": finding.severity,
        "review_status": "HUMAN_CONFIRMED",
        "reference_text": test_case.reference_text,
        "critical_phrases": critical_phrases,
        "gnani_models": {
            "tts": "timbre-v2.5",
            "stt": "prisma-v2.5"
        },
        "voice_configuration": {
            "voice": test_case.voice or "ananya",
            "speed": test_case.speed,
            "channel": test_case.channel
        },
        "failing_audio_sha256": audio_hash,
        "transcript_at_failure": run.transcript_text,
        "evidence": {
            "duration_s": run.duration_s,
            "metrics": json.loads(run.metrics_json) if run.metrics_json else {},
            "regions": regions,
            "finding_evidence": evidence
        },
        "assertions": assertions,
        "regression_required": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    return spec
