import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.security import create_access_token

client = TestClient(app)
client.headers["Authorization"] = f"Bearer {create_access_token({'sub': 'admin', 'role': 'ADMIN', 'org_id': 'org-default'})}"

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["timbre_model"] == "timbre-v2.5"
    assert data["prisma_model"] == "prisma-v2.5"

def test_primary_loop_end_to_end():
    # 0. Clean up existing TC-014 if present from previous run
    check_existing = client.get("/api/cases/TC-014")
    if check_existing.status_code == 200:
        client.delete("/api/cases/TC-014")

    # 1. Create a seeded suite and test case TC-014 (Premium Reminder)
    case_payload = {
        "id": "TC-014",
        "suite_id": "suite-insurance-hi",
        "scenario": "Insurance premium reminder",
        "language": "hi-IN",
        "reference_text": "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।",
        "critical_phrases": [
            {"text": "₹4,250", "variants": ["4,250", "4250"], "severity": "HIGH"},
            {"text": "12 नवंबर", "variants": ["12 november"], "severity": "HIGH"},
            {"text": "विलंब शुल्क", "variants": ["late fee", "late charge"], "severity": "CRITICAL"}
        ],
        "voice": "ananya",
        "speed": 1.0,
        "channel": "standard",
        "severity": "CRITICAL",
        "is_synthetic": 1
    }
    r = client.post("/api/cases", json=case_payload)
    assert r.status_code == 201

    # 2. Run Timbre generation with injected truncation fault
    gen_res = client.post("/api/cases/TC-014/runs/generate?injected_fault=END_TRUNCATION")
    assert gen_res.status_code == 200
    run_id = gen_res.json()["run_id"]
    assert gen_res.json()["findings_count"] >= 1

    # 3. Inspect Run Analysis
    run_res = client.get(f"/api/runs/{run_id}")
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["source"] in ("MOCK_FIXTURE", "TIMBRE_LIVE")
    assert len(run_data["findings"]) > 0

    # Locate the truncation finding
    trunc_finding = None
    for f in run_data["findings"]:
        if f["check_type"] in ("END_TRUNCATION_SUSPECTED", "CRITICAL_PHRASE_MISSING"):
            trunc_finding = f
            break
    assert trunc_finding is not None
    finding_id = trunc_finding["id"]

    # 4. Human Reviewer confirms the defect in Review Studio
    patch_res = client.patch(f"/api/findings/{finding_id}", json={
        "review_state": "HUMAN_CONFIRMED",
        "severity": "CRITICAL",
        "reviewer_note": "Mandatory final disclosure not audible in the generated clip.",
        "reviewed_by": "Senior QA Consultant",
        "region_start_s": 3.2,
        "region_end_s": 4.1
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["review_state"] == "HUMAN_CONFIRMED"

    # 5. Compile Defect Capsule (one-click)
    capsule_res = client.post(f"/api/findings/{finding_id}/capsule")
    assert capsule_res.status_code == 201
    capsule_data = capsule_res.json()
    capsule_id = capsule_data["id"]
    assert capsule_id.startswith("SL-")
    assert capsule_data["state"] == "OPEN"
    assert "A1" in [a["id"] for a in capsule_data["spec"]["assertions"]]

    # 6. Rerun regression with corrected audio (generate=true)
    rerun_res = client.post(f"/api/capsules/{capsule_id}/rerun", data={"generate": "true"})
    assert rerun_res.status_code == 200
    rr_data = rerun_res.json()
    rr_id = rr_data["id"]
    # Because human signoff A3 is pending, verdict should be NEEDS_REVIEW
    assert rr_data["verdict"] == "NEEDS_REVIEW"

    # 7. Reviewer approves fix
    approve_res = client.post(f"/api/capsules/{capsule_id}/rerun/{rr_id}/approve", json={
        "approved_by": "QA Delivery Lead"
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["verdict"] == "RESOLVED"

    # Verify capsule state is now RESOLVED
    capsule_get = client.get(f"/api/capsules/{capsule_id}")
    assert capsule_get.json()["state"] == "RESOLVED"

    # 8. Verify Suite Summary
    summary_res = client.get("/api/suites/suite-insurance-hi/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["resolved_capsules"] >= 1
