import pytest
import io
import json
from fastapi.testclient import TestClient
from app.main import app
from app.auth.security import create_access_token

client = TestClient(app)
client.headers["Authorization"] = f"Bearer {create_access_token({'sub': 'admin', 'role': 'ADMIN', 'org_id': 'org-default'})}"

def test_scenario_search_and_filters():
    # 1. Search by scenario text
    res = client.get("/api/cases?search=Maturity")
    assert res.status_code == 200
    cases = res.json()
    assert any("Maturity" in c["scenario"] for c in cases)

    # 2. Filter by language
    res_hi = client.get("/api/cases?language=hi-IN")
    assert res_hi.status_code == 200
    for c in res_hi.json():
        assert c["language"] == "hi-IN"

    res_hing = client.get("/api/cases?language=hinglish")
    assert res_hing.status_code == 200
    for c in res_hing.json():
        assert c["language"] == "hinglish"

    # 3. Filter by severity
    res_crit = client.get("/api/cases?severity=CRITICAL")
    assert res_crit.status_code == 200
    for c in res_crit.json():
        assert c["severity"] == "CRITICAL"

def test_scenario_crud_and_patch():
    # Create test scenario
    case_payload = {
        "id": "TC-TEST-CRUD",
        "suite_id": "suite-insurance-hi",
        "scenario": "Temporary Test Scenario for CRUD",
        "language": "hi-IN",
        "reference_text": "यह एक परीक्षण संदर्भ स्क्रिप्ट है।",
        "critical_phrases": [
            {"text": "परीक्षण", "variants": [], "severity": "HIGH"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "severity": "HIGH"
    }
    r = client.post("/api/cases", json=case_payload)
    assert r.status_code in (200, 201)
    created = r.json()
    assert created["id"] == "TC-TEST-CRUD"

    # Patch scenario
    patch_payload = {
        "scenario": "Updated Test Scenario Title",
        "severity": "CRITICAL"
    }
    r_patch = client.patch("/api/cases/TC-TEST-CRUD", json=patch_payload)
    assert r_patch.status_code == 200
    updated = r_patch.json()
    assert updated["scenario"] == "Updated Test Scenario Title"
    assert updated["severity"] == "CRITICAL"

    # Clean up
    del_res = client.delete("/api/cases/TC-TEST-CRUD?force=true")
    assert del_res.status_code == 200

def test_scenario_duplicate():
    # Duplicate existing case TC-001
    dup_res = client.post("/api/cases/TC-001/duplicate")
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["id"] != "TC-001"
    assert "Copy of" in dup_data["scenario"]

    # Clean up duplicated case
    client.delete(f"/api/cases/{dup_data['id']}?force=true")

def test_scenario_export_formats():
    # Export JSON
    res_json = client.get("/api/cases/export?format=json")
    assert res_json.status_code == 200
    data_json = res_json.json()
    assert isinstance(data_json, list)
    assert len(data_json) >= 20

    # Export CSV
    res_csv = client.get("/api/cases/export?format=csv")
    assert res_csv.status_code == 200
    assert "scenario,language,reference_text" in res_csv.text

def test_csv_import_validation():
    # 1. Invalid header CSV
    bad_csv = "title,content\nInvalid Case,Some Text"
    res_bad = client.post(
        "/api/cases/import-csv",
        files={"file": ("bad.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    )
    assert res_bad.status_code == 200
    summary_bad = res_bad.json()
    assert summary_bad["failed"] >= 1
    assert any("header" in err.lower() for err in summary_bad["failure_reasons"])

    # 2. Valid CSV with one good row and one missing reference
    valid_csv = (
        "scenario,language,reference_text,critical_phrases,severity\n"
        "Valid CSV Scenario,hi-IN,आपकी पॉलिसी एक्टिवेट हो गई है।,एक्टिवेट|पॉलिसी,HIGH\n"
        ",hinglish,,,\n"  # missing scenario & reference
    )
    res_good = client.post(
        "/api/cases/import-csv",
        files={"file": ("good.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}
    )
    assert res_good.status_code == 200
    summary_good = res_good.json()
    assert summary_good["imported"] >= 1
    assert summary_good["skipped"] >= 1
