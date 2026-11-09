import wave
import struct
from pathlib import Path
from typing import Tuple, Optional
import numpy as np

def load_wav_as_float32(audio_path: str) -> Tuple[np.ndarray, int]:
    """
    Reads a WAV file into a normalized float32 numpy array in range [-1.0, 1.0]
    and returns (samples, sample_rate).
    Supports mono and multi-channel 16-bit or 24-bit or 32-bit float PCM.
    """
    with wave.open(audio_path, 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_bytes = wf.readframes(n_frames)

    if sampwidth == 2:  # 16-bit signed PCM
        data = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 1:  # 8-bit unsigned PCM
        data = (np.frombuffer(raw_bytes, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif sampwidth == 4:  # 32-bit int or float
        try:
            data = np.frombuffer(raw_bytes, dtype=np.float32)
        except Exception:
            data = np.frombuffer(raw_bytes, dtype=np.int32).astype(np.float32) / 2147483648.0
    elif sampwidth == 3:  # 24-bit PCM
        raw_array = np.frombuffer(raw_bytes, dtype=np.uint8)
        # Reshape to (N, 3) and pad to 4 bytes
        reshaped = raw_array.reshape(-1, 3)
        padded = np.zeros((reshaped.shape[0], 4), dtype=np.uint8)
        padded[:, 1:] = reshaped
        data = padded.view(dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth} bytes")

    # If multi-channel, downmix to mono by averaging
    if n_channels > 1:
        data = data.reshape(-1, n_channels).mean(axis=1)

    return data, framerate

def resample_linear(samples: np.ndarray, orig_sr: int, target_sr: int = 16000) -> np.ndarray:
    """Fast linear interpolation resampling for standard rates."""
    if orig_sr == target_sr:
        return samples
    duration = len(samples) / orig_sr
    target_len = int(duration * target_sr)
    orig_indices = np.linspace(0, len(samples) - 1, target_len)
    return np.interp(orig_indices, np.arange(len(samples)), samples).astype(np.float32)

def save_float32_as_wav16(samples: np.ndarray, sample_rate: int, output_path: str):
    """Saves float32 samples to 16-bit mono PCM WAV."""
    clipped = np.clip(samples, -1.0, 1.0)
    int16_data = (clipped * 32767.0).astype(np.int16)
    with wave.open(output_path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int16_data.tobytes())

def normalize_to_standard_wav(input_path: str, output_path: str, target_sr: int = 16000) -> Tuple[int, int, float]:
    """
    Converts input audio file to standard 16 kHz mono 16-bit WAV.
    Returns: (sample_rate, channels, duration_seconds)
    """
    samples, orig_sr = load_wav_as_float32(input_path)
    resampled = resample_linear(samples, orig_sr, target_sr)
    save_float32_as_wav16(resampled, target_sr, output_path)
    duration_s = float(len(resampled) / target_sr)
    return target_sr, 1, round(duration_s, 3)
