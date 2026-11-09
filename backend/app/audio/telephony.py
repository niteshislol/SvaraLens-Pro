import wave
import struct
import math
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np

def linear_to_mulaw(sample_int16: np.ndarray, mu: float = 255.0) -> np.ndarray:
    """
    Compress 16-bit signed PCM to 8-bit ITU-T G.711 mu-law.
    Standard telephony compression used in PSTN Indian contact centers.
    """
    # Normalize to -1.0 to 1.0
    x = sample_int16.astype(np.float32) / 32768.0
    # Apply mu-law companding
    sign = np.sign(x)
    companded = sign * np.log(1.0 + mu * np.abs(x)) / np.log(1.0 + mu)
    # Quantize to 8-bit (-128 to 127)
    q8 = np.clip(np.round(companded * 127.0), -128, 127).astype(np.int8)
    return q8

def mulaw_to_linear(q8: np.ndarray, mu: float = 255.0) -> np.ndarray:
    """
    Expand 8-bit ITU-T G.711 mu-law back to 16-bit signed PCM.
    Produces the authentic telephony quantization distortion.
    """
    y = q8.astype(np.float32) / 127.0
    # Inverse mu-law
    sign = np.sign(y)
    expanded = sign * (1.0 / mu) * ((1.0 + mu) ** np.abs(y) - 1.0)
    int16 = np.clip(np.round(expanded * 32768.0), -32768, 32767).astype(np.int16)
    return int16

def apply_bandpass_telephony(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    """
    Applies simple 300Hz - 3400Hz frequency attenuation using moving window FFT.
    """
    if len(samples) < 512:
        return samples

    # FFT filtering
    fft_vals = np.fft.rfft(samples)
    freqs = np.fft.rfftfreq(len(samples), 1.0 / sample_rate)

    # Telephony passband: 300Hz to 3400Hz
    gain = np.ones_like(freqs)
    # Rolloff below 300Hz
    low_cutoff = 300.0
    low_mask = freqs < low_cutoff
    gain[low_mask] = np.clip(freqs[low_mask] / low_cutoff, 0.05, 1.0) ** 2

    # Rolloff above 3400Hz
    high_cutoff = 3400.0
    high_mask = freqs > high_cutoff
    gain[high_mask] = np.clip((sample_rate / 2.0 - freqs[high_mask]) / max(sample_rate / 2.0 - high_cutoff, 1.0), 0.02, 1.0) ** 2

    filtered_fft = fft_vals * gain
    filtered_samples = np.fft.irfft(filtered_fft, n=len(samples))
    return np.clip(filtered_samples, -32768, 32767).astype(np.int16)

def inject_ambient_noise(samples: np.ndarray, snr_db: float = 18.0) -> np.ndarray:
    """
    Injects realistic colored background acoustic noise at target SNR (e.g. 18dB).
    Simulates KathBath Noisy Indian telephony conditions.
    """
    signal_power = np.mean(samples.astype(np.float64) ** 2)
    if signal_power <= 0:
        return samples

    # Calculate noise power for desired SNR
    snr_linear = 10.0 ** (snr_db / 10.0)
    noise_power = signal_power / max(snr_linear, 1.0)
    
    # Generate pinkish/gaussian noise
    raw_noise = np.random.normal(0, np.sqrt(noise_power), size=len(samples))
    noisy_signal = samples.astype(np.float64) + raw_noise
    return np.clip(np.round(noisy_signal), -32768, 32767).astype(np.int16)

def simulate_telephony_channel(
    input_wav_path: str,
    output_wav_path: str,
    channel_mode: str = "pstn_8k",
    snr_db: float = 18.0
) -> Dict[str, Any]:
    """
    Transforms clean 16kHz audio into a realistic Indian telephony PSTN or Noisy channel stream:
    1. Downsample from 16kHz to 8kHz (PSTN standard).
    2. Bandpass filter 300Hz - 3400Hz.
    3. G.711 mu-law compression and decompression.
    4. Optional ambient noise injection (KathBath Noisy emulation).
    """
    in_path = Path(input_wav_path)
    if not in_path.exists():
        raise FileNotFoundError(f"Source audio not found: {input_wav_path}")

    with wave.open(str(in_path), 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        orig_sr = wf.getframerate()
        n_frames = wf.getnframes()
        raw_bytes = wf.readframes(n_frames)

    # Convert to 16-bit mono numpy array
    if sampwidth == 2:
        samples = np.frombuffer(raw_bytes, dtype=np.int16)
        if n_channels > 1:
            samples = samples[::n_channels]
    else:
        samples = np.frombuffer(raw_bytes, dtype=np.uint8).astype(np.int16) * 256 - 32768

    # Step 1: Resample to 8kHz (if channel_mode != 'standard')
    target_sr = 8000 if channel_mode in ("pstn_8k", "noisy_telephony") else orig_sr
    
    if target_sr != orig_sr:
        # Decimation / interpolation
        num_target_samples = int(len(samples) * target_sr / orig_sr)
        resampled = np.interp(
            np.linspace(0, len(samples), num_target_samples, endpoint=False),
            np.arange(len(samples)),
            samples
        ).astype(np.int16)
    else:
        resampled = samples

    # Step 2: Bandpass 300Hz-3400Hz (PSTN telephone standard)
    if channel_mode in ("pstn_8k", "noisy_telephony"):
        filtered = apply_bandpass_telephony(resampled, target_sr)
    else:
        filtered = resampled

    # Step 3: G.711 mu-law companding simulation
    if channel_mode in ("pstn_8k", "noisy_telephony"):
        companded_8bit = linear_to_mulaw(filtered)
        expanded_pcm = mulaw_to_linear(companded_8bit)
    else:
        expanded_pcm = filtered

    # Step 4: Add ambient noise if noisy_telephony mode (KathBath Noisy profile)
    if channel_mode == "noisy_telephony":
        final_pcm = inject_ambient_noise(expanded_pcm, snr_db=snr_db)
    else:
        final_pcm = expanded_pcm

    # Write out standardized WAV
    out_path = Path(output_wav_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with wave.open(str(out_path), 'wb') as out_wf:
        out_wf.setnchannels(1)
        out_wf.setsampwidth(2)
        out_wf.setframerate(target_sr)
        out_wf.writeframes(final_pcm.tobytes())

    return {
        "channel_mode": channel_mode,
        "sample_rate": target_sr,
        "codec": "G.711 mu-law" if channel_mode != "standard" else "linear_pcm",
        "bandwidth_hz": "300-3400" if channel_mode != "standard" else "20-20000",
        "noise_injected": channel_mode == "noisy_telephony",
        "snr_db": snr_db if channel_mode == "noisy_telephony" else None,
        "duration_s": round(len(final_pcm) / float(target_sr), 2)
    }
