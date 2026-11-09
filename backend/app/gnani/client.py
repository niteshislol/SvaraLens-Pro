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
        speed: float = 1.0
    ) -> bytes: ...

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN"
    ) -> TranscriptResult: ...

class LiveGnaniClient:
    """
    Client for Gnani Timbre v2.5 (TTS) and Prisma v2.5 (ASR/STT).
    Implements 30s timeout, 1 retry with exponential backoff, logs request IDs,
    and returns raw response JSON for evidence preservation.
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
        speed: float = 1.0
    ) -> bytes:
        if not self.api_key:
            raise ValueError("GNANI_API_KEY is not set.")

        url = f"{self.base_url}/v1/tts/synthesize"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "language": language,
            "voice": voice or "ananya",
            "speed": speed,
            "model": settings.TIMBRE_MODEL
        }

        # 1 retry with backoff
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    req_id = resp.headers.get("x-request-id", "req-live-timbre")
                    logger.info(f"Timbre synthesize call {req_id} attempt {attempt+1}: {resp.status_code}")
                    resp.raise_for_status()
                    return resp.content
            except Exception as e:
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                raise RuntimeError(f"Gnani Timbre synthesis failed after retry: {e}") from e

        raise RuntimeError("Gnani Timbre synthesis unreachable.")

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN"
    ) -> TranscriptResult:
        if not self.api_key:
            raise ValueError("GNANI_API_KEY is not set.")

        url = f"{self.base_url}/v1/asr/transcribe"
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        path_obj = Path(audio_path)
        if not path_obj.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # 1 retry with backoff
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    with open(path_obj, "rb") as f:
                        files = {"audio": (path_obj.name, f, "audio/wav")}
                        data = {
                            "language": language,
                            "model": settings.PRISMA_MODEL,
                            "word_timestamps": "true"
                        }
                        resp = await client.post(url, headers=headers, files=files, data=data)
                    req_id = resp.headers.get("x-request-id", "req-live-prisma")
                    logger.info(f"Prisma transcribe call {req_id} attempt {attempt+1}: {resp.status_code}")
                    resp.raise_for_status()
                    raw = resp.json()
                    
                    text = raw.get("transcript") or raw.get("text", "")
                    words = raw.get("words", [])
                    duration = float(raw.get("duration", 0.0))

                    return TranscriptResult(
                        text=text,
                        words=words,
                        duration_s=duration,
                        raw_json=raw,
                        request_id=req_id
                    )
            except Exception as e:
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                raise RuntimeError(f"Gnani Prisma transcription failed after retry: {e}") from e

        raise RuntimeError("Gnani Prisma transcription unreachable.")
