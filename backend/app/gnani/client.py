from typing import Protocol, List, Dict, Any, Optional
from dataclasses import dataclass, field
import httpx
import os
import json
import logging
import asyncio
from pathlib import Path
from ..config import settings

logger = logging.getLogger(__name__)

@dataclass
class TranscriptResult:
    text: str
    words: List[Dict[str, Any]] = field(default_factory=list)
    duration_s: float = 0.0
    raw_json: Dict[str, Any] = field(default_factory=dict)
    request_id: Optional[str] = None

class GnaniClientProtocol(Protocol):
    async def synthesize(
        self,
        text: str,
        language: str = "hi-IN",
        voice: Optional[str] = None,
        speed: float = 1.0,
        case_id: Optional[str] = None,
        injected_fault: Optional[str] = None
    ) -> bytes: ...

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN",
        case_id: Optional[str] = None,
        reference_text: Optional[str] = None,
        is_truncated: bool = False
    ) -> TranscriptResult: ...

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
        injected_fault: Optional[str] = None
    ) -> bytes:
        if not self.api_key:
            raise ValueError("GNANI_API_KEY is not set.")

        url = f"{self.base_url}/api/v1/tts/inference"
        headers = {
            "X-API-Key-ID": self.api_key,
            "Content-Type": "application/json"
        }

        # Map voice or default to Nalini / ananya
        tts_voice = voice if voice and voice != "ananya" else "Nalini"
        tts_lang = "hi-IN" if language in ("hi-IN", "hinglish") else language

        # If injected fault is END_TRUNCATION, artificially trim the prompt for demonstration
        spoken_text = text
        if injected_fault == "END_TRUNCATION":
            # For demonstration, generate speech that omits the final sentence
            sentences = [s.strip() for s in text.replace('।', '.').split('.') if s.strip()]
            if len(sentences) > 1:
                spoken_text = sentences[0] + "।"

        payload = {
            "text": spoken_text,
            "voice": tts_voice,
            "model": settings.TIMBRE_MODEL,
            "language": tts_lang,
            "audio_config": {
                "container": "wav",
                "encoding": "linear_pcm",
                "sample_rate": 16000,
                "num_channels": 1
            }
        }

        # 1 retry with backoff
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    req_id = resp.headers.get("x-api-request-id", "req-live-timbre")
                    logger.info(f"Timbre synthesize {req_id} attempt {attempt+1}: {resp.status_code}")
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
        is_truncated: bool = False
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

        stt_lang = "hi-IN" if language in ("hi-IN", "hinglish") else language

        # 1 retry with backoff
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    with open(path_obj, "rb") as f:
                        files = {"audio_file": (path_obj.name, f, "audio/wav")}
                        data = {
                            "model": settings.PRISMA_MODEL,
                            "language_code": stt_lang
                        }
                        resp = await client.post(url, headers=headers, files=files, data=data)
                    
                    req_id = resp.headers.get("x-api-request-id")
                    logger.info(f"Prisma transcribe {req_id} attempt {attempt+1}: {resp.status_code}")
                    resp.raise_for_status()
                    raw = resp.json()
                    
                    text = raw.get("transcript") or raw.get("output", {}).get("literal", "")
                    words = raw.get("words", [])
                    duration = float(raw.get("duration", raw.get("processing_time", 0.0)))

                    return TranscriptResult(
                        text=text,
                        words=words,
                        duration_s=duration,
                        raw_json=raw,
                        request_id=raw.get("request_id") or req_id
                    )
            except Exception as e:
                logger.warning(f"Prisma attempt {attempt+1} failed: {e}")
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                raise RuntimeError(f"Gnani Prisma transcription failed after retry: {e}") from e

        raise RuntimeError("Gnani Prisma transcription unreachable.")
