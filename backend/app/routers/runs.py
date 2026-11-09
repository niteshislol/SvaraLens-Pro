import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Run, Finding, Review, ReviewAnnotation
from ..schemas import RunRead, FindingRead, ReviewRead, ReviewAnnotationRead

router = APIRouter(prefix="/runs", tags=["runs"])

@router.get("/{id}", response_model=RunRead)
def get_run_detail(id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    findings = db.query(Finding).filter(Finding.run_id == id).all()
    parsed_findings = []
    for f in findings:
        ev = json.loads(f.evidence_json) if f.evidence_json else {}
        parsed_findings.append(FindingRead(
            id=f.id,
            run_id=f.run_id,
            check_type=f.check_type,
            status=f.status,
            review_state=f.review_state,
            severity=f.severity,
            evidence=ev,
            region_start_s=f.region_start_s,
            region_end_s=f.region_end_s,
            reviewer_note=f.reviewer_note,
            reviewed_by=f.reviewed_by,
            reviewed_at=f.reviewed_at
        ))

    reviews = db.query(Review).filter(Review.run_id == id).all()
    parsed_reviews = []
    for r in reviews:
        ratings = json.loads(r.ratings_json) if r.ratings_json else {}
        annotations = [
            ReviewAnnotationRead(
                id=a.id,
                review_id=a.review_id,
                start_s=a.start_s,
                end_s=a.end_s,
                tag=a.tag,
                comment=a.comment
            ) for a in r.annotations
        ]
        parsed_reviews.append(ReviewRead(
            id=r.id,
            run_id=r.run_id,
            reviewer=r.reviewer,
            ratings=ratings,
            annotations=annotations,
            created_at=r.created_at
        ))

    metrics = json.loads(run.metrics_json) if run.metrics_json else {}
    words = json.loads(run.transcript_words_json) if run.transcript_words_json else []
    dual_results = json.loads(run.stt_dual_results_json) if run.stt_dual_results_json else None
    pins = json.loads(run.defect_pins_json) if run.defect_pins_json else []

    return RunRead(
        id=run.id,
        case_id=run.case_id,
        source=run.source,
        status=run.status,
        audio_path=run.audio_path,
        audio_sha256=run.audio_sha256,
        duration_s=run.duration_s,
        sample_rate=run.sample_rate,
        channels=run.channels,
        tts_model=getattr(run, "tts_model", "timbre-v3.0") or "timbre-v3.0",
        tts_voice=getattr(run, "tts_voice", "Shivani") or "Shivani",
        transcript_text=run.transcript_text,
        transcript_words=words,
        stt_dual_results=dual_results,
        defect_pins=pins,
        metrics=metrics,
        injected_fault=run.injected_fault,
        error=run.error,
        created_at=run.created_at,
        findings=parsed_findings,
        reviews=parsed_reviews
    )

@router.post("/{id}/pins", response_model=RunRead)
def add_defect_pin(id: str, pin_data: dict, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    import uuid
    from datetime import datetime, timezone
    existing_pins = json.loads(run.defect_pins_json) if run.defect_pins_json else []
    new_pin = {
        "id": f"PIN-{uuid.uuid4().hex[:6].upper()}",
        "timestamp_start_s": float(pin_data.get("timestamp_start_s", 0.0)),
        "timestamp_end_s": float(pin_data.get("timestamp_end_s", 0.0)),
        "category": pin_data.get("category", "END_TRUNCATION"),
        "severity": pin_data.get("severity", "HIGH"),
        "note": pin_data.get("note", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    existing_pins.append(new_pin)
    run.defect_pins_json = json.dumps(existing_pins, ensure_ascii=False)
    db.commit()
    return get_run_detail(id, db)

@router.delete("/{id}/pins/{pin_id}", response_model=RunRead)
def remove_defect_pin(id: str, pin_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    existing_pins = json.loads(run.defect_pins_json) if run.defect_pins_json else []
    existing_pins = [p for p in existing_pins if p.get("id") != pin_id]
    run.defect_pins_json = json.dumps(existing_pins, ensure_ascii=False)
    db.commit()
    return get_run_detail(id, db)

@router.get("/{id}/audio")
def get_run_audio(id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == id).first()
    if not run or not run.audio_path:
        raise HTTPException(status_code=404, detail="Audio not found")

    p = Path(run.audio_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Audio file missing on disk")

    return FileResponse(path=str(p), media_type="audio/wav", filename=f"{id}.wav")
