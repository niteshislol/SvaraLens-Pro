import pytest
import uuid
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db import get_db, SessionLocal
from app.models import (
    User, Organisation, TestCase as DBTestCase, Finding as DBFinding,
    Run as DBRun, Capsule as DBCapsule, RegressionRun as DBRegressionRun,
    AuditEvent
)
from app.auth.security import (
    create_access_token, hash_password, verify_password,
    ROLE_ADMIN, ROLE_QA_LEAD, ROLE_QA_REVIEWER, ROLE_AUDITOR
)
from app.config import Settings


@pytest.fixture(scope="module")
def unauthed_client():
    """Unauthenticated HTTP client with no auth headers."""
    return TestClient(app)


@pytest.fixture(scope="module")
def admin_client():
    c = TestClient(app)
    token = create_access_token({"sub": "admin", "username": "admin", "role": ROLE_ADMIN, "org_id": "org-default"})
    c.headers["Authorization"] = f"Bearer {token}"
    return c


@pytest.fixture(scope="module")
def lead_client():
    c = TestClient(app)
    token = create_access_token({"sub": "qalead", "username": "qalead", "role": ROLE_QA_LEAD, "org_id": "org-default"})
    c.headers["Authorization"] = f"Bearer {token}"
    return c


@pytest.fixture(scope="module")
def reviewer_client():
    c = TestClient(app)
    token = create_access_token({"sub": "reviewer", "username": "reviewer", "role": ROLE_QA_REVIEWER, "org_id": "org-default"})
    c.headers["Authorization"] = f"Bearer {token}"
    return c


@pytest.fixture(scope="module")
def auditor_client():
    c = TestClient(app)
    token = create_access_token({"sub": "auditor", "username": "auditor", "role": ROLE_AUDITOR, "org_id": "org-default"})
    c.headers["Authorization"] = f"Bearer {token}"
    return c


@pytest.fixture(scope="module")
def beta_org_client():
    """Client for a separate tenant/organisation ('org-beta')."""
    db: Session = SessionLocal()
    try:
        # Create org-beta if not exists
        org_beta = db.query(Organisation).filter(Organisation.id == "org-beta").first()
        if not org_beta:
            org_beta = Organisation(id="org-beta", name="Beta Partner QA", is_active=True)
            db.add(org_beta)
            db.commit()

        # Create user in org-beta
        user_beta = db.query(User).filter(User.username == "beta_lead").first()
        if not user_beta:
            user_beta = User(
                id="usr-beta-01",
                org_id="org-beta",
                username="beta_lead",
                email="beta_lead@example.com",
                hashed_password=hash_password("BetaLeadPassword@123!"),
                role=ROLE_QA_LEAD,
                full_name="Beta Lead",
                is_active=True
            )
            db.add(user_beta)
            db.commit()
    finally:
        db.close()

    c = TestClient(app)
    token = create_access_token({"sub": "usr-beta-01", "username": "beta_lead", "role": ROLE_QA_LEAD, "org_id": "org-beta"})
    c.headers["Authorization"] = f"Bearer {token}"
    return c


# =============================================================================
# 1. Unauthenticated Request -> 401
# =============================================================================

def test_unauthenticated_request_returns_401(unauthed_client):
    """Protected endpoints must reject requests lacking Authorization Bearer token with 401."""
    endpoints = [
        ("GET", "/api/cases"),
        ("GET", "/api/cases/TC-001"),
        ("GET", "/api/runs/RUN-001"),
        ("GET", "/api/capsules"),
        ("GET", "/api/audit"),
        ("GET", "/api/auth/me"),
        ("POST", "/api/cases"),
        ("POST", "/api/capsules/SL-001/rerun"),
    ]
    for method, path in endpoints:
        if method == "GET":
            res = unauthed_client.get(path)
        else:
            res = unauthed_client.post(path, json={})
        assert res.status_code == 401, f"{method} {path} returned {res.status_code}, expected 401"
        data = res.json()
        assert "error" in data or "detail" in data


# =============================================================================
# 2. Invalid Credentials -> 401
# =============================================================================

def test_invalid_credentials_login_returns_401(unauthed_client):
    """Login with wrong password or unknown username must return 401."""
    # Wrong password
    res1 = unauthed_client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword!"})
    assert res1.status_code == 401

    # Unknown user
    res2 = unauthed_client.post("/api/auth/login", json={"username": "nonexistent_user", "password": "AnyPassword!"})
    assert res2.status_code == 401


def test_tampered_jwt_token_returns_401(unauthed_client):
    """Forged or malformed JWT token must return 401."""
    res = unauthed_client.get("/api/cases", headers={"Authorization": "Bearer forged.invalid.token"})
    assert res.status_code == 401


# =============================================================================
# 3. Reviewer Attempting QA Lead Action -> 403
# =============================================================================

def test_reviewer_attempting_qa_lead_approval_returns_403(admin_client, reviewer_client):
    """QA Reviewer must NOT be allowed to sign off / approve a capsule regression."""
    # 1. Create a case and generate run with admin client
    case_id = f"TC-SEC-RBAC-{uuid.uuid4().hex[:6]}"
    admin_client.post("/api/cases", json={
        "id": case_id,
        "suite_id": "suite-insurance-hi",
        "scenario": "RBAC Security Test Case",
        "language": "hi-IN",
        "reference_text": "प्रीमियम भुगतान ₹5,000 सफल रहा।",
        "critical_phrases": [{"text": "₹5,000", "severity": "HIGH"}],
        "severity": "HIGH"
    })
    gen_res = admin_client.post(f"/api/cases/{case_id}/runs/generate?injected_fault=END_TRUNCATION")
    run_id = gen_res.json()["run_id"]
    run_data = admin_client.get(f"/api/runs/{run_id}").json()
    finding_id = run_data["findings"][0]["id"]

    # Confirm finding
    admin_client.patch(f"/api/findings/{finding_id}", json={
        "review_state": "HUMAN_CONFIRMED",
        "severity": "HIGH",
        "reviewer_note": "RBAC verification finding"
    })

    # Compile capsule
    cap_res = admin_client.post(f"/api/findings/{finding_id}/capsule")
    cap_id = cap_res.json()["id"]

    # Rerun regression
    rr_res = admin_client.post(f"/api/capsules/{cap_id}/rerun", data={"generate": "true"})
    rr_id = rr_res.json()["id"]

    # QA Reviewer attempts to approve regression -> MUST FAIL with 403
    app_res = reviewer_client.post(f"/api/capsules/{cap_id}/rerun/{rr_id}/approve", json={
        "sign_off_notes": "Attempted reviewer signoff"
    })
    assert app_res.status_code == 403, f"Expected 403 Forbidden for QA Reviewer approval, got {app_res.status_code}"


# =============================================================================
# 4. Auditor Attempting Mutation -> 403
# =============================================================================

def test_auditor_read_allowed_mutations_return_403(admin_client, auditor_client):
    """Auditor has strictly read-only access. All state mutations must return 403."""
    # 1. Auditor read access is allowed
    cases_res = auditor_client.get("/api/cases")
    assert cases_res.status_code == 200

    audit_res = auditor_client.get("/api/audit")
    assert audit_res.status_code == 200

    # 2. Auditor attempting to create a test case -> 403
    create_case = auditor_client.post("/api/cases", json={
        "id": "TC-AUDITOR-MUTATION",
        "suite_id": "suite-insurance-hi",
        "scenario": "Auditor forbidden mutation",
        "language": "hi-IN",
        "reference_text": "परीक्षण"
    })
    assert create_case.status_code == 403

    # 3. Auditor attempting to delete a test case -> 403
    del_case = auditor_client.delete("/api/cases/TC-001")
    assert del_case.status_code == 403

    # 4. Auditor attempting finding patch -> 403
    patch_finding = auditor_client.patch("/api/findings/FINDING-DUMMY", json={"review_state": "HUMAN_CONFIRMED"})
    assert patch_finding.status_code == 403

    # 5. Auditor attempting capsule compilation -> 403
    post_capsule = auditor_client.post("/api/findings/FINDING-DUMMY/capsule")
    assert post_capsule.status_code == 403

    # 6. Auditor attempting review creation -> 403
    post_review = auditor_client.post("/api/runs/RUN-DUMMY/reviews", json={"review_status": "CONFIRMED"})
    assert post_review.status_code == 403


# =============================================================================
# 5. Organisation Isolation & Cross-Organisation Record Access -> 404
# =============================================================================

def test_cross_organisation_record_access_returns_404(admin_client, beta_org_client):
    """Cross-organisation resource access must return 404 (not 403) to prevent enumeration."""
    # 1. Create a case belonging to org-default
    case_id = f"TC-ALPHA-{uuid.uuid4().hex[:6]}"
    c_res = admin_client.post("/api/cases", json={
        "id": case_id,
        "suite_id": "suite-insurance-hi",
        "scenario": "Alpha Org Confidential Scenario",
        "language": "hi-IN",
        "reference_text": "गोपनीय डेटा",
        "critical_phrases": [{"text": "गोपनीय", "severity": "HIGH"}]
    })
    assert c_res.status_code == 201

    # 2. User from org-beta attempts to access org-default case directly -> 404
    cross_case = beta_org_client.get(f"/api/cases/{case_id}")
    assert cross_case.status_code == 404, f"Expected 404, got {cross_case.status_code}"

    # 3. User from org-beta listing cases must NOT see case_id
    beta_cases = beta_org_client.get("/api/cases").json()
    beta_ids = [c["id"] for c in beta_cases]
    assert case_id not in beta_ids

    # 4. Untrusted client-supplied org_id in request body is ignored
    suite_beta_id = f"suite-beta-{uuid.uuid4().hex[:6]}"
    forged_case_id = f"TC-BETA-{uuid.uuid4().hex[:6]}"
    forged_create = beta_org_client.post("/api/cases", json={
        "id": forged_case_id,
        "org_id": "org-default",  # malicious attempt to inject into org-default
        "suite_id": suite_beta_id,
        "scenario": "Beta Scenario with forged org_id",
        "language": "hi-IN",
        "reference_text": "परीक्षण",
        "critical_phrases": [{"text": "परीक्षण", "severity": "HIGH"}]
    })
    assert forged_create.status_code == 201
    created_data = forged_create.json()
    # Authoritative org_id must be org-beta, NOT org-default
    assert created_data["org_id"] == "org-beta"


# =============================================================================
# 6. Forged Reviewer Identity Ignored
# =============================================================================

def test_forged_reviewer_identity_ignored(admin_client, reviewer_client):
    """Finding review must record authenticated user identity and ignore client spoofing."""
    case_id = f"TC-SEC-FORGE-{uuid.uuid4().hex[:6]}"
    ref_text = "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।"
    admin_client.post("/api/cases", json={
        "id": case_id,
        "suite_id": "suite-insurance-hi",
        "scenario": "Forge Reviewer Identity Test",
        "language": "hi-IN",
        "reference_text": ref_text,
        "critical_phrases": [{"text": "₹4,250", "severity": "HIGH"}, {"text": "विलंब शुल्क", "severity": "CRITICAL"}]
    })
    gen_res = admin_client.post(f"/api/cases/{case_id}/runs/generate?injected_fault=END_TRUNCATION")
    run_id = gen_res.json()["run_id"]
    run_data = admin_client.get(f"/api/runs/{run_id}").json()
    failing = next((f for f in run_data["findings"] if f["status"] in ("FAIL", "SUSPECTED")), run_data["findings"][0] if run_data["findings"] else None)
    assert failing is not None
    finding_id = failing["id"]

    # Reviewer submits patch attempting to forge reviewed_by as "ChiefExecutiveOfficer"
    patch_res = reviewer_client.patch(f"/api/findings/{finding_id}", json={
        "review_state": "HUMAN_CONFIRMED",
        "severity": "CRITICAL",
        "reviewer_note": "Audited finding",
        "reviewed_by": "ChiefExecutiveOfficer"  # FORGERY ATTEMPT
    })
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    # Authoritative reviewer identity must be "reviewer", not the spoofed value
    assert patched_data["reviewed_by"] == "reviewer"


# =============================================================================
# 7. Forged Approver Identity Ignored
# =============================================================================

def test_forged_approver_identity_ignored(admin_client, lead_client):
    """Capsule regression sign-off must record authenticated lead username and ignore body forgery."""
    case_id = f"TC-SEC-APPR-{uuid.uuid4().hex[:6]}"
    ref_text = "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।"
    admin_client.post("/api/cases", json={
        "id": case_id,
        "suite_id": "suite-insurance-hi",
        "scenario": "Forge Approver Test",
        "language": "hi-IN",
        "reference_text": ref_text,
        "critical_phrases": [{"text": "₹4,250", "severity": "HIGH"}, {"text": "विलंब शुल्क", "severity": "CRITICAL"}]
    })
    gen_res = admin_client.post(f"/api/cases/{case_id}/runs/generate?injected_fault=END_TRUNCATION")
    run_id = gen_res.json()["run_id"]
    finding_id = admin_client.get(f"/api/runs/{run_id}").json()["findings"][0]["id"]

    admin_client.patch(f"/api/findings/{finding_id}", json={
        "review_state": "HUMAN_CONFIRMED",
        "severity": "HIGH",
        "reviewer_note": "Ready for approval"
    })
    cap_id = admin_client.post(f"/api/findings/{finding_id}/capsule").json()["id"]
    rr_id = admin_client.post(f"/api/capsules/{cap_id}/rerun", data={"generate": "true"}).json()["id"]

    # QA Lead approves, but passes forged "approved_by" in body
    app_res = lead_client.post(f"/api/capsules/{cap_id}/rerun/{rr_id}/approve", json={
        "approved_by": "ExternalAuditorVIP",  # FORGERY ATTEMPT
        "sign_off_notes": "Official Lead sign-off"
    })
    assert app_res.status_code == 200
    app_data = app_res.json()
    # Authoritative sign-off must be "qalead"
    assert (app_data.get("approved_by") or app_data.get("signed_off_by")) == "qalead"


# =============================================================================
# 8. Audit Event Created on Confirmation
# =============================================================================

def test_audit_event_created_on_finding_confirmation(admin_client, reviewer_client):
    """Confirming a finding must append an immutable AuditEvent in the database."""
    case_id = f"TC-SEC-AUD-FND-{uuid.uuid4().hex[:6]}"
    ref_text = "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।"
    admin_client.post("/api/cases", json={
        "id": case_id,
        "suite_id": "suite-insurance-hi",
        "scenario": "Audit Event Confirmation Test",
        "language": "hi-IN",
        "reference_text": ref_text,
        "critical_phrases": [{"text": "₹4,250", "severity": "HIGH"}, {"text": "विलंब शुल्क", "severity": "CRITICAL"}]
    })
    gen_res = admin_client.post(f"/api/cases/{case_id}/runs/generate?injected_fault=END_TRUNCATION")
    run_data = admin_client.get(f"/api/runs/{gen_res.json()['run_id']}").json()
    failing = next((f for f in run_data["findings"] if f["status"] in ("FAIL", "SUSPECTED")), run_data["findings"][0] if run_data["findings"] else None)
    assert failing is not None
    finding_id = failing["id"]

    # Reviewer confirms finding
    reviewer_client.patch(f"/api/findings/{finding_id}", json={
        "review_state": "HUMAN_CONFIRMED",
        "severity": "HIGH",
        "reviewer_note": "Confirmed by reviewer"
    })

    # Query audit logs via /api/audit
    audit_res = reviewer_client.get("/api/audit")
    assert audit_res.status_code == 200
    events = audit_res.json()
    fnd_event = next((e for e in events if e["resource_id"] == finding_id and e["action"] == "FINDING_CONFIRMED"), None)
    assert fnd_event is not None, "FINDING_CONFIRMED audit event was not recorded"
    assert fnd_event["actor_username"] == "reviewer"
    assert fnd_event["actor_role"] == ROLE_QA_REVIEWER
    assert fnd_event["resource_type"] == "Finding"
    assert fnd_event["org_id"] == "org-default"


# =============================================================================
# 9. Audit Event Created on Approval
# =============================================================================

def test_audit_event_created_on_regression_approval(admin_client, lead_client):
    """Approving a regression run must append an immutable AuditEvent in the database."""
    case_id = f"TC-SEC-AUD-APP-{uuid.uuid4().hex[:6]}"
    ref_text = "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।"
    admin_client.post("/api/cases", json={
        "id": case_id,
        "suite_id": "suite-insurance-hi",
        "scenario": "Audit Event Approval Test",
        "language": "hi-IN",
        "reference_text": ref_text,
        "critical_phrases": [{"text": "₹4,250", "severity": "HIGH"}, {"text": "विलंब शुल्क", "severity": "CRITICAL"}]
    })
    gen_res = admin_client.post(f"/api/cases/{case_id}/runs/generate?injected_fault=END_TRUNCATION")
    finding_id = admin_client.get(f"/api/runs/{gen_res.json()['run_id']}").json()["findings"][0]["id"]
    admin_client.patch(f"/api/findings/{finding_id}", json={
        "review_state": "HUMAN_CONFIRMED",
        "severity": "HIGH",
        "reviewer_note": "Audit signoff test"
    })
    cap_id = admin_client.post(f"/api/findings/{finding_id}/capsule").json()["id"]
    rr_id = admin_client.post(f"/api/capsules/{cap_id}/rerun", data={"generate": "true"}).json()["id"]

    # Lead approves
    lead_client.post(f"/api/capsules/{cap_id}/rerun/{rr_id}/approve", json={
        "sign_off_notes": "Lead approval audit verification"
    })

    # Query audit logs
    audit_res = lead_client.get("/api/audit")
    assert audit_res.status_code == 200
    events = audit_res.json()
    app_event = next((e for e in events if (e["resource_id"] == cap_id or (e.get("details") or {}).get("regression_run_id") == rr_id) and e["action"] == "REGRESSION_APPROVED"), None)
    assert app_event is not None, "REGRESSION_APPROVED audit event was not recorded"
    assert app_event["actor_username"] == "qalead"
    assert app_event["actor_role"] == ROLE_QA_LEAD
    assert app_event["org_id"] == "org-default"


# =============================================================================
# 10. Session Expiry
# =============================================================================

def test_session_expiry_returns_401(unauthed_client):
    """Tokens past expiration time must be rejected with 401."""
    expired_token = create_access_token(
        {"sub": "admin", "username": "admin", "role": ROLE_ADMIN, "org_id": "org-default"},
        expires_delta=timedelta(seconds=-10)  # Expired in past
    )
    res = unauthed_client.get("/api/cases", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    err_body = res.json()
    err_msg = str(err_body).lower()
    assert "expired" in err_msg or "expired" in res.text.lower()


# =============================================================================
# 11. Invalid CORS Configuration Rejected
# =============================================================================

def test_invalid_cors_configuration_rejected_at_startup():
    """Startup validation must raise ValueError if wildcard CORS is used with credentials enabled."""
    bad_settings = Settings(
        CORS_ORIGINS=["*"],
        ALLOW_CREDENTIALS=True,
        ENVIRONMENT="production"
    )
    with pytest.raises(ValueError, match="CORS configuration invalid"):
        bad_settings.validate_configuration()


def test_valid_cors_configuration_passes():
    """Explicit domain origins with credentials allowed must pass startup validation."""
    valid_settings = Settings(
        CORS_ORIGINS=["http://localhost:5173", "https://qa.gnani.ai"],
        ALLOW_CREDENTIALS=True,
        ENVIRONMENT="development"
    )
    # Should not raise
    valid_settings.validate_configuration()


# =============================================================================
# 12. Admin-Only User Registration and Management
# =============================================================================

def test_reviewer_cannot_register_user_returns_403(reviewer_client):
    """Only administrator may register new users."""
    res = reviewer_client.post("/api/auth/register", json={
        "username": "unauthorized_new_user",
        "email": "unauth@example.com",
        "password": "Password123!",
        "role": ROLE_QA_REVIEWER
    })
    assert res.status_code == 403


def test_admin_can_register_user(admin_client):
    """Admin can register a new user in the organisation."""
    new_user_name = f"pilot_user_{uuid.uuid4().hex[:6]}"
    res = admin_client.post("/api/auth/register", json={
        "username": new_user_name,
        "email": f"{new_user_name}@example.com",
        "password": "PilotUserPassword123!",
        "role": ROLE_QA_REVIEWER,
        "full_name": "Pilot QA User"
    })
    assert res.status_code == 201
    user_data = res.json()
    assert user_data["username"] == new_user_name
    assert user_data["role"] == ROLE_QA_REVIEWER
