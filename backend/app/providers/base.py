from dataclasses import dataclass, field
from typing import Protocol, List, Dict, Any, Optional

@dataclass
class TranscriptResult:
    text: str
    words: List[Dict[str, Any]] = field(default_factory=list)
    duration_s: float = 0.0
    latency_ms: float = 0.0
    raw_json: Dict[str, Any] = field(default_factory=dict)
    request_id: Optional[str] = None
    model_name: str = ""
    provider_name: str = ""

@dataclass
class SynthesisResult:
    audio_bytes: bytes
    sample_rate: int = 16000
    duration_s: float = 0.0
    latency_ms: float = 0.0
    model_name: str = ""
    provider_name: str = ""
    voice_used: str = ""

class TTSProvider(Protocol):
    provider_id: str
    model_name: str

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
        ...

class ASRProvider(Protocol):
    provider_id: str
    model_name: str

    async def transcribe(
        self,
        audio_path: str,
        language: str = "hi-IN",
        case_id: Optional[str] = None,
        reference_text: Optional[str] = None,
        is_truncated: bool = False,
        mode: str = "standard"
    ) -> TranscriptResult:
        ...
