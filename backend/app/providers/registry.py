from typing import Dict, List, Any, Optional
from .base import TTSProvider, ASRProvider
from .gnani import GnaniTTSProvider, GnaniASRProvider
from .whisper import WhisperASRProvider
from .sarvam import SarvamTTSProvider, SarvamASRProvider

TTS_MODELS = [
    {
        "id": "timbre-v2.5",
        "name": "Gnani Timbre v2.5",
        "provider": "Gnani AI",
        "type": "TTS",
        "badge": "Production Primary",
        "languages": ["hi-IN", "hinglish", "ta-IN", "te-IN", "kn-IN"],
        "default_voice": "Nalini",
        "voices": ["Nalini", "ananya", "rohit", "priya"],
        "telephony_native": True,
        "streaming": True
    },
    {
        "id": "timbre-v3.0",
        "name": "Gnani Timbre v3.0 (Frontier)",
        "provider": "Gnani AI",
        "type": "TTS",
        "badge": "Frontier Model",
        "languages": ["hi-IN", "hinglish", "ta-IN", "te-IN", "bn-IN"],
        "default_voice": "Nalini",
        "voices": ["Nalini", "kavya", "arjun"],
        "telephony_native": True,
        "streaming": True
    },
    {
        "id": "bulbul-v1",
        "name": "Sarvam Bulbul v1",
        "provider": "Sarvam AI",
        "type": "TTS",
        "badge": "Code-Switch Native",
        "languages": ["hi-IN", "hinglish"],
        "default_voice": "meera",
        "voices": ["meera", "pavithra", "arvind"],
        "telephony_native": False,
        "streaming": True
    }
]

ASR_MODELS = [
    {
        "id": "prisma-v2.5",
        "name": "Gnani Prisma v2.5",
        "provider": "Gnani AI",
        "type": "ASR",
        "architecture": "Pure-Play Streaming Acoustic",
        "badge": "Low Latency Telephony",
        "languages": ["hi-IN", "hinglish", "ta-IN", "te-IN", "kn-IN", "mr-IN"],
        "avg_latency_ms": 220,
        "telephony_optimized": True,
        "features": ["8kHz G.711 Native", "Custom Vocab Prompting", "Small Utterance Retention"]
    },
    {
        "id": "prisma-v3.0",
        "name": "Gnani Prisma v3.0 (Frontier)",
        "provider": "Gnani AI",
        "type": "ASR",
        "architecture": "Frontier Acoustic-Phonetic",
        "badge": "State of the Art Indic",
        "languages": ["hi-IN", "hinglish", "ta-IN", "te-IN", "kn-IN", "bn-IN", "gu-IN", "pa-IN"],
        "avg_latency_ms": 180,
        "telephony_optimized": True,
        "features": ["Sub-200ms Streaming", "Dialectal Robustness", "GramVaani Verified"]
    },
    {
        "id": "whisper-large-v3",
        "name": "OpenAI Whisper Large-v3",
        "provider": "OpenAI",
        "type": "ASR",
        "architecture": "Seq2Seq LLM-Augmented",
        "badge": "Global Multilingual",
        "languages": ["hi-IN", "en-IN"],
        "avg_latency_ms": 780,
        "telephony_optimized": False,
        "features": ["Written Standard Normalization", "Global Dataset Trained"]
    },
    {
        "id": "saaras-v1",
        "name": "Sarvam Saaras v1",
        "provider": "Sarvam AI",
        "type": "ASR",
        "architecture": "Indic Specialized",
        "badge": "Hinglish Native",
        "languages": ["hi-IN", "hinglish"],
        "avg_latency_ms": 290,
        "telephony_optimized": True,
        "features": ["Code-Mixing", "Indian English Accents"]
    }
]

def get_tts_provider(model_id: str = "timbre-v2.5") -> TTSProvider:
    if "bulbul" in model_id.lower():
        return SarvamTTSProvider(model_id)
    return GnaniTTSProvider(model_id)

def get_asr_provider(model_id: str = "prisma-v2.5") -> ASRProvider:
    m = model_id.lower()
    if "whisper" in m:
        return WhisperASRProvider(model_id)
    elif "saaras" in m or "sarvam" in m:
        return SarvamASRProvider(model_id)
    return GnaniASRProvider(model_id)

def list_registry_models() -> Dict[str, Any]:
    return {
        "tts_models": TTS_MODELS,
        "asr_models": ASR_MODELS
    }
