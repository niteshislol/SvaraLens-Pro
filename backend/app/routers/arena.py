import uuid
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import TestCase, Suite
from ..config import settings
from ..providers.registry import get_tts_provider, get_asr_provider, list_registry_models
from ..audio.telephony import simulate_telephony_channel
from ..audio.analyze import analyze_audio_file
from ..checks.runner import run_all_checks
from ..text.compare import compute_wer_cer

router = APIRouter(prefix="/arena", tags=["arena"])

class ArenaCompareRequest(BaseModel):
    case_id: Optional[str] = None
    reference_text: Optional[str] = None
    language: str = "hi-IN"
    tts_model: str = "timbre-v2.5"
    voice: Optional[str] = "Nalini"
    model_a: str = "prisma-v2.5"
    model_b: str = "whisper-large-v3"
    channel: str = "standard"  # standard, pstn_8k, noisy_telephony
    injected_fault: Optional[str] = None

@router.get("/models")
def get_available_models():
    """Returns all supported TTS and ASR models with capabilities."""
    return list_registry_models()

@router.post("/compare")
async def compare_models_in_arena(
    req: ArenaCompareRequest,
    db: Session = Depends(get_db)
):
    """
    Multi-Model Arena Evaluation:
    Generates speech via TTS provider, applies acoustic channel simulation (16kHz / PSTN 8kHz / Noisy),
    and benchmarks Model A vs Model B side-by-side.
    Computes comparative WER, CER, latency, critical phrase retention, and Gnani Research defect checks.
    """
    ref_text = req.reference_text
    critical_phrases = []

    # If case_id provided, load case defaults
    if req.case_id:
        c = db.query(TestCase).filter(TestCase.id == req.case_id).first()
        if c:
            ref_text = ref_text or c.reference_text
            import json
            critical_phrases = json.loads(c.critical_phrases_json) if c.critical_phrases_json else []
            req.language = c.language

    if not ref_text:
        ref_text = "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।"
        critical_phrases = [
            {"text": "₹4,250", "variants": ["4250", "4,250"], "severity": "HIGH"},
            {"text": "12 नवंबर", "variants": ["12 november", "बारह नवंबर"], "severity": "HIGH"},
            {"text": "विलंब शुल्क", "variants": ["late fee", "late charge"], "severity": "CRITICAL"}
        ]

    # Step 1: Synthesize audio
    tts = get_tts_provider(req.tts_model)
    session_id = f"ARENA-{uuid.uuid4().hex[:8].upper()}"
    raw_wav_path = settings.AUDIO_STORE_PATH / f"{session_id}_raw.wav"
    active_wav_path = raw_wav_path

    try:
        synth_res = await tts.synthesize(
            text=ref_text,
            language=req.language,
            voice=req.voice,
            case_id=req.case_id,
            injected_fault=req.injected_fault,
            channel=req.channel
        )
        with open(raw_wav_path, "wb") as f:
            f.write(synth_res.audio_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")

    # Step 2: Apply channel simulation if requested (PSTN 8k G.711 or KathBath Noisy)
    channel_meta = {"channel": req.channel, "sample_rate": 16000, "codec": "linear_pcm"}
    if req.channel in ("pstn_8k", "noisy_telephony"):
        channel_wav_path = settings.AUDIO_STORE_PATH / f"{session_id}_{req.channel}.wav"
        try:
            channel_meta = simulate_telephony_channel(
                str(raw_wav_path),
                str(channel_wav_path),
                channel_mode=req.channel,
                snr_db=18.0
            )
            active_wav_path = channel_wav_path
        except Exception as e:
            # Fallback to raw if channel filter fails
            pass

    # Acoustic analysis of final audio
    audio_analysis = analyze_audio_file(str(active_wav_path))

    # Step 3: Run Model A
    asr_a = get_asr_provider(req.model_a)
    is_trunc = req.injected_fault == "END_TRUNCATION"
    res_a = await asr_a.transcribe(
        audio_path=str(active_wav_path),
        language=req.language,
        case_id=req.case_id,
        reference_text=ref_text,
        is_truncated=is_trunc
    )
    checks_a = run_all_checks(
        reference_text=ref_text,
        critical_phrases=critical_phrases,
        transcript_text=res_a.text,
        audio_analysis=audio_analysis
    )

    # Step 4: Run Model B
    asr_b = get_asr_provider(req.model_b)
    res_b = await asr_b.transcribe(
        audio_path=str(active_wav_path),
        language=req.language,
        case_id=req.case_id,
        reference_text=ref_text,
        is_truncated=is_trunc
    )
    checks_b = run_all_checks(
        reference_text=ref_text,
        critical_phrases=critical_phrases,
        transcript_text=res_b.text,
        audio_analysis=audio_analysis
    )

    audio_url = f"/api/audio/{active_wav_path.name}"

    return {
        "session_id": session_id,
        "reference_text": ref_text,
        "language": req.language,
        "channel_meta": channel_meta,
        "audio_url": audio_url,
        "duration_s": audio_analysis.get("duration_s", 0.0),
        "tts_result": {
            "model": req.tts_model,
            "provider": synth_res.provider_name,
            "voice": synth_res.voice_used,
            "latency_ms": synth_res.latency_ms
        },
        "model_a": {
            "model_id": req.model_a,
            "provider": res_a.provider_name,
            "transcript": res_a.text,
            "latency_ms": res_a.latency_ms,
            "metrics": checks_a["metrics"],
            "findings": checks_a["findings"]
        },
        "model_b": {
            "model_id": req.model_b,
            "provider": res_b.provider_name,
            "transcript": res_b.text,
            "latency_ms": res_b.latency_ms,
            "metrics": checks_b["metrics"],
            "findings": checks_b["findings"]
        },
        "delta": {
            "wer_diff": round(checks_a["metrics"]["wer"] - checks_b["metrics"]["wer"], 4),
            "cer_diff": round(checks_a["metrics"]["cer"] - checks_b["metrics"]["cer"], 4),
            "latency_diff_ms": round(res_a.latency_ms - res_b.latency_ms, 1),
            "faster_model": req.model_a if res_a.latency_ms < res_b.latency_ms else req.model_b,
            "more_accurate_model": req.model_a if checks_a["metrics"]["wer"] <= checks_b["metrics"]["wer"] else req.model_b
        }
    }
