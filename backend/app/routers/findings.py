import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Finding, Run, TestCase, Capsule
from ..schemas import FindingRead, FindingUpdate, CapsuleRead
from ..capsule.compiler import compile_defect_capsule

router = APIRouter(prefix="/findings", tags=["findings"])

def get_next_capsule_id(db: Session) -> str:
    count = db.query(Capsule).count()
    return f"SL-{count+1:03d}"

@router.patch("/{id}", response_model=FindingRead)
def update_finding(id: str, update_in: FindingUpdate, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.review_state = update_in.review_state
    if update_in.severity:
        finding.severity = update_in.severity
    if update_in.reviewer_note is not None:
        finding.reviewer_note = update_in.reviewer_note
    if update_in.reviewed_by:
        finding.reviewed_by = update_in.reviewed_by
    if update_in.region_start_s is not None:
        finding.region_start_s = update_in.region_start_s
    if update_in.region_end_s is not None:
        finding.region_end_s = update_in.region_end_s

    finding.reviewed_at = datetime.now(timezone.utc).isoformat()
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
def compile_capsule_from_finding(id: str, db: Session = Depends(get_db)):
    """
    Compiles an immutable Voice Defect Capsule from a HUMAN_CONFIRMED finding.
    Enforces Product Rule 3: A capsule can be created only from a HUMAN_CONFIRMED finding.
    """
    finding = db.query(Finding).filter(Finding.id == id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    if finding.review_state != "HUMAN_CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Capsule compilation requires the finding to be in HUMAN_CONFIRMED review state."
        )

    run = db.query(Run).filter(Run.id == finding.run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Associated run not found")

    test_case = db.query(TestCase).filter(TestCase.id == run.case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Associated test case not found")

    capsule_id = get_next_capsule_id(db)
    spec_data = compile_defect_capsule(capsule_id, finding, run, test_case)

    db_capsule = Capsule(
        id=capsule_id,
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
