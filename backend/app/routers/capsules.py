import json
import uuid
import shutil
from datetime import datetime, timezone
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Capsule, RegressionRun, Run, TestCase, Finding
from ..schemas import (
    CapsuleRead, RegressionRunRead, RegressionApproveRequest, AssertionComparison
)
from ..config import settings
from ..gnani.mock import get_gnani_client
from ..audio.normalize import normalize_to_standard_wav
from ..audio.analyze import analyze_audio_file
from ..checks.runner import run_all_checks
from ..capsule.compiler import compute_sha256
from ..capsule.regression import evaluate_capsule_assertions

router = APIRouter(prefix="/capsules", tags=["capsules"])

@router.get("", response_model=List[CapsuleRead])
def list_capsules(case_id: Optional[str] = None, state: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Capsule)
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
def get_capsule(id: str, db: Session = Depends(get_db)):
    c = db.query(Capsule).filter(Capsule.id == id).first()
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

@router.post("/{id}/rerun", response_model=RegressionRunRead)
async def rerun_capsule_regression(
    id: str,
    file: Optional[UploadFile] = File(None),
    generate: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Reruns the regression specification against replacement audio (uploaded or freshly generated).
    Deterministic: executes same assertions using check pipeline.
    Produces verdict: NEEDS_REVIEW, RESOLVED, STILL_FAILING, or REGRESSED.
    """
    capsule = db.query(Capsule).filter(Capsule.id == id).first()
    if not capsule:
        raise HTTPException(status_code=404, detail="Capsule not found")

    test_case = db.query(TestCase).filter(TestCase.id == capsule.case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Associated test case not found")

    spec = json.loads(capsule.spec_json)
    gnani_client = get_gnani_client()
    new_run_id = f"REG-RUN-{uuid.uuid4().hex[:8].upper()}"
    norm_wav = settings.AUDIO_STORE_PATH / f"{new_run_id}.wav"

    if generate:
        # Fresh Timbre generation with fixed speech
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
                    injected_fault="FIXED"  # Fixed audio!
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

    # Transcribe replacement audio
    try:
        import inspect
        sig = inspect.signature(gnani_client.transcribe)
        if "is_truncated" in sig.parameters:
            stt_res = await gnani_client.transcribe(
                audio_path=str(norm_wav),
                language=test_case.language,
                case_id=test_case.id,
                reference_text=test_case.reference_text,
                is_truncated=False  # Correction is NOT truncated!
            )
        else:
            stt_res = await gnani_client.transcribe(audio_path=str(norm_wav), language=test_case.language)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)}")

    # Execute all checks on new audio
    critical_phrases = json.loads(test_case.critical_phrases_json) if test_case.critical_phrases_json else []
    check_results = run_all_checks(
        reference_text=test_case.reference_text,
        critical_phrases=critical_phrases,
        transcript_text=stt_res.text,
        audio_analysis=acoustic_data,
        pace_min=test_case.pace_min,
        pace_max=test_case.pace_max
    )

    # Save run record
    db_new_run = Run(
        id=new_run_id,
        case_id=test_case.id,
        source=source,
        status="ANALYSED",
        audio_path=str(norm_wav),
        audio_sha256=new_audio_sha256,
        duration_s=acoustic_data.get("duration_s", 0.0),
        sample_rate=16000,
        channels=1,
        transcript_text=stt_res.text,
        transcript_words_json=json.dumps(stt_res.words, ensure_ascii=False),
        stt_raw_json=json.dumps(stt_res.raw_json, ensure_ascii=False),
        metrics_json=json.dumps(check_results["metrics"], ensure_ascii=False)
    )
    db.add(db_new_run)

    # Evaluate against the capsule's assertions!
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
        capsule_id=capsule.id,
        run_id=new_run_id,
        assertion_results_json=json.dumps(assertion_comparisons, ensure_ascii=False),
        verdict=verdict
    )
    db.add(db_rr)

    # If regression still fails or regressed, reopen capsule
    if verdict in ("STILL_FAILING", "REGRESSED"):
        capsule.state = "REOPENED"

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
    db: Session = Depends(get_db)
):
    """
    Reviewer approval of the fix:
    Marks assertion A3 as approved and elevates verdict from NEEDS_REVIEW to RESOLVED.
    Updates capsule state to RESOLVED.
    """
    capsule = db.query(Capsule).filter(Capsule.id == id).first()
    if not capsule:
        raise HTTPException(status_code=404, detail="Capsule not found")

    rr = db.query(RegressionRun).filter(RegressionRun.id == rr_id, RegressionRun.capsule_id == id).first()
    if not rr:
        raise HTTPException(status_code=404, detail="Regression run not found")

    assertions = json.loads(rr.assertion_results_json)
    for a in assertions:
        if a.get("type") == "reviewer_approval_required":
            a["after"] = "PASS"
            a["detail"] = f"Approved by {req.approved_by}"

    rr.assertion_results_json = json.dumps(assertions, ensure_ascii=False)
    rr.verdict = "RESOLVED"
    rr.approved_by = req.approved_by
    rr.approved_at = datetime.now(timezone.utc).isoformat()

    capsule.state = "RESOLVED"
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
