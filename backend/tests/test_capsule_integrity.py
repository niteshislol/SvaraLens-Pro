import pytest
import json
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.capsule.compiler import compute_sha256, build_assertions_for_defect
from app.capsule.regression import evaluate_capsule_assertions
from app.models import TestCase as DBTestCase

client = TestClient(app)

def test_sha256_byte_digest_accuracy():
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00")
        tmp_path = f.name

    h = compute_sha256(tmp_path)
    assert h.startswith("sha256:")
    assert len(h) == 71  # "sha256:" + 64 hex chars
    Path(tmp_path).unlink(missing_ok=True)

def test_assertion_generation_10_defect_types():
    dummy_case = DBTestCase(
        id="TC-DUMMY",
        suite_id="suite-insurance-hi",
        scenario="Dummy Case",
        language="hi-IN",
        reference_text="परीक्षण पाठ",
        critical_phrases_json="[]",
        severity="HIGH",
        pace_min=1.8,
        pace_max=4.0
    )

    defect_types = [
        "END_TRUNCATION",
        "CRITICAL_PHRASE_MISSING",
        "AMOUNT_MISPRONUNCIATION",
        "UNNATURAL_CADENCE",
        "CODE_SWITCH_GLITCH",
        "ACOUSTIC_CLIPPING",
        "UNEXPECTED_SILENCE",
        "PRONUNCIATION_ANOMALY",
        "DATE_OR_NUMBER_DISTORTION",
        "OTHER"
    ]

    for dt in defect_types:
        evidence = {
            "phrase": "₹4,250",
            "amount": "₹4,250",
            "number": "12 नवंबर",
            "token": "पॉलिसी",
            "missing_last_sentence": "विलंब शुल्क लग सकता है।"
        }
        assertions = build_assertions_for_defect(dt, evidence, dummy_case)
        assert len(assertions) >= 2, f"Failed for defect {dt}"
        assert any(a["type"] == "reviewer_approval_required" for a in assertions), f"Missing reviewer approval for {dt}"

def test_regression_verdict_logic():
    capsule_spec = {
        "defect_type": "END_TRUNCATION",
        "reference_text": "आपका अगला प्रीमियम देय है। विलंब शुल्क लग सकता है।",
        "assertions": [
            {
                "id": "A1",
                "type": "critical_phrase_present",
                "phrase": "विलंब शुल्क"
            },
            {
                "id": "A2",
                "type": "no_clipping",
                "threshold": 0.001
            },
            {
                "id": "A3",
                "type": "reviewer_approval_required"
            }
        ]
    }

    class MockRun:
        transcript_text = "आपका अगला प्रीमियम देय है। विलंब शुल्क लग सकता है।"

    # Case 1: All auto pass, human pending -> NEEDS_REVIEW
    v1, res1 = evaluate_capsule_assertions(
        capsule_spec=capsule_spec,
        new_run=MockRun(),
        new_metrics={"clip_ratio": 0.0001, "silence_regions_count": 0},
        new_findings=[],
        approved_by_reviewer=False
    )
    assert v1 == "NEEDS_REVIEW"

    # Case 2: All auto pass, human approved -> RESOLVED
    v2, res2 = evaluate_capsule_assertions(
        capsule_spec=capsule_spec,
        new_run=MockRun(),
        new_metrics={"clip_ratio": 0.0001, "silence_regions_count": 0},
        new_findings=[],
        approved_by_reviewer=True
    )
    assert v2 == "RESOLVED"

    # Case 3: Original defect phrase missing -> STILL_FAILING
    class FailingRun:
        transcript_text = "आपका अगला प्रीमियम देय है"

    v3, res3 = evaluate_capsule_assertions(
        capsule_spec=capsule_spec,
        new_run=FailingRun(),
        new_metrics={"clip_ratio": 0.0001, "silence_regions_count": 0},
        new_findings=[],
        approved_by_reviewer=False
    )
    assert v3 == "STILL_FAILING"

def test_capsule_integrity_api_and_export():
    caps = client.get("/api/capsules").json()
    if caps:
        cap_id = caps[0]["id"]
        # Validate integrity
        v_res = client.get(f"/api/capsules/{cap_id}/validate")
        assert v_res.status_code == 200
        val_data = v_res.json()
        assert "valid" in val_data
        assert "expected_sha256" in val_data

        # Export JSON
        exp_res = client.get(f"/api/capsules/{cap_id}/export")
        assert exp_res.status_code == 200
        exp_data = exp_res.json()
        assert exp_data["capsule_id"] == cap_id
        assert "regression_spec" in exp_data
