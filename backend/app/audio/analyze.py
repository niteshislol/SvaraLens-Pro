import math
from typing import Dict, Any, List
import numpy as np
from .normalize import load_wav_as_float32
from ..config import settings

def analyze_audio_file(audio_path: str) -> Dict[str, Any]:
    """
    Performs full acoustic analysis on a WAV audio file per Section 2.6.
    Computes:
    - duration_s
    - peak_db (dBFS)
    - clip_ratio (fraction of samples >= 0.99)
    - silence_regions (internal gaps > 1.2s, leading silence > 1.5s)
    - tail energy measurements for truncation corroboration
    """
    samples, sr = load_wav_as_float32(audio_path)
    n_samples = len(samples)
    if n_samples == 0:
        return {
            "duration_s": 0.0,
            "sample_rate": sr,
            "peak_db": -100.0,
            "clip_ratio": 0.0,
            "silence_regions": [],
            "tail_analysis": {
                "tail_rms_dbfs": -100.0,
                "median_speech_rms_dbfs": -100.0,
                "tail_energy_ratio": 0.0,
                "abrupt_end": False
            }
        }

    duration_s = float(n_samples / sr)
    
    # 1. Peak level
    max_abs = float(np.max(np.abs(samples)))
    peak_db = float(20.0 * math.log10(max(max_abs, 1e-9)))

    # 2. Clipping fraction
    clip_count = int(np.sum(np.abs(samples) >= settings.CLIPPING_AMPLITUDE_THRESHOLD))
    clip_ratio = float(clip_count / n_samples)

    # 3. Framing for silence analysis (50 ms frames)
    frame_size = int(sr * 0.05)  # 50 ms
    hop_size = int(sr * 0.025)   # 25 ms
    
    if frame_size > 0 and n_samples >= frame_size:
        # Calculate RMS per frame
        n_frames = 1 + (n_samples - frame_size) // hop_size
        frames = np.lib.stride_tricks.as_strided(
            samples,
            shape=(n_frames, frame_size),
            strides=(samples.strides[0] * hop_size, samples.strides[0])
        )
        frame_rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
        frame_dbfs = 20.0 * np.log10(frame_rms)
    else:
        frame_rms = np.array([np.sqrt(np.mean(samples ** 2) + 1e-12)])
        frame_dbfs = 20.0 * np.log10(frame_rms)

    # Threshold for silence: 35 dB below peak, or -45 dBFS
    silence_db_thresh = max(peak_db - settings.SILENCE_TOP_DB, -50.0)
    is_silent = frame_dbfs < silence_db_thresh

    # Detect contiguous silent intervals
    silence_regions: List[Dict[str, Any]] = []
    in_silence = False
    silence_start_s = 0.0

    for i, silent in enumerate(is_silent):
        time_s = float((i * hop_size) / sr)
        if silent and not in_silence:
            in_silence = True
            silence_start_s = time_s
        elif not silent and in_silence:
            in_silence = False
            gap = time_s - silence_start_s
            silence_regions.append({
                "start": round(silence_start_s, 3),
                "end": round(time_s, 3),
                "duration": round(gap, 3)
            })

    if in_silence:
        gap = duration_s - silence_start_s
        silence_regions.append({
            "start": round(silence_start_s, 3),
            "end": round(duration_s, 3),
            "duration": round(gap, 3)
        })

    # Filter for significant silences
    significant_silences = []
    for reg in silence_regions:
        is_leading = (reg["start"] <= 0.1)
        if is_leading and reg["duration"] >= settings.SILENCE_LEADING_SECONDS:
            significant_silences.append({**reg, "type": "LEADING_SILENCE"})
        elif not is_leading and reg["duration"] >= settings.SILENCE_INTERNAL_GAP_SECONDS:
            significant_silences.append({**reg, "type": "INTERNAL_GAP"})

    # 4. Tail energy analysis (last 150 ms)
    tail_sample_count = min(int(sr * 0.150), n_samples)
    tail_samples = samples[-tail_sample_count:]
    tail_rms = float(np.sqrt(np.mean(tail_samples ** 2) + 1e-12))
    tail_rms_dbfs = float(20.0 * math.log10(tail_rms))

    # Active speech RMS (non-silent frames)
    active_frames_rms = frame_rms[~is_silent] if np.any(~is_silent) else frame_rms
    median_speech_rms = float(np.median(active_frames_rms))
    median_speech_rms_dbfs = float(20.0 * math.log10(max(median_speech_rms, 1e-9)))

    tail_energy_ratio = float(tail_rms / max(median_speech_rms, 1e-9))
    
    # Abrupt end signal: tail is audible (> -40 dBFS) and at least 50% of median energy
    abrupt_end = bool(
        tail_rms_dbfs >= settings.TRUNCATION_TAIL_RMS_DBFS_THRESHOLD
        and tail_energy_ratio >= settings.TRUNCATION_TAIL_ENERGY_RATIO_THRESHOLD
    )

    return {
        "duration_s": round(duration_s, 3),
        "sample_rate": sr,
        "peak_db": round(peak_db, 2),
        "clip_ratio": round(clip_ratio, 5),
        "silence_regions": significant_silences,
        "all_silence_intervals": silence_regions,
        "tail_analysis": {
            "tail_rms_dbfs": round(tail_rms_dbfs, 2),
            "median_speech_rms_dbfs": round(median_speech_rms_dbfs, 2),
            "tail_energy_ratio": round(tail_energy_ratio, 3),
            "abrupt_end": abrupt_end
        }
    }
