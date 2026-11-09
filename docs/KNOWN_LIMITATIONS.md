# SvaraLens Pro — Known Limitations & Operational Considerations

## 1. Overview

In accordance with Rule 3 (No fake functionality) and Rule 5 (Honest operations), this document details current known technical limitations, architectural trade-offs, and boundary conditions in SvaraLens Pro.

---

## 2. API Rate Limiting & Concurrency

### 2.1 Upstream Rate Limits (Gnani / Vachana API)
- **Observed Behavior:** Consecutive rapid bursts of STT requests to `https://api.vachana.ai/stt/v3` or TTS requests to `/api/v1/tts/inference` can trigger HTTP 429 (`Too Many Requests`).
- **Mitigation Implemented:** SvaraLens implements an asynchronous 3-attempt exponential retry backoff mechanism (`1.5s * (attempt + 1)`) with jitter in `backend/app/gnani/client.py`.
- **Operational Recommendation:** In bulk regression runs exceeding 20 concurrent scenarios, batch execution with a 500ms inter-scenario pacing delay to prevent upstream quota exhaustion.

---

## 3. Epistemic Boundaries & Heuristics

### 3.1 Subjective Prosody vs. Objective Acoustic Analysis
- **Limitation:** Purely rule-based DSP heuristics can detect silence duration, peak levels, clipping fraction, and tail abruptness with mathematical precision. However, subtle dialectal inflections, sarcasm, polite honorific cadence, and emotional appropriateness cannot be fully determined by DSP algorithms alone.
- **System Design:** SvaraLens explicitly classifies automated findings as `STATUS: SUSPECTED`. A defect is never treated as confirmed until a native-language QA engineer reviews the audio and marks it `CONFIRMED`.

### 3.2 Correlated ASR Jury Errors
- **Limitation:** If an Indic proper noun or rare regional surname is absent from both `Prisma v3.0` and `Prisma v2.5` language models, both models may produce an identical hallucination or phonetic misspelling. In such cases, consensus ratio alone does not guarantee lexical truth.
- **System Design:** The Reference Ground Truth text acts as the ultimate truth anchor. Furthermore, critical entity assertions require human reviewer sign-off during regression.

---

## 4. Indic Language & Dialect Scope

- **Current Implementation:** Fully seeded, calibrated, and validated for:
  - Hindi (`hi-IN`) — Standard formal, financial, and colloquial registers.
  - Hinglish (`hi-IN` mixed with English tokens) — Common code-switched banking and e-commerce phrases.
- **Future Indic Expansion:** The database schema and ASR/TTS adapters are multi-lingual ready. Adding languages such as Kannada (`kn-IN`), Tamil (`ta-IN`), Telugu (`te-IN`), and Marathi (`mr-IN`) requires configuring language codes and phonetic normalizer mappings.

---

## 5. Storage & Scalability Architecture

- **Audio Artifacts:** Audio WAV files are written to local persistent disk storage (`data/audio/`). While well-suited for on-premise evaluation clusters, edge labs, and single-instance deployments, high-concurrency enterprise scale would benefit from an object store adapter (AWS S3, Google Cloud Storage, or MinIO).
- **Database Engine:** Standard deployment uses SQLite with WAL (Write-Ahead Logging) enabled, which supports hundreds of concurrent reads and serialized writes. For multi-node distributed workbench clusters, the SQLAlchemy models are fully compatible with PostgreSQL.
