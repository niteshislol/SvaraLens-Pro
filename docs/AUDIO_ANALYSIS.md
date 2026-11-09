# SvaraLens Pro — Audio Analysis Pipeline & Acoustic DSP Specification

## 1. Overview & Objective

The Audio Analysis module in SvaraLens Pro provides objective, mathematical acoustic validation of generated Indic speech. Rather than relying solely on subjective human listening or downstream ASR transcriptions, the audio analyzer extracts deterministic physical properties from the raw WAV waveform.

When combined with dual-engine ASR outputs, these acoustic measurements enable **cross-modal corroboration** (e.g., verifying that a transcript omission was caused by physical speech truncation rather than an ASR recognition error).

---

## 2. Audio Ingestion & Normalization

All incoming audio (synthesized via Gnani Timbre or uploaded by QA engineers) is normalized prior to DSP analysis via `backend/app/audio/normalize.py`:

- **Container & Codec:** Single-channel Mono or Dual-channel Stereo converted to standard PCM 16-bit / 32-bit float WAV.
- **Sample Rate:** Preserves source sample rate (16,000 Hz or 24,000 Hz for Gnani Timbre models) while computing sample-accurate time stamps.
- **Data Representation:** Loaded as continuous NumPy 1D array of 32-bit floating point numbers normalized in range `[-1.0, +1.0]`.

---

## 3. Mathematical DSP Formulations & Metrics

### 3.1 Peak Amplitude (dBFS)
Measures the maximum instantaneous absolute amplitude of the waveform relative to digital full scale:

$$\text{Peak dBFS} = 20 \cdot \log_{10}\left(\max_{i} |x[i]| + \epsilon\right)$$

- Where $x[i] \in [-1.0, 1.0]$ and $\epsilon = 10^{-9}$ to avoid singularity.
- **Normal Range:** $-6.0\text{ dBFS}$ to $-1.0\text{ dBFS}$.
- **Warning Threshold:** $\ge -0.1\text{ dBFS}$ indicates potential digital saturation.

---

### 3.2 Clipping Ratio
Detects hard digital clipping caused by improper gain staging or synthesis saturation:

$$\text{Clip Ratio} = \frac{\sum_{i=1}^{N} \mathbb{I}(|x[i]| \ge \theta_{\text{clip}})}{N}$$

- **Threshold ($\theta_{\text{clip}}$):** $0.99$ (99% full-scale amplitude).
- **Flag Condition:** $\text{Clip Ratio} > 0.001$ ($0.1\%$ of total audio samples).
- **Defect Trigger:** Triggers `ACOUSTIC_CLIPPING` finding if excessive samples flatline at the rail.

---

### 3.3 Framing & Short-Time Energy
To analyze temporal dynamics, the audio signal is divided into overlapping frames using stride tricks:

- **Window Size ($W$):** $50\text{ ms}$ ($0.05 \cdot f_s$, e.g., 800 samples at 16 kHz).
- **Hop Size ($H$):** $25\text{ ms}$ ($0.025 \cdot f_s$, 50% overlap).
- **Frame Root Mean Square (RMS):**

$$\text{RMS}_k = \sqrt{\frac{1}{W} \sum_{j=0}^{W-1} x[k \cdot H + j]^2 + \epsilon}$$

$$\text{Energy dBFS}_k = 20 \cdot \log_{10}(\text{RMS}_k)$$

---

### 3.4 Silence & Unnatural Pause Detection
Adaptive silence gating ensures accurate detection regardless of background noise floor:

- **Silence Dynamic Gate:**

$$\theta_{\text{silence}} = \max\left(\text{Peak dBFS} - 35\text{ dB}, -50.0\text{ dBFS}\right)$$

A frame $k$ is marked silent if $\text{Energy dBFS}_k < \theta_{\text{silence}}$.

- **Contiguous Intervals:** Silent frames are merged into contiguous time spans $[t_{\text{start}}, t_{\text{end}}]$.
- **Classification Rules:**
  1. **Leading Silence:** Silence occurring within the first 100ms with duration $\ge 1.5\text{ seconds}$. Flagged as `UNEXPECTED_SILENCE` (excessive initial latency).
  2. **Internal Speech Gap:** Silence occurring mid-utterance with duration $\ge 1.2\text{ seconds}$. Flagged as `UNNATURAL_CADENCE` or `UNEXPECTED_SILENCE` (stalled neural generation).

---

### 3.5 Tail Energy Analysis & Truncation Corroboration
Speech truncation frequently occurs in neural TTS when the attention mechanism terminates prematurely or audio stream buffers are flushed early. SvaraLens analyzes the final **150 ms** of the audio:

1. **Tail Window:** $x_{\text{tail}} = x[N - 0.150 \cdot f_s : N]$.
2. **Tail RMS:**

$$\text{RMS}_{\text{tail}} = \sqrt{\frac{1}{M} \sum_{j=1}^{M} x_{\text{tail}}[j]^2 + \epsilon}$$

3. **Median Active Speech RMS:**

$$\text{RMS}_{\text{active}} = \text{median}\left(\{\text{RMS}_k \mid \text{Energy dBFS}_k \ge \theta_{\text{silence}}\}\right)$$

4. **Tail Energy Ratio:**

$$R_{\text{tail}} = \frac{\text{RMS}_{\text{tail}}}{\max(\text{RMS}_{\text{active}}, 10^{-9})}$$

5. **Abrupt Cutoff Flag (`abrupt_end`):**
A signal is marked as having an abrupt cutoff if:
$$\text{Tail RMS dBFS} \ge -40.0\text{ dBFS} \quad \text{AND} \quad R_{\text{tail}} \ge 0.50$$

If the tail energy remains audibly loud right at the final sample boundary rather than naturally fading down to silence ($< -50\text{ dBFS}$), the audio was violently truncated.

---

## 4. Multi-Modal Corroboration Architecture

A critical innovation in SvaraLens is cross-verifying acoustic anomalies with ASR transcription findings:

```
+-------------------------------------------------------------+
|                     Generated Audio (WAV)                   |
+------------------------------+------------------------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
+-------------------------+             +-------------------+
|  Dual-ASR Jury (STT)    |             |  Acoustic DSP     |
|  - Prisma v3.0          |             |  - Peak & Clip    |
|  - Prisma v2.5          |             |  - Silence Gaps   |
|  - Token Consensus      |             |  - Tail Energy    |
+------------+------------+             +---------+---------+
             |                                    |
             | Text comparison                    | Abrupt cutoff
             v                                    v
     [Missing Suffix]                      [Abrupt Tail End]
             \                                    /
              \                                  /
               v                                v
+-------------------------------------------------------------+
|                Corroborated Finding Engine                  |
|                                                             |
|  Rule: Missing Last Phrase + Abrupt End ==                  |
|        HIGH-CONFIDENCE END_TRUNCATION                       |
|  Rule: Missing Suffix + Natural Tail Fade ==                |
|        SUSPECTED TTS INCOMPLETE (Needs Review)              |
+-------------------------------------------------------------+
```

### Corroboration Decision Matrix

| ASR Jury Output | Tail RMS & Ratio | Corroborated Verdict | Finding Category |
|---|---|---|---|
| Final sentence absent | Tail $\ge -40\text{ dBFS}$, Ratio $\ge 0.5$ | **Physical Speech Truncation** | `END_TRUNCATION` |
| Final sentence absent | Tail $< -50\text{ dBFS}$, Ratio $< 0.1$ | **Model Dropped Synthesis** | `CRITICAL_PHRASE_MISSING` |
| Full text transcribed | Tail $\ge -40\text{ dBFS}$, Ratio $\ge 0.5$ | **Acoustic Glitch / Pop** | `ACOUSTIC_CLIPPING` |
| Full text transcribed | Tail $< -50\text{ dBFS}$, Ratio $< 0.1$ | **Clean Production Pass** | `PASS` |

---

## 5. Performance Benchmarks

- **Framing & RMS Computation:** $< 12\text{ ms}$ for a 15-second audio file on Apple Silicon / standard Linux x86_64.
- **Total DSP Execution Latency:** $< 25\text{ ms}$ per test execution.
- **Memory Overhead:** Zero dynamic allocations outside the NumPy stride view.
