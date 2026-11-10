import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.auth.security import create_access_token, ROLE_ADMIN
from app.db import SessionLocal
from app.models import User, Capsule, Run, TestCase

client = TestClient(app)


def test_track_b_regression_audio_resolution():
    """Validates that regression runs with REG-RUN-* IDs are served correctly
    both with their full ID and with fallback prefix resolution."""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == ROLE_ADMIN).first()
        assert admin is not None
        token = create_access_token(data={"sub": admin.id, "role": ROLE_ADMIN, "org_id": admin.org_id})

        # Find or create a test case and capsule
        case = db.query(TestCase).filter(TestCase.org_id == admin.org_id).first()
        capsule = db.query(Capsule).filter(Capsule.org_id == admin.org_id).first()
        assert capsule is not None

        # Execute rerun regression
        res = client.post(
            f"/api/capsules/{capsule.id}/rerun",
            headers={"Authorization": f"Bearer {token}"},
            data={"generate": "true"}
        )
        assert res.status_code == 200, f"Rerun failed: {res.text}"
        rr_data = res.json()
        assert "run_id" in rr_data
        reg_run_id = rr_data["run_id"]
        assert reg_run_id.startswith("REG-RUN-")

        # 1. Fetch run detail with full ID
        res_detail = client.get(
            f"/api/runs/{reg_run_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res_detail.status_code == 200
        assert res_detail.json()["id"] == reg_run_id

        # 2. Fetch run audio with full ID (Track B audio)
        res_audio = client.get(
            f"/api/runs/{reg_run_id}/audio",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res_audio.status_code == 200
        assert "audio/wav" in res_audio.headers["content-type"]
        assert len(res_audio.content) > 44
        assert res_audio.content[:4] == b"RIFF"

        # 3. Fetch run audio using query param token (simulating browser HTML5 Audio / audio element)
        res_audio_token = client.get(f"/api/runs/{reg_run_id}/audio?token={token}")
        assert res_audio_token.status_code == 200
        assert res_audio_token.content[:4] == b"RIFF"

        # 4. Fallback resilience: even if client stripped REG- prefix, backend should resolve it
        stripped_id = reg_run_id.replace("REG-", "")
        res_audio_fallback = client.get(
            f"/api/runs/{stripped_id}/audio",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res_audio_fallback.status_code == 200
        assert res_audio_fallback.content[:4] == b"RIFF"

        # 5. Check GET /api/capsules/{id}/runs endpoint
        res_capsule_runs = client.get(
            f"/api/capsules/{capsule.id}/runs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res_capsule_runs.status_code == 200
        runs_list = res_capsule_runs.json()
        assert len(runs_list) >= 1
        assert runs_list[0]["run_id"] == reg_run_id

    finally:
        db.close()
