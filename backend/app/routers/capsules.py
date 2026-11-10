import json
import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Capsule, RegressionRun, Run, TestCase, Finding, User
from ..schemas import CapsuleRead, RegressionRunRead, AssertionComparison, RegressionApproveRequest, CapsuleIntegrityResponse
from ..config import settings
from ..gnani import get_gnani_client
from ..audio.normalize import normalize_to_standard_wav
from ..audio.analyze import analyze_audio_file
from ..checks.runner import run_all_checks
from ..capsule.compiler import compute_sha256
from ..capsule.regression import evaluate_capsule_assertions
from ..capsule.state_machine import transition, apply_regression_outcome, IllegalTransition
from ..auth.dependencies import get_current_user, require_lead_or_admin, require_not_auditor
from ..audit import record_audit_event

router = APIRouter(prefix="/capsules", tags=["capsules"])


@router.get("", response_model=List[CapsuleRead])
def list_capsules(
    case_id: Optional[str] = None,
    state: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists capsules strictly filtered by caller's organisation."""
    query = db.query(Capsule).filter(Capsule.org_id == current_user.org_id)
    if case_id:
        query = query.filter(Capsule.case_id == case_id)
    if state:
        query = query.filter(Capsule.state == state)
    capsules = query.order_by(Capsule.created_at.desc()).all()

    results = []
    for c in capsules:
        spec = json.loads(c.spec_json) if c.spec_json else {}
        results.append(CapsuleRead(
            id=c.id,
            case_id=c.case_id,
            source_finding_id=c.source_finding_id,
            defect_type=c.defect_type,
            severity=c.severity,
            review_status=c.review_status,
            failing_audio_sha256=c.failing_audio_sha256,
            spec=spec,
            state=c.state,
            created_at=c.created_at
        ))
    return results


@router.get("/{id}", response_model=CapsuleRead)
def get_capsule(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves single capsule. Returns 404 on cross-organisation access."""
    c = db.query(Capsule).filter(Capsule.id == id, Capsule.org_id == current_user.org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Capsule not found")
    spec = json.loads(c.spec_json) if c.spec_json else {}
    return CapsuleRead(
        id=c.id,
        case_id=c.case_id,
        source_finding_id=c.source_finding_id,
        defect_type=c.defect_type,
        severity=c.severity,
        review_status=c.review_status,
        failing_audio_sha256=c.failing_audio_sha256,
        spec=spec,
        state=c.state,
        created_at=c.created_at
    )


@router.get("/{id}/runs", response_model=List[RegressionRunRead])
def get_capsule_regression_runs(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all regression runs associated with a capsule, newest first."""
    capsule = db.query(Capsule).filter(Capsule.id == id, Capsule.org_id == current_user.org_id).first()
    if not capsule:
        raise HTTPException(status_code=404, detail="Capsule not found")

    rrs = db.query(RegressionRun).filter(
        RegressionRun.capsule_id == id,
        RegressionRun.org_id == current_user.org_id
    ).order_by(RegressionRun.created_at.desc()).all()

    results = []
    for r in rrs:
        assertions = json.loads(r.assertion_results_json) if r.assertion_results_json else []
        results.append(RegressionRunRead(
            id=r.id,
            capsule_id=r.capsule_id,
            run_id=r.run_id,
            verdict=r.verdict,
            assertion_results=[AssertionComparison(**a) for a in assertions],
            approved_by=r.approved_by,
            approved_at=r.approved_at,
            created_at=r.created_at
        ))
    return results


@router.get("/{id}/validate", response_model=CapsuleIntegrityResponse)
def validate_capsule_integrity(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validates SHA-256 integrity using actual file bytes on disk.
    Enforces cross-organisation isolation (404 on mismatched tenant)."""
    c = db.query(Capsule).filter(Capsule.id == id, Capsule.org_id == current_user.org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Capsule not found")

    spec = json.loads(c.spec_json) if c.spec_json else {}
    audio_path = spec.get("audio_file_path")

    if not audio_path or not Path(audio_path).exists():
        finding = c.source_finding
        if finding and finding.run and finding.run.audio_path and Path(finding.run.audio_path).exists():
            audio_path = finding.run.audio_path

    if not audio_path or not Path(audio_path).exists():
        return CapsuleIntegrityResponse(
            capsule_id=c.id,
            valid=False,
            expected_sha256=c.failing_audio_sha256,
            computed_sha256="FILE_NOT_FOUND_ON_DISK",
            audio_path=audio_path,
            verified_at=datetime.now(timezone.utc).isoformat()
        )

    computed_hash = compute_sha256(audio_path)
    is_valid = (computed_hash == c.failing_audio_sha256)

    return CapsuleIntegrityResponse(
        capsule_id=c.id,
        valid=is_valid,
        expected_sha256=c.failing_audio_sha256,
        computed_sha256=computed_hash,
        audio_path=audio_path,
        verified_at=datetime.now(timezone.utc).isoformat()
    )


@router.get("/{id}/export")
def export_capsule_json(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exports structured Voice Defect Capsule JSON representation."""
    c = db.query(Capsule).filter(Capsule.id == id, Capsule.org_id == current_user.org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Capsule not found")
    spec = json.loads(c.spec_json) if c.spec_json else {}
    pins = json.loads(c.defect_pins_json) if getattr(c, "defect_pins_json", None) else []
    return {
        "capsule_id": c.id,
        "case_id": c.case_id,
        "defect_type": c.defect_type,
        "severity": c.severity,
        "state": c.state,
        "review_status": c.review_status,
        "failing_audio_sha256": c.failing_audio_sha256,
        "defect_pins": pins,
        "regression_spec": spec,
        "created_at": c.created_at,
        "schema_version": "1.0.0"
    }


@router.post("/{id}/rerun", response_model=RegressionRunRead)
async def rerun_capsule_regression(
    id: str,
    request: Request,
    file: Optional[UploadFile] = File(None),
    generate: bool = Form(False),
    current_user: User = Depends(require_not_auditor),
    db: Session = Depends(get_db)
):
    """Reruns the regression specification against replacement audio.
    Scoped strictly to the authenticated user's organisation.
    Auditors are blocked from rerunning regressions."""
    capsule = db.query(Capsule).filter(Capsule.id == id, Capsule.org_id == current_user.org_id).first()
    if not capsule:
        raise HTTPException(status_code=404, detail="Capsule not found")

    test_case = db.query(TestCase).filter(TestCase.id == capsule.case_id, TestCase.org_id == current_user.org_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Associated test case not found")

    spec = json.loads(capsule.spec_json)
    gnani_client = get_gnani_client()
    new_run_id = f"REG-RUN-{uuid.uuid4().hex[:8].upper()}"
    norm_wav = settings.AUDIO_STORE_PATH / f"{new_run_id}.wav"

    if generate:
        try:
            import inspect
            sig = inspect.signature(gnani_client.synthesize)
            if "injected_fault" in sig.parameters:
                audio_bytes = await gnani_client.synthesize(
                    text=test_case.reference_text,
                    language=test_case.language,
                    voice=test_case.voice,
                    speed=test_case.speed,
                    case_id=test_case.id,
                    injected_fault="FIXED"
                )
            else:
                audio_bytes = await gnani_client.synthesize(
                    text=test_case.reference_text,
                    language=test_case.language,
                    voice=test_case.voice,
                    speed=test_case.speed
                )
            raw_path = settings.AUDIO_STORE_PATH / f"{new_run_id}_raw.wav"
            with open(raw_path, "wb") as f:
                f.write(audio_bytes)
            normalize_to_standard_wav(str(raw_path), str(norm_wav), target_sr=16000)
            raw_path.unlink(missing_ok=True)
            source = "TIMBRE_LIVE" if not settings.MOCK_MODE and settings.GNANI_API_KEY else "MOCK_FIXTURE"
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Generation failed: {str(e)}")
    elif file:
        raw_path = settings.AUDIO_STORE_PATH / f"{new_run_id}_upload.wav"
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        normalize_to_standard_wav(str(raw_path), str(norm_wav), target_sr=16000)
        raw_path.unlink(missing_ok=True)
        source = "UPLOAD"
    else:
        raise HTTPException(status_code=400, detail="Must provide an audio file or set generate=true")

    new_audio_sha256 = compute_sha256(str(norm_wav))
    acoustic_data = analyze_audio_file(str(norm_wav))

    try:
        dual_asr = await gnani_client.transcribe_dual_asr(
            audio_path=str(norm_wav),
            language=test_case.language,
            reference_text=test_case.reference_text
        )
        stt_res = dual_asr["primary_result"]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)}")

    critical_phrases = json.loads(test_case.critical_phrases_json) if test_case.critical_phrases_json else []
    check_results = run_all_checks(
        reference_text=test_case.reference_text,
        critical_phrases=critical_phrases,
        transcript_text=stt_res.text,
        audio_analysis=acoustic_data,
        pace_min=test_case.pace_min,
        pace_max=test_case.pace_max
    )

    db_new_run = Run(
        id=new_run_id,
        org_id=current_user.org_id,
        case_id=test_case.id,
        source=source,
        status="ANALYSED",
        audio_path=str(norm_wav),
        audio_sha256=new_audio_sha256,
        duration_s=acoustic_data.get("duration_s", 0.0),
        sample_rate=16000,
        channels=1,
        tts_model=(getattr(gnani_client, "last_tts_model", None) if source != "UPLOAD" else None),
        tts_voice=(test_case.voice if source != "UPLOAD" else None),
        transcript_text=stt_res.text,
        transcript_words_json=json.dumps(stt_res.words, ensure_ascii=False),
        stt_raw_json=json.dumps(stt_res.raw_json, ensure_ascii=False),
        stt_dual_results_json=json.dumps({
            "prisma_v25": dual_asr.get("prisma_v25"),
            "prisma_v30": dual_asr.get("prisma_v30"),
            "consensus_score": dual_asr.get("consensus_score"),
            "both_agree": dual_asr.get("both_agree")
        }, ensure_ascii=False),
        metrics_json=json.dumps(check_results["metrics"], ensure_ascii=False)
    )
    db.add(db_new_run)

    verdict, assertion_comparisons = evaluate_capsule_assertions(
        capsule_spec=spec,
        new_run=db_new_run,
        new_metrics=check_results["metrics"],
        new_findings=check_results["findings"],
        approved_by_reviewer=False
    )

    rr_id = f"RR-{uuid.uuid4().hex[:8].upper()}"
    db_rr = RegressionRun(
        id=rr_id,
        org_id=current_user.org_id,
        capsule_id=capsule.id,
        run_id=new_run_id,
        assertion_results_json=json.dumps(assertion_comparisons, ensure_ascii=False),
        verdict=verdict
    )
    db.add(db_rr)

    try:
        capsule.state = apply_regression_outcome(capsule.state, verdict)
    except IllegalTransition as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))

    db.flush()
    record_audit_event(
        db=db,
        actor=current_user,
        action="REGRESSION_RERUN",
        resource_type="Capsule",
        resource_id=capsule.id,
        details={
            "regression_run_id": rr_id,
            "verdict": verdict,
            "capsule_state": capsule.state
        },
        request=request
    )
    db.commit()
    db.refresh(db_rr)

    return RegressionRunRead(
        id=db_rr.id,
        capsule_id=db_rr.capsule_id,
        run_id=db_rr.run_id,
        verdict=db_rr.verdict,
        assertion_results=[AssertionComparison(**a) for a in assertion_comparisons],
        approved_by=db_rr.approved_by,
        approved_at=db_rr.approved_at,
        created_at=db_rr.created_at
    )


@router.post("/{id}/rerun/{rr_id}/approve", response_model=RegressionRunRead)
def approve_regression_run(
    id: str,
    rr_id: str,
    req: RegressionApproveRequest,
    request: Request,
    current_user: User = Depends(require_lead_or_admin),
    db: Session = Depends(get_db)
):
    """Authoritative regression approval:
    Enforces RBAC: only QA Lead or Administrator may sign off.
    QA Reviewer and Auditor are strictly blocked (403 Forbidden).
    Uses session identity (current_user.username), ignoring any client-supplied name."""
    capsule = db.query(Capsule).filter(Capsule.id == id, Capsule.org_id == current_user.org_id).first()
    if not capsule:
        raise HTTPException(status_code=404, detail="Capsule not found")

    rr = db.query(RegressionRun).filter(
        RegressionRun.id == rr_id,
        RegressionRun.capsule_id == id,
        RegressionRun.org_id == current_user.org_id
    ).first()
    if not rr:
        raise HTTPException(status_code=404, detail="Regression run not found")

    assertions = json.loads(rr.assertion_results_json)
    if rr.verdict != "NEEDS_REVIEW":
        raise HTTPException(status_code=409, detail=f"Cannot approve a regression with verdict {rr.verdict}.")
    auto = [a for a in assertions if a.get("type") != "reviewer_approval_required"]
    unmet = [a["id"] for a in auto if a.get("status", a.get("after")) != "PASS"]
    if not auto:
        raise HTTPException(status_code=409, detail="No automated assertion demonstrates the fix.")
    if unmet:
        raise HTTPException(status_code=409, detail=f"Mandatory assertions not passed: {unmet}")

    # Use authenticated identity
    authoritative_reviewer = current_user.username
    for a in assertions:
        if a.get("type") == "reviewer_approval_required":
            a["after"] = "PASS"
            a["detail"] = f"Approved by {authoritative_reviewer}"

    rr.assertion_results_json = json.dumps(assertions, ensure_ascii=False)
    try:
        capsule.state = transition(
            capsule.state, "RESOLVED",
            regression_verdict="RESOLVED",
            signed_off_by=authoritative_reviewer
        )
    except IllegalTransition as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))

    rr.verdict = "RESOLVED"
    rr.approved_by = authoritative_reviewer
    rr.approved_at = datetime.now(timezone.utc).isoformat()
    db.flush()

    record_audit_event(
        db=db,
        actor=current_user,
        action="REGRESSION_APPROVED",
        resource_type="Capsule",
        resource_id=capsule.id,
        details={
            "regression_run_id": rr.id,
            "approved_by": authoritative_reviewer,
            "verdict": "RESOLVED"
        },
        request=request
    )
    db.commit()
    db.refresh(rr)

    return RegressionRunRead(
        id=rr.id,
        capsule_id=rr.capsule_id,
        run_id=rr.run_id,
        verdict=rr.verdict,
        assertion_results=[AssertionComparison(**a) for a in assertions],
        approved_by=rr.approved_by,
        approved_at=rr.approved_at,
        created_at=rr.created_at
    )
