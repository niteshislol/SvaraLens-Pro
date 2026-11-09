import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.audio.telephony import simulate_telephony_channel
from app.checks.suppression import check_small_utterance_suppression
from app.checks.register import check_dialect_register_inflation
from app.config import settings

client = TestClient(app)

def test_telephony_channel_simulation(tmp_path):
    # Create clean synthetic wave
    import wave
    import numpy as np

    raw_wav = tmp_path / "clean_16k.wav"
    t = np.linspace(0, 1.0, 16000)
    samples = (np.sin(2 * np.pi * 440.0 * t) * 16000).astype(np.int16)

    with wave.open(str(raw_wav), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(samples.tobytes())

    # Simulate 8kHz G.711 telephony
    tel_wav = tmp_path / "pstn_8k.wav"
    res = simulate_telephony_channel(str(raw_wav), str(tel_wav), channel_mode="pstn_8k")

    assert res["sample_rate"] == 8000
    assert res["codec"] == "G.711 mu-law"
    assert tel_wav.exists()

def test_small_utterance_suppression_detector():
    ref = "हाँ, आपका प्रीमियम ₹4,250 12 नवंबर को देय है।"
    # Hypothesis where the affirmation 'हाँ' was dropped by LLM ASR
    hyp = "आपका प्रीमियम ₹4,250 12 नवंबर को देय है।"
    
    finding = check_small_utterance_suppression(ref, hyp)
    assert finding is not None
    assert finding["check_type"] == "SMALL_UTTERANCE_SUPPRESSION"
    assert "हाँ" in finding["evidence"]["suppressed_tokens"]

def test_dialect_register_inflation_detector():
    ref = "उनको बोल देना कि पॉलिसी रिन्यू हो गई है।"
    # Transcript where colloquial 'उनको' was flattened to formal 'उन्हें'
    hyp = "उन्हें बोल देना कि पॉलिसी रिन्यू हो गई है।"
    
    finding = check_dialect_register_inflation(ref, hyp)
    assert finding is not None
    assert finding["check_type"] == "DIALECT_REGISTER_INFLATION"

def test_arena_models_list():
    resp = client.get("/api/arena/models")
    assert resp.status_code == 200
    data = resp.json()
    assert "tts_models" in data
    assert "asr_models" in data
    assert any(m["id"] == "timbre-v2.5" for m in data["tts_models"])
    assert any(m["id"] == "whisper-large-v3" for m in data["asr_models"])

def test_benchmarks_matrix():
    resp = client.get("/api/benchmarks/matrix")
    assert resp.status_code == 200
    data = resp.json()
    assert "datasets" in data
    assert "models" in data
    assert any(d["id"] == "gramvaani" for d in data["datasets"])
    assert any(d["id"] == "kathbath_noisy" for d in data["datasets"])
