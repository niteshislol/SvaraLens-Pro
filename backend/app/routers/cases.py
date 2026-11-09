import json
import uuid
import csv
import io
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import TestCase, Suite, Run, Finding
from ..schemas import (
    TestCaseCreate, TestCaseRead, TestCaseUpdate, RunRead, FindingRead
)
from ..config import settings
from ..gnani.mock import get_gnani_client
from ..audio.normalize import normalize_to_standard_wav
from ..audio.analyze import analyze_audio_file
from ..checks.runner import run_all_checks
from ..capsule.compiler import compute_sha256

router = APIRouter(prefix="/cases", tags=["cases"])

def get_next_case_id(db: Session) -> str:
    count = db.query(TestCase).count()
    return f"TC-{count+1:03d}"

@router.get("", response_model=List[TestCaseRead])
def list_test_cases(suite_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TestCase)
    if suite_id:
        query = query.filter(TestCase.suite_id == suite_id)
    cases = query.order_by(TestCase.id).all()
    
    results = []
    for c in cases:
        critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
        results.append(TestCaseRead(
            id=c.id,
            suite_id=c.suite_id,
            scenario=c.scenario,
            language=c.language,
            reference_text=c.reference_text,
            critical_phrases=critical_phrases,
            voice=c.voice,
            speed=c.speed,
            channel=c.channel,
            pace_min=c.pace_min,
            pace_max=c.pace_max,
            severity=c.severity,
            is_synthetic=c.is_synthetic,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))
    return results

@router.post("", response_model=TestCaseRead, status_code=201)
def create_test_case(case_in: TestCaseCreate, db: Session = Depends(get_db)):
    case_id = case_in.id or get_next_case_id(db)
    
    # Check suite exists or create default
    suite = db.query(Suite).filter(Suite.id == case_in.suite_id).first()
    if not suite:
        suite = Suite(id=case_in.suite_id, name="Default Test Suite")
        db.add(suite)
        db.commit()

    crit_json = json.dumps([cp.model_dump() for cp in case_in.critical_phrases], ensure_ascii=False)

    existing = db.query(TestCase).filter(TestCase.id == case_id).first()
    if existing:
        existing.scenario = case_in.scenario
        existing.language = case_in.language
        existing.reference_text = case_in.reference_text
        existing.critical_phrases_json = crit_json
        existing.severity = case_in.severity
        existing.channel = case_in.channel
        db.commit()
        db.refresh(existing)
        db_case = existing
    else:
        db_case = TestCase(
            id=case_id,
            suite_id=case_in.suite_id,
            scenario=case_in.scenario,
            language=case_in.language,
            reference_text=case_in.reference_text,
            critical_phrases_json=crit_json,
            voice=case_in.voice or "ananya",
            speed=case_in.speed,
            channel=case_in.channel,
            pace_min=case_in.pace_min,
            pace_max=case_in.pace_max,
            severity=case_in.severity,
            is_synthetic=case_in.is_synthetic
        )
        db.add(db_case)
        db.commit()
        db.refresh(db_case)

    critical_phrases = json.loads(db_case.critical_phrases_json) if db_case.critical_phrases_json else []
    return TestCaseRead(
        id=db_case.id,
        suite_id=db_case.suite_id,
        scenario=db_case.scenario,
        language=db_case.language,
        reference_text=db_case.reference_text,
        critical_phrases=critical_phrases,
        voice=db_case.voice,
        speed=db_case.speed,
        channel=db_case.channel,
        pace_min=db_case.pace_min,
        pace_max=db_case.pace_max,
        severity=db_case.severity,
        is_synthetic=db_case.is_synthetic,
        created_at=db_case.created_at,
        updated_at=db_case.updated_at
    )

@router.get("/{id}", response_model=TestCaseRead)
def get_test_case(id: str, db: Session = Depends(get_db)):
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")
    critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
    return TestCaseRead(
        id=c.id,
        suite_id=c.suite_id,
        scenario=c.scenario,
        language=c.language,
        reference_text=c.reference_text,
        critical_phrases=critical_phrases,
        voice=c.voice,
        speed=c.speed,
        channel=c.channel,
        pace_min=c.pace_min,
        pace_max=c.pace_max,
        severity=c.severity,
        is_synthetic=c.is_synthetic,
        created_at=c.created_at,
        updated_at=c.updated_at
    )

@router.delete("/{id}")
def delete_test_case(id: str, db: Session = Depends(get_db)):
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    # Delete associated audio files
    for r in c.runs:
        if r.audio_path and Path(r.audio_path).exists():
            try:
                Path(r.audio_path).unlink(missing_ok=True)
            except Exception:
                pass

    db.delete(c)
    db.commit()
    return {"status": "deleted", "id": id}

@router.post("/import-csv")
async def import_cases_csv(
    file: UploadFile = File(...),
    suite_id: str = Form("suite-insurance-hi"),
    db: Session = Depends(get_db)
):
    """
    Import CSV columns: scenario,language,reference_text,critical_phrases,severity
    (phrases separated by |)
    """
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    created = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        try:
            scenario = row.get("scenario", "").strip()
            lang = row.get("language", "hi-IN").strip()
            ref = row.get("reference_text", "").strip()
            phrases_raw = row.get("critical_phrases", "").strip()
            severity = row.get("severity", "HIGH").strip().upper()

            if not scenario or not ref:
                errors.append(f"Row {idx}: missing scenario or reference_text")
                continue

            crit_phrases = []
            if phrases_raw:
                for p in phrases_raw.split("|"):
                    p = p.strip()
                    if p:
                        crit_phrases.append({"text": p, "variants": [], "severity": severity})

            case_id = get_next_case_id(db)
            db_case = TestCase(
                id=case_id,
                suite_id=suite_id,
                scenario=scenario,
                language=lang,
                reference_text=ref,
                critical_phrases_json=json.dumps(crit_phrases, ensure_ascii=False),
                voice="ananya",
                speed=1.0,
                channel="standard",
                severity=severity if severity in ('LOW','MEDIUM','HIGH','CRITICAL') else "HIGH",
                is_synthetic=1
            )
            db.add(db_case)
            db.commit()
            created += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    return {"imported": created, "errors": errors}

@router.post("/{id}/runs/generate")
async def generate_and_analyze(
    id: str,
    injected_fault: Optional[str] = Query(None, description="Optional fault to inject: END_TRUNCATION, CLIPPING, SILENCE"),
    db: Session = Depends(get_db)
):
    """
    Step 1: Calls Timbre v2.5 to synthesize speech.
    Step 2: Saves audio to storage/audio.
    Step 3: Calls Prisma v2.5 to transcribe audio.
    Step 4: Executes the 6 checks and persists findings and metrics.
    """
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")

    gnani_client = get_gnani_client()
    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    source = "MOCK_FIXTURE" if settings.MOCK_MODE or not settings.GNANI_API_KEY else "TIMBRE_LIVE"

    # 1. Synthesize audio
    try:
        if hasattr(gnani_client, "synthesize"):
            import inspect
            sig = inspect.signature(gnani_client.synthesize)
            if "case_id" in sig.parameters:
                audio_bytes = await gnani_client.synthesize(
                    text=c.reference_text,
                    language=c.language,
                    voice=c.voice,
                    speed=c.speed,
                    case_id=c.id,
                    injected_fault=injected_fault
                )
            else:
                audio_bytes = await gnani_client.synthesize(
                    text=c.reference_text,
                    language=c.language,
                    voice=c.voice,
                    speed=c.speed
                )
        else:
            raise RuntimeError("Gnani client does not support synthesize")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Timbre synthesis failed: {str(e)}")

    # 2. Save raw audio
    temp_wav = settings.AUDIO_STORE_PATH / f"{run_id}_raw.wav"
    norm_wav = settings.AUDIO_STORE_PATH / f"{run_id}.wav"
    with open(temp_wav, "wb") as f:
        f.write(audio_bytes)

    # Normalize audio to 16kHz mono WAV
    sr, channels, duration_s = normalize_to_standard_wav(str(temp_wav), str(norm_wav), target_sr=16000)
    temp_wav.unlink(missing_ok=True)
    audio_sha256 = compute_sha256(str(norm_wav))

    # 3. Acoustic Analysis
    acoustic_data = analyze_audio_file(str(norm_wav))

    # 4. Transcribe with Prisma
    try:
        import inspect
        sig = inspect.signature(gnani_client.transcribe)
        if "case_id" in sig.parameters:
            stt_res = await gnani_client.transcribe(
                audio_path=str(norm_wav),
                language=c.language,
                case_id=c.id,
                reference_text=c.reference_text,
                is_truncated=(injected_fault == "END_TRUNCATION" or (c.id == "TC-014" and injected_fault != "FIXED"))
            )
        else:
            stt_res = await gnani_client.transcribe(
                audio_path=str(norm_wav),
                language=c.language
            )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Prisma transcription failed: {str(e)}")

    # 5. Execute 6 checks
    critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
    check_results = run_all_checks(
        reference_text=c.reference_text,
        critical_phrases=critical_phrases,
        transcript_text=stt_res.text,
        audio_analysis=acoustic_data,
        pace_min=c.pace_min,
        pace_max=c.pace_max
    )

    # 6. Persist Run and Findings
    db_run = Run(
        id=run_id,
        case_id=c.id,
        source=source,
        status="ANALYSED",
        audio_path=str(norm_wav),
        audio_sha256=audio_sha256,
        duration_s=acoustic_data.get("duration_s", duration_s),
        sample_rate=16000,
        channels=1,
        transcript_text=stt_res.text,
        transcript_words_json=json.dumps(stt_res.words, ensure_ascii=False),
        stt_raw_json=json.dumps(stt_res.raw_json, ensure_ascii=False),
        tts_request_json=json.dumps({"voice": c.voice, "speed": c.speed, "language": c.language}),
        metrics_json=json.dumps(check_results["metrics"], ensure_ascii=False),
        injected_fault=injected_fault
    )
    db.add(db_run)

    for idx, f in enumerate(check_results["findings"]):
        finding_id = f"FND-{run_id}-{idx+1:02d}"
        db_finding = Finding(
            id=finding_id,
            run_id=run_id,
            check_type=f.check_type,
            status=f.status,
            review_state="AUTO_DETECTED",
            severity=f.severity,
            evidence_json=json.dumps(f.evidence, ensure_ascii=False),
            region_start_s=f.region_start_s,
            region_end_s=f.region_end_s
        )
        db.add(db_finding)

    db.commit()
    db.refresh(db_run)
    return {"run_id": run_id, "status": "ANALYSED", "findings_count": len(check_results["findings"])}

@router.post("/{id}/runs/upload")
async def upload_and_analyze(
    id: str,
    file: UploadFile = File(...),
    injected_fault: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Uploads an existing audio recording and runs full analysis."""
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")

    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    raw_path = settings.AUDIO_STORE_PATH / f"{run_id}_raw.wav"
    norm_wav = settings.AUDIO_STORE_PATH / f"{run_id}.wav"

    with open(raw_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    sr, channels, duration_s = normalize_to_standard_wav(str(raw_path), str(norm_wav), target_sr=16000)
    raw_path.unlink(missing_ok=True)
    audio_sha256 = compute_sha256(str(norm_wav))

    acoustic_data = analyze_audio_file(str(norm_wav))

    gnani_client = get_gnani_client()
    try:
        stt_res = await gnani_client.transcribe(audio_path=str(norm_wav), language=c.language)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Prisma transcription failed: {str(e)}")

    critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
    check_results = run_all_checks(
        reference_text=c.reference_text,
        critical_phrases=critical_phrases,
        transcript_text=stt_res.text,
        audio_analysis=acoustic_data,
        pace_min=c.pace_min,
        pace_max=c.pace_max
    )

    db_run = Run(
        id=run_id,
        case_id=c.id,
        source="UPLOAD",
        status="ANALYSED",
        audio_path=str(norm_wav),
        audio_sha256=audio_sha256,
        duration_s=acoustic_data.get("duration_s", duration_s),
        sample_rate=16000,
        channels=1,
        transcript_text=stt_res.text,
        transcript_words_json=json.dumps(stt_res.words, ensure_ascii=False),
        stt_raw_json=json.dumps(stt_res.raw_json, ensure_ascii=False),
        metrics_json=json.dumps(check_results["metrics"], ensure_ascii=False),
        injected_fault=injected_fault
    )
    db.add(db_run)

    for idx, f in enumerate(check_results["findings"]):
        finding_id = f"FND-{run_id}-{idx+1:02d}"
        db_finding = Finding(
            id=finding_id,
            run_id=run_id,
            check_type=f.check_type,
            status=f.status,
            review_state="AUTO_DETECTED",
            severity=f.severity,
            evidence_json=json.dumps(f.evidence, ensure_ascii=False),
            region_start_s=f.region_start_s,
            region_end_s=f.region_end_s
        )
        db.add(db_finding)

    db.commit()
    return {"run_id": run_id, "status": "ANALYSED", "findings_count": len(check_results["findings"])}
