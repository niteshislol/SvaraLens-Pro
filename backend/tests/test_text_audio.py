import math
import numpy as np
import tempfile
from pathlib import Path
from app.text.normalize_hi import normalize_text_hindi
from app.text.compare import compute_wer_cer, match_single_phrase, evaluate_last_sentence_match
from app.audio.normalize import save_float32_as_wav16
from app.audio.analyze import analyze_audio_file

def test_hindi_normalizer_currency_and_digits():
    raw = "आपका प्रीमियम ₹4,250 है। देय तिथि १२ नवंबर है।"
    norm = normalize_text_hindi(raw)
    assert "4250" in norm
    assert "12 november" in norm
    assert "₹" not in norm

def test_phrase_matching():
    text = "आपका बकाया 4250 रुपये 12 november को भरना होगा"
    # exact
    matched, score, mtype = match_single_phrase("4250", [], text)
    assert matched is True
    # variant
    matched, score, mtype = match_single_phrase("late fee", ["बकाया", "late charge"], text)
    assert matched is True
    # absent
    matched, score, mtype = match_single_phrase("पॉलिसी रद्द", [], text)
    assert matched is False

def test_truncation_detection_text():
    reference = "आपका प्रीमियम 4250 रुपये है। 150 रुपये का विलंब शुल्क लग सकता है।"
    # Hypothesis is missing the last sentence
    transcript = "आपका प्रीमियम 4250 रुपये है"
    res = evaluate_last_sentence_match(reference, transcript)
    assert res["is_text_truncation_candidate"] is True
    assert res["match_score"] < 60.0

def test_audio_analysis_clean_sine():
    sr = 16000
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # 440 Hz sine wave with moderate amplitude (0.5 -> ~ -6 dBFS)
    sine = 0.5 * np.sin(2 * np.pi * 440 * t)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name
    save_float32_as_wav16(sine, sr, tmp_path)

    results = analyze_audio_file(tmp_path)
    Path(tmp_path).unlink(missing_ok=True)

    assert abs(results["duration_s"] - 2.0) < 0.05
    assert results["clip_ratio"] == 0.0
    assert results["peak_db"] > -8.0 and results["peak_db"] < -5.0

def test_audio_analysis_clipping():
    sr = 16000
    duration = 1.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Heavy amplitude sine wave (1.5 clamped to 1.0) -> high clip_ratio
    sine = np.clip(1.5 * np.sin(2 * np.pi * 440 * t), -1.0, 1.0)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name
    save_float32_as_wav16(sine, sr, tmp_path)

    results = analyze_audio_file(tmp_path)
    Path(tmp_path).unlink(missing_ok=True)

    assert results["clip_ratio"] > 0.10  # Significant clipping detected!

def test_audio_analysis_abrupt_truncation():
    sr = 16000
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Audio with sound right until the very last sample (no fade-out)
    sine = 0.6 * np.sin(2 * np.pi * 300 * t)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name
    save_float32_as_wav16(sine, sr, tmp_path)

    results = analyze_audio_file(tmp_path)
    Path(tmp_path).unlink(missing_ok=True)

    assert results["tail_analysis"]["abrupt_end"] is True
