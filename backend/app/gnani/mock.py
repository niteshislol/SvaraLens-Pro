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
        # Fundamental frequency ~ 180 Hz with harmonics simulating speech
        tone = (
            0.35 * np.sin(2 * np.pi * 180 * t) +
            0.20 * np.sin(2 * np.pi * 360 * t) +
            0.15 * np.sin(2 * np.pi * 540 * t) +
            0.10 * np.sin(2 * np.pi * 720 * t)
        )
        # Add slight natural amplitude modulation (syllabic envelope ~ 3.5 Hz)
        envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 3.5 * t)
        tone = tone * envelope

        # If not abrupt cutoff, apply natural 150ms fade-out at the end
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
        injected_fault: Optional[str] = None
    ) -> bytes:
        """
        Synthesizes mock audio.
        If injected_fault is 'END_TRUNCATION', creates a 4.2s clip with abrupt cutoff.
        Otherwise creates a 5.6s natural speech clip with clean fade-out.
        """
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
        is_truncated: bool = False
    ) -> TranscriptResult:
        """
        Returns mock transcript result.
        If is_truncated is True, omits the last disclosure sentence.
        """
        if is_truncated:
            transcript = "आपका अगला प्रीमियम भुगतान 4,250 रुपये 12 नवंबर को देय है"
            raw = {
                "transcript": transcript,
                "model": "prisma-v2.5-mock",
                "language": language,
                "duration": 4.2,
                "words": [
                    {"word": "आपका", "start": 0.0, "end": 0.4},
                    {"word": "अगला", "start": 0.4, "end": 0.8},
                    {"word": "प्रीमियम", "start": 0.8, "end": 1.4},
                    {"word": "भुगतान", "start": 1.4, "end": 1.9},
                    {"word": "4,250", "start": 1.9, "end": 2.7},
                    {"word": "रुपये", "start": 2.7, "end": 3.1},
                    {"word": "12", "start": 3.1, "end": 3.4},
                    {"word": "नवंबर", "start": 3.4, "end": 3.8},
                    {"word": "को", "start": 3.8, "end": 4.0},
                    {"word": "देय", "start": 4.0, "end": 4.1},
                    {"word": "है", "start": 4.1, "end": 4.2}
                ]
            }
        else:
            ref = reference_text or "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।"
            transcript = ref.replace("₹", "").strip()
            raw = {
                "transcript": transcript,
                "model": "prisma-v2.5-mock",
                "language": language,
                "duration": 5.8,
                "words": []
            }

        return TranscriptResult(
            text=transcript,
            words=raw.get("words", []),
            duration_s=raw.get("duration", 5.0),
            raw_json=raw,
            request_id="mock-req-001"
        )

def get_gnani_client() -> GnaniClientProtocol:
    """Returns Live client if MOCK_MODE is False and API key is present, else Mock client."""
    if not settings.MOCK_MODE and settings.GNANI_API_KEY:
        return LiveGnaniClient()
    return MockGnaniClient()
