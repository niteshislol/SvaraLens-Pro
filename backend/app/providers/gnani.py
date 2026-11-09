import time
import logging
from typing import Optional
from pathlib import Path
from .base import TTSProvider, ASRProvider, TranscriptResult, SynthesisResult
from ..gnani.mock import get_gnani_client
from ..config import settings

logger = logging.getLogger(__name__)

class GnaniTTSProvider:
    provider_id: str = "gnani"
    
    def __init__(self, model_name: str = "timbre-v2.5"):
        self.model_name = model_name

    async def synthesize(
        self,
        text: str,
        language: str = "hi-IN",
        voice: Optional[str] = None,
        speed: float = 1.0,
        case_id: Optional[str] = None,
        injected_fault: Optional[str] = None,
        channel: str = "standard"
    ) -> SynthesisResult:
        client = get_gnani_client()
        tts_voice = voice if voice and voice != "ananya" else "Nalini"

        t0 = time.perf_counter()
        # Call client synthesis
        try:
            import inspect
            sig = inspect.signature(client.synthesize)
            kwargs = {
                "text": text,
                "language": language,
                "voice": tts_voice,
                "speed": speed,
                "case_id": case_id
            }
            if "injected_fault" in sig.parameters:
                kwargs["injected_fault"] = injected_fault
            audio_bytes = await client.synthesize(**kwargs)
        except Exception as e:
            logger.error(f"Gnani TTS synthesis failed: {e}")
            raise

        latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        # Estimate duration from bytes (16kHz 16-bit mono = 32000 bytes/sec)
        duration_s = max(round(len(audio_bytes) / 32000.0, 2), 0.5)

        return SynthesisResult(
            audio_bytes=audio_bytes,
            sample_rate=16000,
            duration_s=duration_s,
            latency_ms=latency_ms,
            model_name=self.model_name,
            provider_name="Gnani AI",
            voice_used=tts_voice
        )

class GnaniASRProvider:
    provider_id: str = "gnani"

    def __init__(self, model_name: str = "prisma-v2.5"):
        self.model_name = model_name

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN",
        case_id: Optional[str] = None,
        reference_text: Optional[str] = None,
        is_truncated: bool = False,
        mode: str = "standard"
    ) -> TranscriptResult:
        client = get_gnani_client()
        t0 = time.perf_counter()

        res = await client.transcribe(
            audio_path=audio_path,
            language=language,
            case_id=case_id,
            reference_text=reference_text,
            is_truncated=is_truncated
        )

        latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        return TranscriptResult(
            text=res.text,
            words=res.words,
            duration_s=res.duration_s,
            latency_ms=latency_ms,
            raw_json=res.raw_json,
            request_id=res.request_id,
            model_name=self.model_name,
            provider_name="Gnani AI"
        )
