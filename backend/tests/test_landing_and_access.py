import json
import pytest
from fastapi.testclient import TestClient
from app.main import app, LANDING_DIST, FRONTEND_DIST
from app.routers.access_requests import STORE_PATH
from app.auth.security import create_access_token, ROLE_ADMIN, ROLE_QA_REVIEWER
from app.models import User, Organisation
from app.db import get_db

client = TestClient(app)


def test_landing_page_served_at_root():
    """Visiting / serves the SvaraLens marketing landing page."""
    res = client.get("/")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "SvaraLens" in res.text


def test_workbench_served_at_app():
    """Visiting /app or /app/ serves the SvaraLens PRO Workbench."""
    res = client.get("/app")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "SvaraLens PRO" in res.text

    res_slash = client.get("/app/")
    assert res_slash.status_code == 200
    assert "SvaraLens PRO" in res_slash.text


def test_static_assets_routing():
    """Landing assets are served from /assets/ and workbench assets from /app/assets/ without conflict."""
    # Landing assets
    landing_assets = list((LANDING_DIST / "assets").glob("*.css"))
    if landing_assets:
        asset_name = landing_assets[0].name
        res = client.get(f"/assets/{asset_name}")
        assert res.status_code == 200
        assert "css" in res.headers["content-type"]

    # Workbench assets
    wb_assets = list((FRONTEND_DIST / "assets").glob("*.css"))
    if wb_assets:
        asset_name = wb_assets[0].name
        res = client.get(f"/app/assets/{asset_name}")
        assert res.status_code == 200
        assert "css" in res.headers["content-type"]


def test_access_request_validation():
    """Incomplete access requests return 422 with field errors."""
    res = client.post("/api/access-requests", json={
        "name": "A",
        "email": "not-an-email",
        "organisation": "",
        "role": "",
        "interest": "Invalid Interest"
    })
    assert res.status_code == 422
    data = res.json()
    assert "errors" in data
    assert "name" in data["errors"]
    assert "email" in data["errors"]
    assert "organisation" in data["errors"]
    assert "role" in data["errors"]
    assert "interest" in data["errors"]


def test_access_request_honeypot_rejection():
    """Bot submissions filling the honeypot are rejected."""
    res = client.post("/api/access-requests", json={
        "name": "Bot Name",
        "email": "bot@example.com",
        "organisation": "Bot Corp",
        "role": "QA Lead",
        "interest": "Speech QA",
        "website": "http://spam-link.xyz"
    })
    assert res.status_code == 400


def test_access_request_submission_and_retrieval(tmp_path, monkeypatch):
    """Valid access requests are persisted to JSONL and accessible to administrators."""
    test_store = tmp_path / "test_access.jsonl"
    monkeypatch.setattr("app.routers.access_requests.STORE_PATH", test_store)

    valid_payload = {
        "name": "Ananya Sharma",
        "email": "ananya.sharma@gnani.ai",
        "organisation": "Gnani.ai QA",
        "role": "Senior Speech QA Lead",
        "interest": "Speech QA",
        "message": "Interested in evaluating Indic ASR / TTS regression benchmarks."
    }

    # Submit valid request
    res = client.post("/api/access-requests", json=valid_payload)
    assert res.status_code == 201
    assert res.json() == {"ok": True, "message": "Access request received."}

    # Verify persisted in store
    assert test_store.exists()
    with open(test_store, "r", encoding="utf-8") as f:
        stored = [json.loads(line) for line in f if line.strip()]
    assert len(stored) == 1
    assert stored[0]["email"] == "ananya.sharma@gnani.ai"
    assert stored[0]["organisation"] == "Gnani.ai QA"

    # Unauthenticated retrieval forbidden
    res = client.get("/api/access-requests")
    assert res.status_code == 401

    # QA Reviewer retrieval forbidden
    reviewer_token = create_access_token(data={"sub": "rev-user", "role": ROLE_QA_REVIEWER, "org_id": "test-org"})
    # Mock user in DB
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        org = db.query(Organisation).first()
        admin_user = db.query(User).filter(User.role == ROLE_ADMIN).first()
        if admin_user:
            admin_token = create_access_token(data={"sub": admin_user.id, "role": ROLE_ADMIN, "org_id": admin_user.org_id})
            res_admin = client.get("/api/access-requests", headers={"Authorization": f"Bearer {admin_token}"})
            assert res_admin.status_code == 200
            assert len(res_admin.json()) == 1
            assert res_admin.json()[0]["email"] == "ananya.sharma@gnani.ai"
    finally:
        db.close()
