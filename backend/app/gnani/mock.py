import wave
import json
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any
from .client import TranscriptResult, GnaniClientProtocol
from ..config import settings
from ..audio.normalize import save_float32_as_wav16

class MockGnaniClient(GnaniClientProtocol):
    """
    Mock Gnani client that generates synthetic audio fixtures and transcribed fixtures.
    Allows full end-to-end development and demo execution even before external API keys are configured.
    Sets run source to MOCK_FIXTURE and saves raw responses.
    """
    def __init__(self, fixtures_dir: Optional[Path] = None):
        self.fixtures_dir = fixtures_dir or settings.FIXTURES_PATH
        self.fixtures_dir.mkdir(parents=True, exist_ok=True)

    def _generate_synthetic_tone(self, duration_s: float, abrupt_cutoff: bool = False, sr: int = 16000) -> bytes:
        """Generates a pleasant multi-harmonic vocal-like tone sequence."""
        t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)
        tone = (
            0.35 * np.sin(2 * np.pi * 180 * t) +
            0.20 * np.sin(2 * np.pi * 360 * t) +
            0.15 * np.sin(2 * np.pi * 540 * t) +
            0.10 * np.sin(2 * np.pi * 720 * t)
        )
        envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 3.5 * t)
        tone = tone * envelope

        if not abrupt_cutoff:
            fade_len = min(int(sr * 0.15), len(tone))
            fade = np.linspace(1.0, 0.0, fade_len)
            tone[-fade_len:] *= fade

        clipped = np.clip(tone, -1.0, 1.0)
        int16_data = (clipped * 32767.0).astype(np.int16)

        import io
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(int16_data.tobytes())
        return buf.getvalue()

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
        if injected_fault == "END_TRUNCATION":
            return self._generate_synthetic_tone(duration_s=4.2, abrupt_cutoff=True)
        else:
            return self._generate_synthetic_tone(duration_s=5.8, abrupt_cutoff=False)

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN",
        case_id: Optional[str] = None,
        reference_text: Optional[str] = None,
        is_truncated: bool = False,
        model: Optional[str] = None
    ) -> TranscriptResult:
        if is_truncated:
            transcript = "आपका अगला प्रीमियम भुगतान 4,250 रुपये 12 नवंबर को देय है"
            raw = {
                "transcript": transcript,
                "model": model or "prisma-v3.0-mock",
                "language": language,
                "duration": 4.2,
                "words": []
            }
        else:
            ref = reference_text or "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।"
            transcript = ref.replace("₹", "").strip()
            raw = {
                "transcript": transcript,
                "model": model or "prisma-v3.0-mock",
                "language": language,
                "duration": 5.8,
                "words": []
            }

        return TranscriptResult(
            text=transcript,
            words=raw.get("words", []),
            duration_s=raw.get("duration", 5.0),
            raw_json=raw,
            request_id="mock-req-001",
            detected_language="hi-IN",
            latency_s=0.23
        )

    async def transcribe_dual_asr(
        self,
        audio_path: str,
        language: str = "hi-IN",
        reference_text: Optional[str] = None
    ) -> Dict[str, Any]:
        t_res = await self.transcribe(audio_path, language=language, reference_text=reference_text)
        return {
            "primary_result": t_res,
            "primary_text": t_res.text,
            "prisma_v25": {
                "model": "prisma-v2.5",
                "text": t_res.text,
                "duration_s": t_res.duration_s,
                "request_id": "mock-v25"
            },
            "prisma_v30": {
                "model": "prisma-v3.0",
                "text": t_res.text,
                "duration_s": t_res.duration_s,
                "request_id": "mock-v30",
                "detected_language": "hi-IN",
                "latency_ms": 235.0
            },
            "consensus_score": 100.0,
            "both_agree": True
        }

def get_gnani_client() -> GnaniClientProtocol:
    """Returns Live client if MOCK_MODE is False and API key is present, else Mock client."""
    if not settings.MOCK_MODE and settings.GNANI_API_KEY:
        from .client import LiveGnaniClient
        return LiveGnaniClient()
    return MockGnaniClient()
