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
    existing_ids = {c[0] for c in db.query(TestCase.id).all()}
    i = 1
    while f"TC-{i:03d}" in existing_ids:
        i += 1
    return f"TC-{i:03d}"

@router.get("", response_model=List[TestCaseRead])
def list_test_cases(
    suite_id: Optional[str] = None,
    search: Optional[str] = None,
    language: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(TestCase)
    if suite_id:
        query = query.filter(TestCase.suite_id == suite_id)
    if language and language != "ALL":
        query = query.filter(TestCase.language == language)
    if severity and severity != "ALL":
        query = query.filter(TestCase.severity == severity)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            (TestCase.id.ilike(search_filter)) |
            (TestCase.scenario.ilike(search_filter)) |
            (TestCase.reference_text.ilike(search_filter))
        )
    cases = query.order_by(TestCase.id).all()
    
    results = []
    for c in cases:
        critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
        critical_entities = json.loads(c.critical_entities_json) if getattr(c, "critical_entities_json", None) else None
        results.append(TestCaseRead(
            id=c.id,
            suite_id=c.suite_id,
            scenario=c.scenario,
            title=getattr(c, "title", None) or c.scenario,
            description=getattr(c, "description", None),
            language=c.language,
            dialect=getattr(c, "dialect", "standard") or "standard",
            reference_text=c.reference_text,
            critical_phrases=critical_phrases,
            critical_entities=critical_entities,
            voice=c.voice or "Shivani",
            tts_model=getattr(c, "tts_model", "timbre-v3.0") or "timbre-v3.0",
            speed=c.speed,
            channel=c.channel,
            sample_rate=getattr(c, "sample_rate", 16000) or 16000,
            pace_min=c.pace_min,
            pace_max=c.pace_max,
            severity=c.severity,
            is_synthetic=c.is_synthetic,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))
    return results

@router.get("/export")
def export_test_cases(
    suite_id: Optional[str] = Query(None),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db)
):
    """
    Exports test scenarios as JSON or CSV per Section 5 of Master Build Document.
    """
    query = db.query(TestCase)
    if suite_id:
        query = query.filter(TestCase.suite_id == suite_id)
    cases = query.order_by(TestCase.id).all()

    if format == "json":
        data = []
        for c in cases:
            data.append({
                "id": c.id,
                "suite_id": c.suite_id,
                "scenario": c.scenario,
                "language": c.language,
                "reference_text": c.reference_text,
                "critical_phrases": json.loads(c.critical_phrases_json) if c.critical_phrases_json else [],
                "voice": c.voice,
                "tts_model": getattr(c, "tts_model", "timbre-v3.0"),
                "channel": c.channel,
                "severity": c.severity
            })
        return data
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["scenario", "language", "reference_text", "critical_phrases", "severity"])
        for c in cases:
            phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
            phrase_str = "|".join([p.get("text", "") for p in phrases])
            writer.writerow([c.scenario, c.language, c.reference_text, phrase_str, c.severity])
        from fastapi.responses import Response
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=test_cases.csv"}
        )

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
        existing.voice = case_in.voice or "Shivani"
        if hasattr(existing, "tts_model"):
            existing.tts_model = case_in.tts_model or "timbre-v3.0"
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
            voice=case_in.voice or "Shivani",
            tts_model=case_in.tts_model or "timbre-v3.0",
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
        voice=db_case.voice or "Shivani",
        tts_model=getattr(db_case, "tts_model", "timbre-v3.0") or "timbre-v3.0",
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
    critical_entities = json.loads(c.critical_entities_json) if getattr(c, "critical_entities_json", None) else None
    return TestCaseRead(
        id=c.id,
        suite_id=c.suite_id,
        scenario=c.scenario,
        title=getattr(c, "title", None) or c.scenario,
        description=getattr(c, "description", None),
        language=c.language,
        dialect=getattr(c, "dialect", "standard") or "standard",
        reference_text=c.reference_text,
        critical_phrases=critical_phrases,
        critical_entities=critical_entities,
        voice=c.voice or "Shivani",
        tts_model=getattr(c, "tts_model", "timbre-v3.0") or "timbre-v3.0",
        speed=c.speed,
        channel=c.channel,
        sample_rate=getattr(c, "sample_rate", 16000) or 16000,
        pace_min=c.pace_min,
        pace_max=c.pace_max,
        severity=c.severity,
        is_synthetic=c.is_synthetic,
        created_at=c.created_at,
        updated_at=c.updated_at
    )

@router.patch("/{id}", response_model=TestCaseRead)
def update_test_case(id: str, case_in: TestCaseUpdate, db: Session = Depends(get_db)):
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    if case_in.scenario is not None:
        c.scenario = case_in.scenario
    if case_in.title is not None:
        c.title = case_in.title
    if case_in.description is not None:
        c.description = case_in.description
    if case_in.language is not None:
        c.language = case_in.language
    if case_in.dialect is not None:
        c.dialect = case_in.dialect
    if case_in.reference_text is not None:
        c.reference_text = case_in.reference_text
    if case_in.critical_phrases is not None:
        c.critical_phrases_json = json.dumps([cp.model_dump() for cp in case_in.critical_phrases], ensure_ascii=False)
    if case_in.critical_entities is not None:
        c.critical_entities_json = json.dumps(case_in.critical_entities, ensure_ascii=False)
    if case_in.voice is not None:
        c.voice = case_in.voice
    if case_in.tts_model is not None:
        c.tts_model = case_in.tts_model
    if case_in.speed is not None:
        c.speed = case_in.speed
    if case_in.channel is not None:
        c.channel = case_in.channel
    if case_in.sample_rate is not None:
        c.sample_rate = case_in.sample_rate
    if case_in.pace_min is not None:
        c.pace_min = case_in.pace_min
    if case_in.pace_max is not None:
        c.pace_max = case_in.pace_max
    if case_in.severity is not None:
        c.severity = case_in.severity

    c.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(c)

    critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
    critical_entities = json.loads(c.critical_entities_json) if getattr(c, "critical_entities_json", None) else None
    return TestCaseRead(
        id=c.id,
        suite_id=c.suite_id,
        scenario=c.scenario,
        title=getattr(c, "title", None) or c.scenario,
        description=getattr(c, "description", None),
        language=c.language,
        dialect=getattr(c, "dialect", "standard") or "standard",
        reference_text=c.reference_text,
        critical_phrases=critical_phrases,
        critical_entities=critical_entities,
        voice=c.voice or "Shivani",
        tts_model=getattr(c, "tts_model", "timbre-v3.0") or "timbre-v3.0",
        speed=c.speed,
        channel=c.channel,
        sample_rate=getattr(c, "sample_rate", 16000) or 16000,
        pace_min=c.pace_min,
        pace_max=c.pace_max,
        severity=c.severity,
        is_synthetic=c.is_synthetic,
        created_at=c.created_at,
        updated_at=c.updated_at
    )

@router.post("/{id}/duplicate", response_model=TestCaseRead, status_code=201)
def duplicate_test_case(id: str, db: Session = Depends(get_db)):
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    new_id = get_next_case_id(db)
    new_case = TestCase(
        id=new_id,
        suite_id=c.suite_id,
        scenario=f"Copy of {c.scenario}",
        title=f"Copy of {getattr(c, 'title', None) or c.scenario}",
        description=getattr(c, "description", None),
        language=c.language,
        dialect=getattr(c, "dialect", "standard") or "standard",
        reference_text=c.reference_text,
        critical_phrases_json=c.critical_phrases_json,
        critical_entities_json=getattr(c, "critical_entities_json", None),
        voice=c.voice,
        tts_model=getattr(c, "tts_model", "timbre-v3.0"),
        speed=c.speed,
        channel=c.channel,
        sample_rate=getattr(c, "sample_rate", 16000) or 16000,
        pace_min=c.pace_min,
        pace_max=c.pace_max,
        severity=c.severity,
        is_synthetic=c.is_synthetic
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    critical_phrases = json.loads(new_case.critical_phrases_json) if new_case.critical_phrases_json else []
    critical_entities = json.loads(new_case.critical_entities_json) if new_case.critical_entities_json else None
    return TestCaseRead(
        id=new_case.id,
        suite_id=new_case.suite_id,
        scenario=new_case.scenario,
        title=new_case.title,
        description=new_case.description,
        language=new_case.language,
        dialect=new_case.dialect,
        reference_text=new_case.reference_text,
        critical_phrases=critical_phrases,
        critical_entities=critical_entities,
        voice=new_case.voice or "Shivani",
        tts_model=new_case.tts_model or "timbre-v3.0",
        speed=new_case.speed,
        channel=new_case.channel,
        sample_rate=new_case.sample_rate or 16000,
        pace_min=new_case.pace_min,
        pace_max=new_case.pace_max,
        severity=new_case.severity,
        is_synthetic=new_case.is_synthetic,
        created_at=new_case.created_at,
        updated_at=new_case.updated_at
    )

@router.delete("/{id}")
def delete_test_case(id: str, force: bool = Query(False), db: Session = Depends(get_db)):
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    # Safeguard against deleting scenarios with active defect capsules
    active_capsules = [cap.id for cap in c.capsules if cap.state in ("OPEN", "REOPENED")]
    if active_capsules and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete scenario '{id}' because it has {len(active_capsules)} active Voice Defect Capsule(s) ({', '.join(active_capsules)}). Resolve or archive capsules first, or pass ?force=true."
        )

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
    Returns a comprehensive summary: total_rows, imported, skipped, failed, failure_reasons.
    """
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or "scenario" not in reader.fieldnames or "reference_text" not in reader.fieldnames:
        return {
            "total_rows": 0,
            "imported": 0,
            "skipped": 0,
            "failed": 1,
            "failure_reasons": ["CSV missing required header columns: 'scenario' and 'reference_text'"]
        }

    total_rows = 0
    created = 0
    skipped = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        total_rows += 1
        try:
            scenario = row.get("scenario", "").strip()
            lang = row.get("language", "hi-IN").strip()
            ref = row.get("reference_text", "").strip()
            phrases_raw = row.get("critical_phrases", "").strip()
            severity = row.get("severity", "HIGH").strip().upper()

            if not scenario or not ref:
                errors.append(f"Row {idx}: missing required scenario title or reference_text")
                skipped += 1
                continue

            if lang not in ("hi-IN", "hinglish"):
                lang = "hi-IN"  # fallback with warning
            
            if severity not in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'):
                severity = "HIGH"

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
                title=scenario,
                language=lang,
                dialect="standard",
                reference_text=ref,
                critical_phrases_json=json.dumps(crit_phrases, ensure_ascii=False),
                voice="Shivani",
                tts_model="timbre-v3.0",
                speed=1.0,
                channel="standard",
                sample_rate=16000,
                severity=severity,
                is_synthetic=1
            )
            db.add(db_case)
            db.commit()
            created += 1
        except Exception as e:
            db.rollback()
            errors.append(f"Row {idx}: {str(e)}")

    return {
        "total_rows": total_rows,
        "imported": created,
        "skipped": skipped,
        "failed": len(errors),
        "failure_reasons": errors
    }

@router.post("/{id}/runs/generate")
async def generate_and_analyze(
    id: str,
    tts_model: Optional[str] = Query(None, description="Model: timbre-v3.0 or timbre-v2.5"),
    tts_voice: Optional[str] = Query(None, description="Voice: Shivani, Avinash, Nalini, Deepak, etc."),
    injected_fault: Optional[str] = Query(None, description="Optional fault to inject: END_TRUNCATION, CLIPPING, SILENCE"),
    db: Session = Depends(get_db)
):
    """
    Step 1: Calls Gnani Timbre (v3.0 or v2.5) to synthesize speech.
    Step 2: Saves audio to storage/audio and normalizes to standard 16kHz WAV.
    Step 3: Calls Dual-ASR Jury (Prisma v2.5 + Prisma v3.0 in parallel) to transcribe audio.
    Step 4: Executes 6 checks and persists findings, telemetry, and consensus.
    """
    c = db.query(TestCase).filter(TestCase.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Test case not found")

    gnani_client = get_gnani_client()
    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    source = "MOCK_FIXTURE" if settings.MOCK_MODE or not settings.GNANI_API_KEY else "TIMBRE_LIVE"

    model_name = tts_model or getattr(c, "tts_model", None) or "timbre-v3.0"
    voice_name = tts_voice or c.voice or ("Shivani" if model_name == "timbre-v3.0" else "Nalini")

    # 1. Synthesize audio
    try:
        audio_bytes = await gnani_client.synthesize(
            text=c.reference_text,
            language=c.language,
            voice=voice_name,
            speed=c.speed,
            case_id=c.id,
            injected_fault=injected_fault,
            model=model_name
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Timbre ({model_name}) synthesis failed: {str(e)}")

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

    # 4. Transcribe with Dual-ASR Jury (Prisma v2.5 + Prisma v3.0)
    try:
        dual_asr = await gnani_client.transcribe_dual_asr(
            audio_path=str(norm_wav),
            language=c.language,
            reference_text=c.reference_text
        )
        stt_res = dual_asr["primary_result"]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Prisma transcription failed: {str(e)}")

    # 5. Execute 6 checks on primary transcript
    critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
    check_results = run_all_checks(
        reference_text=c.reference_text,
        critical_phrases=critical_phrases,
        transcript_text=stt_res.text,
        audio_analysis=acoustic_data,
        pace_min=c.pace_min,
        pace_max=c.pace_max
    )

    # 6. Persist Run, Dual-ASR Telemetry, and Findings
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
        tts_model=model_name,
        tts_voice=voice_name,
        transcript_text=stt_res.text,
        transcript_words_json=json.dumps(stt_res.words, ensure_ascii=False),
        stt_raw_json=json.dumps(stt_res.raw_json, ensure_ascii=False),
        stt_dual_results_json=json.dumps({
            "prisma_v25": dual_asr.get("prisma_v25"),
            "prisma_v30": dual_asr.get("prisma_v30"),
            "consensus_score": dual_asr.get("consensus_score", 100.0),
            "both_agree": dual_asr.get("both_agree", True)
        }, ensure_ascii=False),
        tts_request_json=json.dumps({"model": model_name, "voice": voice_name, "speed": c.speed, "language": c.language}),
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
        dual_asr = await gnani_client.transcribe_dual_asr(
            audio_path=str(norm_wav),
            language=c.language,
            reference_text=c.reference_text
        )
        stt_res = dual_asr["primary_result"]
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
        tts_model="EXTERNAL_UPLOAD",
        tts_voice="EXTERNAL_RECORDING",
        transcript_text=stt_res.text,
        transcript_words_json=json.dumps(stt_res.words, ensure_ascii=False),
        stt_raw_json=json.dumps(stt_res.raw_json, ensure_ascii=False),
        stt_dual_results_json=json.dumps({
            "prisma_v25": dual_asr.get("prisma_v25"),
            "prisma_v30": dual_asr.get("prisma_v30"),
            "consensus_score": dual_asr.get("consensus_score", 100.0),
            "both_agree": dual_asr.get("both_agree", True)
        }, ensure_ascii=False),
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
