# SvaraLens Pro: Indic Voice QA Evidence & Regression Workbench

> **Tagline:** *"Every spoken defect becomes a reproducible test."*  
> **Positioning:** Bridges the gap between conversational AI text evaluation (Gnani Agentic Evals) and physical Indic speech validation.  
> **Gnani Models Integrated:** **Gnani Timbre v3.0 & v2.5** (TTS) | **Gnani Prisma v3.0 & v2.5** (Dual-ASR Jury STT).  
> **API Platform:** Live verified against `https://api.vachana.ai`.  
> **Test Coverage:** 21/21 Automated Pytest Unit & E2E Tests Passing.

---

## 1. Problem Statement & The Engineering Gap

In enterprise conversational voice deployments (banking collections, health claims, insurance renewals), conversational agents are evaluated primarily on their textual logic. However, critical defects frequently occur **in the physical spoken audio**:
1. **Critical Entity Distortion:** Loan amounts (e.g., *₹4,500*) or policy numbers distorted by digit stutter.
2. **Abrupt Speech Truncation:** Mandatory compliance disclosures truncated mid-syllable at the end of utterances.
3. **Code-Switching Artifacts:** Glitches and robotic cadence shifts across Hindi-to-English token boundaries.
4. **Acoustic Saturation:** Hard digital clipping and audio buffer pops.
5. **The Handoff Gap:** In typical QA cycles, these spoken defects are recorded as subjective, ephemeral bug notes. When engineers update models or audio pipelines, regressions cannot be verified automatically.

**SvaraLens Pro transforms discovered Indic voice defects into cryptographically locked Voice Defect Capsules with machine-executable assertions that run as continuous regression tests.**

---

## 2. Core Workbench Architecture

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         SvaraLens Pro Workbench UI                          │
  │     (React 18 + TypeScript + Tailwind + Wavesurfer.js Audio Visualizer)     │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │ REST API / JSON
  ┌──────────────────────────────────────▼──────────────────────────────────────┐
  │                           FastAPI Backend Service                           │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  1. Test Case Studio        │ 30-Case Corpus, CRUD, Search, CSV/JSON I/O   │
  │  2. Speech Synthesis Engine │ Gnani Timbre v3.0 & v2.5 Adapter              │
  │  3. Dual-ASR Jury Engine    │ Gnani Prisma v3.0 & v2.5 (Indic Consensus)   │
  │  4. Acoustic DSP Analyzer   │ Stride Framing, Peak dBFS, Clipping, Tail RMS │
  │  5. Human Review Studio     │ Epistemic Labeling (Suspected -> Confirmed)   │
  │  6. Capsule Compiler        │ SHA-256 Byte Digest, 10-Defect Assertions     │
  │  7. Regression Runner       │ Machine Assertion Verifier + Sign-off State   │
  │  8. Suite Analytics Gate    │ Release Readiness Quality Gate                │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
┌──────────────────────────────┐                       ┌──────────────────────────────┐
│  Gnani Platform / Vachana    │                       │  Local SQLite & Storage      │
│  - api.vachana.ai            │                       │  - data/svaralens.db         │
│  - Timbre v3.0 / v2.5        │                       │  - data/audio/ (WAV PCM)     │
│  - Prisma v3.0 / v2.5        │                       │  - Audit Event Trail         │
└──────────────────────────────┘                       └──────────────────────────────┘
```

---

## 3. The 10 Defect Categories & Assertion Contract

When a human reviewer confirms a spoken defect, SvaraLens generates deterministic machine assertions tailored to the defect category:

| Defect Category | Machine Assertion Strategy | Verification Logic |
|---|---|---|
| `END_TRUNCATION` | `critical_phrase_present` + `no_end_truncation` | Tail RMS $< -40\text{ dBFS}$ + Dual-ASR final sentence agreement |
| `AMOUNT_MISPRONUNCIATION`| `critical_phrase_present` + Reviewer sign-off | Currency and numeric token matching without digit drop |
| `DATE_OR_NUMBER_DISTORTION` | `critical_phrase_present` | Ground truth date/number token match |
| `CRITICAL_PHRASE_MISSING` | `critical_phrase_present` | Substring match + fuzzy consensus ratio $\ge 85\%$ |
| `ACOUSTIC_CLIPPING` | `no_clipping` | Decoded audio sample clipping fraction $< 0.1\%$ |
| `UNEXPECTED_SILENCE` | `no_excessive_silence` | Contiguous silence frames: no gap $> 1.2\text{s}$, leading $< 1.5\text{s}$ |
| `CODE_SWITCH_GLITCH` | `code_switch_consistency` | Multi-engine Indic/English boundary alignment |
| `UNNATURAL_CADENCE` | `speaking_pace_in_range` | Syllabic pace band ($2.5 - 4.5$ syllables/second) |
| `PRONUNCIATION_ANOMALY` | `critical_phrase_present` + Reviewer check | Phonetic verification on specific named entities |
| `OTHER` | `critical_phrase_present` + Reviewer sign-off | General reference phrase validation |

> **Epistemic Rule (Strictly Enforced):** Automated ASR mismatches are tagged as `SUSPECTED` until human-confirmed. Only acoustic physical measurements (clipping, silence duration, abrupt tail drop) and human listening actions produce a `CONFIRMED` defect state.

---

## 4. Complete Test Case Studio & Evaluated Corpus

The workbench comes pre-seeded with a 30-case evaluation corpus representing real Indian conversational voice scenarios:
- **Hindi (`hi-IN`) Scenarios (10):** Health insurance cashless claims, loan EMI reminders, motor insurance renewals, credit card limit updates, term insurance alerts.
- **Hinglish Scenarios (10):** Mixed Hindi-English code-switched banking alerts, KYC video verification, SIP portfolio rebalancing, e-commerce refund confirmations.
- **Critical Information Scenarios (5):** Strict numeric entity, OTP, account, and date validation.
- **Audio Integrity Scenarios (5):** Deliberate acoustic edge cases (clipping saturation, silence dropouts, tail cutoff stress testing).

### Studio Capabilities
- **Search & Filters:** Real-time query search, language filter (`hi-IN`, `hi-IN-en`), and severity filter (`CRITICAL`, `MAJOR`, `MINOR`).
- **Full CRUD & Duplicate:** In-place creation, partial updates (`PATCH`), duplication (`POST /api/cases/{id}/duplicate`), and safe deletion protection (blocks deletion if active capsules reference the scenario).
- **Import & Export:** Export full suite to JSON or CSV; CSV import with validation reporting total rows, imported, skipped, failed, and explicit failure reasons.

---

## 5. Live Gnani Multi-Model Integration

SvaraLens connects directly to `https://api.vachana.ai` using API credentials in backend environment variables:
- **Speech Synthesis (TTS):**
  - **`timbre-v3.0`:** Latest generation Indic neural voice (Voices: `Shivani`, `Avinash`, etc.).
  - **`timbre-v2.5`:** Low-latency conversational voice (Voices: `Nalini`, `Deepak`).
- **Speech Recognition (STT Dual-ASR Jury):**
  - **`prisma-v3.0`:** High-accuracy conversational STT with `indic-auto` language detection.
  - **`prisma-v2.5`:** Stable Indic ASR baseline.
  - **Consensus Metrics:** Calculates token agreement ratio, Word Error Rate (WER), and Character Error Rate (CER) against ground truth.
- **Resilience:** Automatic 3-attempt exponential retry backoff (`1.5s * (attempt + 1)`) with rate-limit (HTTP 429) mitigation.

---

## 6. Quickstart & Local Setup

### 1. Prerequisites
- Python 3.10+ (tested through Python 3.15)
- Node.js 18+ LTS
- FFmpeg installed (`ffmpeg` and `ffprobe` in `$PATH`)

### 2. Backend Setup
```bash
# Clone and enter repo
cd SvaraLens

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GNANI_API_KEY

# Seed 30-case Indic evaluation corpus
PYTHONPATH=backend python3 scripts/demo_data.py

# Start FastAPI server
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build    # Or 'npm run dev' for live HMR development
```

Open **`http://localhost:8000`** (or `http://localhost:5173` in Vite dev mode).

---

## 7. Running the Automated Test Suite

```bash
# Run all 21 automated tests
PYTHONPATH=backend .venv/bin/pytest backend/tests/ -v

# Run the 15-step Defect-to-Regression Lifecycle test
PYTHONPATH=backend .venv/bin/pytest backend/tests/test_e2e_lifecycle.py -v
```

### Test Results Summary
```
backend/tests/test_api_endpoints.py::test_health PASSED                  [  4%]
backend/tests/test_api_endpoints.py::test_primary_loop_end_to_end PASSED [  9%]
backend/tests/test_capsule_integrity.py::test_sha256_byte_digest_accuracy PASSED [ 14%]
backend/tests/test_capsule_integrity.py::test_assertion_generation_10_defect_types PASSED [ 19%]
backend/tests/test_capsule_integrity.py::test_regression_verdict_logic PASSED [ 23%]
backend/tests/test_capsule_integrity.py::test_capsule_integrity_api_and_export PASSED [ 28%]
backend/tests/test_e2e_lifecycle.py::test_full_15_step_defect_to_regression_lifecycle PASSED [ 33%]
backend/tests/test_multi_model.py::test_mock_multi_model_synthesize[asyncio] PASSED [ 38%]
backend/tests/test_multi_model.py::test_mock_dual_asr_transcribe[asyncio] PASSED [ 42%]
backend/tests/test_multi_model.py::test_generate_with_model_param_and_defect_pins PASSED [ 47%]
backend/tests/test_scenario_management.py::test_scenario_search_and_filters PASSED [ 52%]
backend/tests/test_scenario_management.py::test_scenario_crud_and_patch PASSED [ 57%]
backend/tests/test_scenario_management.py::test_scenario_duplicate PASSED [ 61%]
backend/tests/test_scenario_management.py::test_scenario_export_formats PASSED [ 66%]
backend/tests/test_scenario_management.py::test_csv_import_validation PASSED [ 71%]
backend/tests/test_text_audio.py::test_hindi_normalizer_currency_and_digits PASSED [ 76%]
backend/tests/test_text_audio.py::test_phrase_matching PASSED            [ 80%]
backend/tests/test_truncation_detection_text PASSED                      [ 85%]
backend/tests/test_text_audio.py::test_audio_analysis_clean_sine PASSED  [ 90%]
backend/tests/test_text_audio.py::test_audio_analysis_clipping PASSED    [ 95%]
backend/tests/test_audio_analysis_abrupt_truncation PASSED               [100%]
======================== 21 passed in 29.37s ========================
```

---

## 8. Technical Documentation Index

Detailed engineering documentation is located in the `docs/` directory:
- [IMPLEMENTATION_AUDIT.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/IMPLEMENTATION_AUDIT.md): Complete module-by-module audit and verification matrix.
- [ARCHITECTURE.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/ARCHITECTURE.md): Component diagrams, data flows, and layer responsibilities.
- [API_DOCUMENTATION.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/API_DOCUMENTATION.md): Complete OpenAPI endpoint reference with request/response schemas.
- [DATABASE_SCHEMA.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/DATABASE_SCHEMA.md): Entity relationship model, field definitions, and SQLite-to-PostgreSQL mapping.
- [GNANI_INTEGRATION.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/GNANI_INTEGRATION.md): Timbre & Prisma models, endpoints, headers, and retry strategies.
- [AUDIO_ANALYSIS.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/AUDIO_ANALYSIS.md): DSP framing algorithms, tail energy calculations, and corroboration matrices.
- [CAPSULE_WORKFLOW.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/CAPSULE_WORKFLOW.md): Defect-to-regression lifecycle, SHA-256 byte digests, and 10 assertion templates.
- [TESTING.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/TESTING.md): Testing strategy, coverage details, and CI/CD commands.
- [DEPLOYMENT.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/DEPLOYMENT.md): Local, Docker, and production single-server deployment procedures.
- [KNOWN_LIMITATIONS.md](file:///Users/niteshislol/ANTIGRAVITYCODE/SvaraLens/docs/KNOWN_LIMITATIONS.md): Operational boundaries, rate limits, and subjective prosody handling.

---

## 9. Ethics, Privacy, and Guardrails

- **Zero Fabricated Data:** Real byte hashes, real audio waveforms, and real API calls.
- **Privacy First:** Only synthetic evaluation scripts are used. No customer PII, Aadhaar, PAN, phone numbers, or account credentials are stored or processed.
- **Epistemic Discipline:** Clear separation between objective physical measurements and subjective human listener judgment.
