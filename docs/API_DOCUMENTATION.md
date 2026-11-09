# SvaraLens Pro — API Documentation

## Base URL
Local: `http://localhost:8000/api`

---

## 1. Health & Telemetry

### `GET /api/health`
Returns backend service availability, database connectivity, and Gnani platform status.

**Response:**
```json
{
  "status": "ok",
  "mock_mode": false,
  "version": "0.1.0",
  "timbre_model": "timbre-v3.0",
  "prisma_model": "prisma-v3.0",
  "database_connected": true,
  "gnani_connected": true,
  "execution_mode": "LIVE",
  "scenarios_count": 31,
  "capsules_count": 2
}
```

---

## 2. Test Case Studio (`/api/cases`)

### `GET /api/cases`
Lists test scenarios with optional query parameters.
* `suite_id`: Filter by suite identifier (e.g. `suite-insurance-hi`).
* `search`: Fuzzy search across scenario title, ID, or reference script.
* `language`: Filter by `hi-IN` or `hinglish`.
* `severity`: Filter by `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.

### `POST /api/cases`
Creates a new test scenario.
* Payload:
```json
{
  "suite_id": "suite-insurance-hi",
  "scenario": "Term Life Maturity Notice",
  "language": "hi-IN",
  "reference_text": "आपकी टर्म लाइफ पॉलिसी 15 दिसंबर को मैच्योर हो रही है।",
  "critical_phrases": [
    {"text": "15 दिसंबर", "variants": ["15 december"], "severity": "HIGH"}
  ],
  "voice": "Shivani",
  "tts_model": "timbre-v3.0",
  "channel": "standard",
  "severity": "CRITICAL"
}
```

### `PATCH /api/cases/{id}`
Partially updates fields of an existing scenario.

### `POST /api/cases/{id}/duplicate`
Duplicates the scenario under a newly assigned case ID (`TC-XXX`).

### `DELETE /api/cases/{id}`
Safely deletes a scenario.
* Safeguard: Blocks deletion with HTTP 400 if active Voice Defect Capsules (`OPEN` or `REOPENED`) exist, unless `?force=true` is specified.

### `GET /api/cases/export`
Exports test cases in `json` or `csv` format.
* Query parameter: `?format=json` or `?format=csv`.

### `POST /api/cases/import-csv`
Uploads a CSV file with columns: `scenario,language,reference_text,critical_phrases,severity`.
* Returns detailed summary:
```json
{
  "total_rows": 5,
  "imported": 4,
  "skipped": 1,
  "failed": 0,
  "failure_reasons": []
}
```

---

## 3. Speech Synthesis & Runs (`/api/cases/{id}/runs`)

### `POST /api/cases/{id}/runs/generate`
Triggers speech synthesis using Gnani Timbre, followed by DSP acoustic analysis and Dual-ASR Jury transcription.
* Query Parameters:
  * `tts_model`: `timbre-v3.0` or `timbre-v2.5`
  * `tts_voice`: `Shivani`, `Avinash`, `Nalini`, `Deepak`, etc.
  * `injected_fault`: `END_TRUNCATION`, `CLIPPING`, or `SILENCE`

### `POST /api/cases/{id}/runs/upload`
Uploads an external audio file (`.wav`, `.mp3`) for QA analysis.

### `GET /api/runs/{id}`
Retrieves full run telemetry, acoustic metrics, primary transcript, Dual-ASR jury comparison, findings, and defect pins.

### `GET /api/runs/{id}/audio`
Streams the 16kHz normalized WAV audio file for playback.

---

## 4. Defect Pins & Human Review (`/api/runs/{id}/pins`, `/api/findings/{id}`)

### `POST /api/runs/{id}/pins`
Anchors a timestamped human defect pin to the waveform.
* Payload:
```json
{
  "timestamp_start_s": 3.20,
  "timestamp_end_s": 4.80,
  "category": "END_TRUNCATION",
  "severity": "CRITICAL",
  "note": "Sentence terminates prematurely before late charge disclosure."
}
```

### `DELETE /api/runs/{id}/pins/{pin_id}`
Removes a defect pin.

### `PATCH /api/findings/{id}`
Updates human review state on an automated finding.
* Payload:
```json
{
  "review_state": "HUMAN_CONFIRMED",
  "reviewer_note": "Verified defect in live playback.",
  "reviewed_by": "QA Lead Hindi"
}
```

---

## 5. Voice Defect Capsule & Regression (`/api/capsules`)

### `POST /api/findings/{id}/capsule`
Compiles a locked, reproducible Voice Defect Capsule from a confirmed finding.

### `GET /api/capsules/{id}`
Retrieves capsule metadata, immutable regression spec, and lifecycle state (`OPEN`, `RESOLVED`, `REOPENED`).

### `GET /api/capsules/{id}/validate`
Recomputes the SHA-256 digest directly from audio bytes on disk and verifies integrity against the capsule spec.

### `GET /api/capsules/{id}/export`
Returns structured capsule JSON.

### `POST /api/capsules/{id}/rerun`
Executes regression assertions against replacement audio.
* Form data: `generate=true` (synthesizes fixed speech) or upload `file`.
* Returns `verdict`: `NEEDS_REVIEW`, `RESOLVED`, `STILL_FAILING`, or `REGRESSED`.

### `POST /api/capsules/{id}/rerun/{rr_id}/approve`
Signs off on replacement audio, elevating verdict to `RESOLVED` and locking the capsule as resolved.

---

## 6. Release Analytics & Dossiers (`/api/analytics`, `/api/exports`)

### `GET /api/analytics/suite/{id}`
Returns real database metrics, language and severity distributions, defect category breakdown, dual ASR average consensus, and Release Readiness gate status (`READY_FOR_RELEASE` vs `BLOCKED`).

### `GET /api/exports/report/{id}.html`
Generates a printable HTML QA Dossier.
