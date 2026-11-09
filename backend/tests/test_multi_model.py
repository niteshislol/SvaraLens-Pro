import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.gnani.mock import MockGnaniClient

client = TestClient(app)

@pytest.mark.anyio
async def test_mock_multi_model_synthesize():
    gnani = MockGnaniClient()
    # Test timbre-v3.0 synthesis
    wav_v3 = await gnani.synthesize("नमस्ते", model="timbre-v3.0", voice="Shivani")
    assert len(wav_v3) > 1000
    assert wav_v3[:4] == b"RIFF"

    # Test timbre-v2.5 synthesis
    wav_v25 = await gnani.synthesize("नमस्ते", model="timbre-v2.5", voice="Nalini")
    assert len(wav_v25) > 1000
    assert wav_v25[:4] == b"RIFF"

@pytest.mark.anyio
async def test_mock_dual_asr_transcribe(tmp_path):
    gnani = MockGnaniClient()
    dummy_wav = tmp_path / "test.wav"
    audio_bytes = await gnani.synthesize("नमस्ते")
    dummy_wav.write_bytes(audio_bytes)

    res = await gnani.transcribe_dual_asr(str(dummy_wav), language="hi-IN")
    assert "prisma_v25" in res
    assert "prisma_v30" in res
    assert res["consensus_score"] == 100.0
    assert res["prisma_v30"]["detected_language"] == "hi-IN"

def test_generate_with_model_param_and_defect_pins():
    # 1. Generate run with timbre-v3.0
    res = client.post("/api/cases/TC-014/runs/generate?tts_model=timbre-v3.0&tts_voice=Shivani")
    assert res.status_code == 200, res.text
    run_id = res.json()["run_id"]

    # 2. Get run details and verify dual ASR and model metadata
    r_detail = client.get(f"/api/runs/{run_id}")
    assert r_detail.status_code == 200
    data = r_detail.json()
    assert data["tts_model"] == "timbre-v3.0"
    assert data["tts_voice"] == "Shivani"
    assert data["stt_dual_results"] is not None
    assert "prisma_v25" in data["stt_dual_results"]
    assert "prisma_v30" in data["stt_dual_results"]

    # 3. Add Defect Pin
    pin_payload = {
        "timestamp_start_s": 2.5,
        "timestamp_end_s": 4.1,
        "category": "END_TRUNCATION",
        "severity": "CRITICAL",
        "note": "Final disclosure cut off abruptly."
    }
    pin_res = client.post(f"/api/runs/{run_id}/pins", json=pin_payload)
    assert pin_res.status_code == 200
    pins = pin_res.json()["defect_pins"]
    assert len(pins) >= 1
    pin_id = pins[-1]["id"]
    assert pins[-1]["category"] == "END_TRUNCATION"

    # 4. Remove Defect Pin
    del_res = client.delete(f"/api/runs/{run_id}/pins/{pin_id}")
    assert del_res.status_code == 200
    remaining_pins = del_res.json()["defect_pins"]
    assert all(p["id"] != pin_id for p in remaining_pins)
