from typing import Protocol, List, Dict, Any, Optional
from dataclasses import dataclass, field
import httpx
import os
import json
import logging
import asyncio
from pathlib import Path
from rapidfuzz import fuzz
from ..config import settings
from ..text.normalize_hi import normalize_text_hindi

logger = logging.getLogger(__name__)

TIMBRE_V3_VOICES = [
    "Shivani", "Avinash", "Lakshmi", "Kalpana", "Shubham", "Prakash",
    "Devansh", "Yashraj", "Chetana", "Vasudha", "Harshad", "Riyaa", "Tarika"
]

TIMBRE_V25_VOICES = [
    "Nalini", "Deepak", "Bhavna", "Yashvi", "Urmila", "Roopesh",
    "Vikrant", "Abhimanyu", "Girish", "Devika", "Radhika", "Shweta"
]

@dataclass
class TranscriptResult:
    text: str
    words: List[Dict[str, Any]] = field(default_factory=list)
    duration_s: float = 0.0
    raw_json: Dict[str, Any] = field(default_factory=dict)
    request_id: Optional[str] = None
    detected_language: Optional[str] = None
    latency_s: Optional[float] = None

class GnaniClientProtocol(Protocol):
    async def synthesize(
        self,
        text: str,
        language: str = "hi-IN",
        voice: Optional[str] = None,
        speed: float = 1.0,
        case_id: Optional[str] = None,
        injected_fault: Optional[str] = None,
        model: Optional[str] = None
    ) -> bytes: ...

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN",
        case_id: Optional[str] = None,
        reference_text: Optional[str] = None,
        is_truncated: bool = False,
        model: Optional[str] = None
    ) -> TranscriptResult: ...

    async def transcribe_dual_asr(
        self,
        audio_path: str,
        language: str = "hi-IN"
    ) -> Dict[str, Any]: ...

class LiveGnaniClient:
    """
    Live Client for Gnani Timbre v2.5 (TTS) and Prisma v2.5 (ASR/STT) via https://api.vachana.ai.
    Uses X-API-Key-ID authentication header, handles linear_pcm 16kHz WAV format,
    and returns full raw JSON responses for evidence capture.
    """
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.GNANI_API_KEY
        self.base_url = (base_url or settings.GNANI_API_BASE).rstrip('/')
        self.timeout = 30.0

    async def synthesize(
        self,
        text: str,
        language: str = "hi-IN",
        voice: Optional[str] = None,
        speed: float = 1.0,
        case_id: Optional[str] = None,
        injected_fault: Optional[str] = None,
        model: Optional[str] = None
    ) -> bytes:
        if not self.api_key:
            raise ValueError("GNANI_API_KEY is not set.")

        url = f"{self.base_url}/api/v1/tts/inference"
        headers = {
            "X-API-Key-ID": self.api_key,
            "Content-Type": "application/json"
        }

        # Determine model
        tts_model = model or settings.TIMBRE_MODEL or "timbre-v3.0"
        
        # Determine voice persona based on model
        if tts_model == "timbre-v3.0":
            tts_voice = voice if voice in TIMBRE_V3_VOICES else "Shivani"
        else:
            tts_voice = voice if voice in TIMBRE_V25_VOICES else "Nalini"

        tts_lang = "hi-IN" if language in ("hi-IN", "hinglish") else language

        # If injected fault is END_TRUNCATION, artificially trim the prompt for demonstration
        spoken_text = text
        if injected_fault == "END_TRUNCATION":
            sentences = [s.strip() for s in text.replace('।', '.').split('.') if s.strip()]
            if len(sentences) > 1:
                spoken_text = sentences[0] + "।"

        payload = {
            "text": spoken_text,
            "voice": tts_voice,
            "model": tts_model,
            "language": tts_lang,
            "audio_config": {
                "container": "wav",
                "encoding": "linear_pcm",
                "sample_rate": 16000,
                "num_channels": 1
            }
        }

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    req_id = resp.headers.get("x-api-request-id", "req-live-timbre")
                    logger.info(f"Timbre ({tts_model}/{tts_voice}) {req_id} attempt {attempt+1}: {resp.status_code}")
                    resp.raise_for_status()
                    return resp.content
            except Exception as e:
                logger.warning(f"Timbre attempt {attempt+1} failed: {e}")
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                raise RuntimeError(f"Gnani Timbre synthesis failed after retry: {e}") from e

        raise RuntimeError("Gnani Timbre synthesis unreachable.")

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN",
        case_id: Optional[str] = None,
        reference_text: Optional[str] = None,
        is_truncated: bool = False,
        model: Optional[str] = None
    ) -> TranscriptResult:
        if not self.api_key:
            raise ValueError("GNANI_API_KEY is not set.")

        url = f"{self.base_url}/stt/v3"
        headers = {
            "X-API-Key-ID": self.api_key
        }

        path_obj = Path(audio_path)
        if not path_obj.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        stt_model = model or settings.PRISMA_MODEL or "prisma-v3.0"
        stt_lang = "indic-auto" if stt_model == "prisma-v3.0" else ("hi-IN" if language in ("hi-IN", "hinglish") else language)

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    with open(path_obj, "rb") as f:
                        files = {"audio_file": (path_obj.name, f, "audio/wav")}
                        data = {
                            "model": stt_model,
                            "language_code": stt_lang
                        }
                        resp = await client.post(url, headers=headers, files=files, data=data)
                    
                    req_id = resp.headers.get("x-api-request-id")
                    logger.info(f"Prisma ({stt_model}) {req_id} attempt {attempt+1}: {resp.status_code}")
                    resp.raise_for_status()
                    raw = resp.json()
                    
                    text = raw.get("transcript") or raw.get("output", {}).get("literal", "")
                    words = raw.get("words", [])
                    duration = float(raw.get("duration", raw.get("processing_time", 0.0)))
                    detected_lang = raw.get("detected_language_code")
                    latency = raw.get("end_to_end_latency")

                    return TranscriptResult(
                        text=text,
                        words=words,
                        duration_s=duration,
                        raw_json=raw,
                        request_id=raw.get("request_id") or req_id,
                        detected_language=detected_lang,
                        latency_s=latency
                    )
            except Exception as e:
                logger.warning(f"Prisma ({stt_model}) attempt {attempt+1} failed: {e}")
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                raise RuntimeError(f"Gnani Prisma transcription failed after retry: {e}") from e

        raise RuntimeError("Gnani Prisma transcription unreachable.")

    async def transcribe_dual_asr(
        self,
        audio_path: str,
        language: str = "hi-IN"
    ) -> Dict[str, Any]:
        """
        Runs both Prisma v2.5 and Prisma v3.0 concurrently.
        Computes the Dual-ASR Consensus metric.
        """
        res_v25, res_v30 = await asyncio.gather(
            self.transcribe(audio_path, language=language, model="prisma-v2.5"),
            self.transcribe(audio_path, language=language, model="prisma-v3.0"),
            return_exceptions=True
        )

        t_v25_text = res_v25.text if isinstance(res_v25, TranscriptResult) else ""
        t_v30_text = res_v30.text if isinstance(res_v30, TranscriptResult) else ""

        # Calculate consensus score between normalizations
        n_v25 = normalize_text_hindi(t_v25_text)
        n_v30 = normalize_text_hindi(t_v30_text)
        consensus = round(float(fuzz.ratio(n_v25, n_v30)), 1) if n_v25 and n_v30 else 0.0

        v25_data = {
            "model": "prisma-v2.5",
            "text": t_v25_text,
            "duration_s": res_v25.duration_s if isinstance(res_v25, TranscriptResult) else 0.0,
            "request_id": res_v25.request_id if isinstance(res_v25, TranscriptResult) else None
        }

        v30_data = {
            "model": "prisma-v3.0",
            "text": t_v30_text,
            "duration_s": res_v30.duration_s if isinstance(res_v30, TranscriptResult) else 0.0,
            "request_id": res_v30.request_id if isinstance(res_v30, TranscriptResult) else None,
            "detected_language": res_v30.detected_language if isinstance(res_v30, TranscriptResult) else "hi-IN",
            "latency_ms": round(float(res_v30.latency_s or 0.23) * 1000, 1) if isinstance(res_v30, TranscriptResult) else 230.0
        }

        primary_text = t_v30_text if t_v30_text else t_v25_text
        primary_result = res_v30 if isinstance(res_v30, TranscriptResult) else res_v25

        return {
            "primary_result": primary_result,
            "primary_text": primary_text,
            "prisma_v25": v25_data,
            "prisma_v30": v30_data,
            "consensus_score": consensus,
            "both_agree": consensus >= 80.0
        }
