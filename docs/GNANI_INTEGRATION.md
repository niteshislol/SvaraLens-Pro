# SvaraLens Pro — Gnani.ai Platform Integration Guide

## 1. Provider Credentials & Endpoint Configuration
* **Base URL:** `https://api.vachana.ai`
* **Authentication Header:** `X-API-Key-ID: <GNANI_API_KEY>`
* **Configuration:** Set in `.env` (never exposed to frontend clients).

---

## 2. Speech Synthesis (TTS) — Gnani Timbre

### Endpoint: `POST /api/v1/tts/inference`

#### Supported Model Engines
1. **`timbre-v3.0` (Indic-Expressive Sovereign)**
   * Expressive neural voice synthesis with authentic micro-pauses, intonation, and emotional cadence.
   * **Supported Personas:**
     * Female: `Shivani` (Warm/Conversational), `Lakshmi` (Empathetic Financial), `Kalpana` (Formal Disclosure), `Chetana`, `Vasudha`, `Riyaa`, `Tarika`.
     * Male: `Avinash` (Conversational/Authoritative), `Shubham` (Dynamic), `Prakash` (Financial Advisor), `Devansh`, `Yashraj`, `Harshad`.
2. **`timbre-v2.5` (Telephony Standard Baseline)**
   * Optimized for low-latency call centers and 8kHz IVR streams.
   * **Supported Personas:**
     * Female: `Nalini` (IVR Standard), `Bhavna` (Support), `Yashvi`, `Urmila`, `Devika`, `Radhika`, `Shweta`.
     * Male: `Deepak` (Telephony Alert), `Roopesh` (Formal), `Vikrant`, `Abhimanyu`, `Girish`.

#### Request Schema
```json
{
  "text": "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है।",
  "voice": "Shivani",
  "model": "timbre-v3.0",
  "language": "hi-IN",
  "audio_config": {
    "container": "wav",
    "encoding": "linear_pcm",
    "sample_rate": 16000,
    "num_channels": 1
  }
}
```

---

## 3. Speech Recognition (ASR) — Gnani Prisma Dual-ASR Jury

### Endpoint: `POST /stt/v3` (Multipart Form Data)

#### Supported Model Engines
1. **`prisma-v3.0` (Next-Gen Sovereign Engine)**
   * Supports `language_code: indic-auto` for automatic dialect and code-switching identification.
   * Delivers sub-200ms end-to-end latency metrics (`latency_ms`).
   * Spells out Hindi numerical words (e.g., `चार हज़ार दो सौ पचास रुपये`).
2. **`prisma-v2.5` (Telephony Acoustic Baseline)**
   * Standard telephony acoustic model.
   * Generates formatted numerical and currency tokens (e.g., `₹4,250 12 नवंबर`).

#### Dual-ASR Jury Consensus Logic
```python
# Concurrently execute Prisma v2.5 and v3.0
res_v25, res_v30 = await asyncio.gather(
    client.transcribe(audio_path, model="prisma-v2.5"),
    client.transcribe(audio_path, model="prisma-v3.0")
)
# Compute Levenshtein normalized agreement ratio
consensus = round(float(fuzz.ratio(normalize(t_v25), normalize(t_v30))), 1)
```

---

## 4. Resilience & Error Handling
* **Exponential Backoff:** Up to 3 attempts with `1.5s * (attempt + 1)` backoff.
* **Rate-Limit Handling (HTTP 429):** Catches rate limits and pauses execution before retrying.
* **Deterministic Mock Fallback:** When credentials are unset or offline, `MockGnaniClient` provides deterministic synthetic audio tones and transcripts with a clear `MOCK` label.
