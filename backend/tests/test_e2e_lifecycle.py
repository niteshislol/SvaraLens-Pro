import pytest
import json
from fastapi.testclient import TestClient
from app.main import app
from app.auth.security import create_access_token

client = TestClient(app)
client.headers["Authorization"] = f"Bearer {create_access_token({'sub': 'admin', 'role': 'ADMIN', 'org_id': 'org-default'})}"

def test_full_15_step_defect_to_regression_lifecycle():
    """
    Master E2E Lifecycle Test implementing the complete 15-step verification workflow
    per Section 22.D of Master Build Document.
    """
    # -------------------------------------------------------------------------
    # Step 1: Select test case TC-014
    # -------------------------------------------------------------------------
    case_res = client.get("/api/cases/TC-014")
    assert case_res.status_code == 200, "Step 1 Failed: TC-014 not found"
    case_data = case_res.json()
    assert case_data["id"] == "TC-014"

    # -------------------------------------------------------------------------
    # Step 2 & 3 & 4: Generate speech with controlled END_TRUNCATION fault,
    # execute Dual-ASR Jury, and compute acoustic DSP metrics.
    # -------------------------------------------------------------------------
    gen_res = client.post("/api/cases/TC-014/runs/generate?injected_fault=END_TRUNCATION")
    assert gen_res.status_code == 200, "Step 2-4 Failed: Synthesis failed"
    gen_data = gen_res.json()
    run_id = gen_data["run_id"]
    assert gen_data["findings_count"] >= 1

    run_detail = client.get(f"/api/runs/{run_id}").json()
    assert run_detail["duration_s"] > 0.0
    assert run_detail["stt_dual_results"] is not None

    # -------------------------------------------------------------------------
    # Step 5: Identify the controlled defect finding (END_TRUNCATION / critical phrase)
    # -------------------------------------------------------------------------
    findings = run_detail["findings"]
    failing_finding = next((f for f in findings if f["status"] in ("FAIL", "SUSPECTED")), None)
    assert failing_finding is not None, "Step 5 Failed: No defect finding identified"
    finding_id = failing_finding["id"]

    # -------------------------------------------------------------------------
    # Step 6: Review and confirm the finding as human reviewer
    # -------------------------------------------------------------------------
    confirm_res = client.patch(f"/api/findings/{finding_id}", json={
        "review_state": "HUMAN_CONFIRMED",
        "reviewer_note": "Verified end truncation: mandatory late charge disclosure omitted in audio.",
        "reviewed_by": "Senior QA Lead Hindi"
    })
    assert confirm_res.status_code == 200, "Step 6 Failed: Finding review confirmation failed"
    assert confirm_res.json()["review_state"] == "HUMAN_CONFIRMED"

    # -------------------------------------------------------------------------
    # Step 7: Add a timestamped Defect Pin anchored to the waveform
    # -------------------------------------------------------------------------
    pin_payload = {
        "timestamp_start_s": 3.20,
        "timestamp_end_s": 4.80,
        "category": "END_TRUNCATION",
        "severity": "CRITICAL",
        "note": "Abrupt audio energy cutoff before final disclosure sentence"
    }
    pin_res = client.post(f"/api/runs/{run_id}/pins", json=pin_payload)
    assert pin_res.status_code == 200, "Step 7 Failed: Defect pin failed to attach"
    pins = pin_res.json()["defect_pins"]
    assert len(pins) >= 1

    # -------------------------------------------------------------------------
    # Step 8: Compile the Voice Defect Capsule
    # -------------------------------------------------------------------------
    cap_res = client.post(f"/api/findings/{finding_id}/capsule")
    assert cap_res.status_code == 201, "Step 8 Failed: Capsule compilation failed"
    capsule = cap_res.json()
    capsule_id = capsule["id"]
    assert capsule["state"] == "OPEN"
    assert capsule["failing_audio_sha256"].startswith("sha256:")

    # -------------------------------------------------------------------------
    # Step 9: Verify original evidence SHA-256 byte digest integrity
    # -------------------------------------------------------------------------
    val_res = client.get(f"/api/capsules/{capsule_id}/validate")
    assert val_res.status_code == 200, "Step 9 Failed: Hash validation call failed"
    val_data = val_res.json()
    assert val_data["valid"] is True, "Step 9 Failed: SHA-256 digest does not match file bytes"

    # -------------------------------------------------------------------------
    # Step 10 & 11: Rerun regression with replacement audio (fixed speech)
    # -------------------------------------------------------------------------
    reg_res = client.post(f"/api/capsules/{capsule_id}/rerun", data={"generate": "true"})
    assert reg_res.status_code == 200, "Step 10-11 Failed: Regression replay failed"
    reg_data = reg_res.json()
    regression_run_id = reg_data["id"]
    assertions = reg_data["assertion_results"]
    assert len(assertions) >= 2

    # -------------------------------------------------------------------------
    # Step 12: Compare Before/After results: Automated assertions pass, verdict is NEEDS_REVIEW
    # -------------------------------------------------------------------------
    assert reg_data["verdict"] == "NEEDS_REVIEW", f"Expected NEEDS_REVIEW, got {reg_data['verdict']}"
    # Check that automated assertions have after == PASS
    auto_assertions = [a for a in assertions if a["type"] != "reviewer_approval_required"]
    for a in auto_assertions:
        assert a["after"] == "PASS", f"Automated assertion {a['id']} failed after replacement"

    # -------------------------------------------------------------------------
    # Step 13: Complete Human QA Lead Approval
    # -------------------------------------------------------------------------
    approve_res = client.post(f"/api/capsules/{capsule_id}/rerun/{regression_run_id}/approve", json={
        "approved_by": "Senior QA Lead Hindi"
    })
    assert approve_res.status_code == 200, "Step 13 Failed: Human approval failed"
    approved_reg = approve_res.json()
    assert approved_reg["verdict"] == "RESOLVED"

    # -------------------------------------------------------------------------
    # Step 14: Verify Capsule state is elevated to RESOLVED
    # -------------------------------------------------------------------------
    cap_final = client.get(f"/api/capsules/{capsule_id}").json()
    assert cap_final["state"] == "RESOLVED", "Step 14 Failed: Capsule state not RESOLVED"

    # -------------------------------------------------------------------------
    # Step 15: Export Suite QA Dossier (HTML & CSV & JSON)
    # -------------------------------------------------------------------------
    html_res = client.get("/api/exports/report/suite-insurance-hi.html")
    assert html_res.status_code == 200, "Step 15 Failed: HTML report export failed"
    assert "SvaraLens" in html_res.text
    assert "RESOLVED" in html_res.text

    csv_res = client.get("/api/exports/suite/suite-insurance-hi.csv")
    assert csv_res.status_code == 200

    analytics_res = client.get("/api/analytics/suite/suite-insurance-hi")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["total_scenarios"] >= 30
    assert analytics_data["resolved_capsules_count"] >= 1
