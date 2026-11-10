import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Finding, Run, TestCase, Capsule, User
from ..schemas import FindingRead, FindingUpdate, CapsuleRead
from ..capsule.compiler import compile_defect_capsule
from ..auth.dependencies import get_current_user, require_not_auditor
from ..audit import record_audit_event

router = APIRouter(prefix="/findings", tags=["findings"])


def get_next_capsule_id(db: Session, org_id: str) -> str:
    existing_ids = {c[0] for c in db.query(Capsule.id).filter(Capsule.org_id == org_id).all()}
    i = 1
    while f"SL-{i:03d}" in existing_ids:
        i += 1
    return f"SL-{i:03d}"


@router.patch("/{id}", response_model=FindingRead)
def update_finding(
    id: str,
    update_in: FindingUpdate,
    request: Request,
    current_user: User = Depends(require_not_auditor),
    db: Session = Depends(get_db)
):
    """Updates review state and severity for a finding.
    Authoritative identity: reviewer is ALWAYS set to authenticated current_user.
    Auditors are blocked from performing mutations."""
    finding = db.query(Finding).filter(Finding.id == id, Finding.org_id == current_user.org_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    old_state = finding.review_state
    old_sev = finding.severity

    finding.review_state = update_in.review_state
    if update_in.severity:
        finding.severity = update_in.severity
    if update_in.reviewer_note is not None:
        finding.reviewer_note = update_in.reviewer_note

    # SEC-03 / REV-03: Ignore client-supplied reviewed_by; use authoritative session identity
    finding.reviewed_by = current_user.username
    finding.reviewed_at = datetime.now(timezone.utc).isoformat()
    db.flush()

    # Record persistent audit event
    action = "FINDING_CONFIRMED" if update_in.review_state == "HUMAN_CONFIRMED" else "FINDING_REVIEW_UPDATED"
    record_audit_event(
        db=db,
        actor=current_user,
        action=action,
        resource_type="Finding",
        resource_id=finding.id,
        details={
            "old_review_state": old_state,
            "new_review_state": finding.review_state,
            "old_severity": old_sev,
            "new_severity": finding.severity,
            "reviewer_note": finding.reviewer_note,
            "check_type": finding.check_type
        },
        request=request
    )
    db.commit()
    db.refresh(finding)

    ev = json.loads(finding.evidence_json) if finding.evidence_json else {}
    return FindingRead(
        id=finding.id,
        run_id=finding.run_id,
        check_type=finding.check_type,
        status=finding.status,
        review_state=finding.review_state,
        severity=finding.severity,
        evidence=ev,
        region_start_s=finding.region_start_s,
        region_end_s=finding.region_end_s,
        reviewer_note=finding.reviewer_note,
        reviewed_by=finding.reviewed_by,
        reviewed_at=finding.reviewed_at
    )


@router.post("/{id}/capsule", response_model=CapsuleRead, status_code=201)
def compile_capsule_from_finding(
    id: str,
    request: Request,
    current_user: User = Depends(require_not_auditor),
    db: Session = Depends(get_db)
):
    """Compiles an immutable Voice Defect Capsule from a HUMAN_CONFIRMED finding.
    Scoped strictly to the authenticated user's organisation."""
    finding = db.query(Finding).filter(Finding.id == id, Finding.org_id == current_user.org_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    if finding.review_state != "HUMAN_CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Capsule compilation requires the finding to be in HUMAN_CONFIRMED review state."
        )

    run = db.query(Run).filter(Run.id == finding.run_id, Run.org_id == current_user.org_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Associated run not found")

    test_case = db.query(TestCase).filter(TestCase.id == run.case_id, TestCase.org_id == current_user.org_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Associated test case not found")

    capsule_id = get_next_capsule_id(db, current_user.org_id)
    spec_data = compile_defect_capsule(capsule_id, finding, run, test_case)

    db_capsule = Capsule(
        id=capsule_id,
        org_id=current_user.org_id,
        case_id=test_case.id,
        source_finding_id=finding.id,
        defect_type=finding.check_type,
        severity=finding.severity,
        review_status="HUMAN_CONFIRMED",
        failing_audio_sha256=spec_data["failing_audio_sha256"],
        spec_json=json.dumps(spec_data, ensure_ascii=False),
        state="OPEN"
    )
    db.add(db_capsule)
    db.flush()

    record_audit_event(
        db=db,
        actor=current_user,
        action="CAPSULE_COMPILED",
        resource_type="Capsule",
        resource_id=db_capsule.id,
        details={
            "case_id": test_case.id,
            "defect_type": finding.check_type,
            "failing_audio_sha256": spec_data["failing_audio_sha256"]
        },
        request=request
    )
    db.commit()
    db.refresh(db_capsule)

    return CapsuleRead(
        id=db_capsule.id,
        case_id=db_capsule.case_id,
        source_finding_id=db_capsule.source_finding_id,
        defect_type=db_capsule.defect_type,
        severity=db_capsule.severity,
        review_status=db_capsule.review_status,
        failing_audio_sha256=db_capsule.failing_audio_sha256,
        spec=spec_data,
        state=db_capsule.state,
        created_at=db_capsule.created_at
    )
