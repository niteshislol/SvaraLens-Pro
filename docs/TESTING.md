# SvaraLens Pro — Quality Assurance & Testing Strategy

## 1. Testing Philosophy

SvaraLens Pro enforces an engineering-grade automated testing regime across both backend services and frontend applications:

1. **No Mocking in Core Business Logic:** Deterministic assertions, SHA-256 byte digests, DSP framing calculations, and database constraints run against real algorithms and SQLite instances.
2. **Multi-Layer Validation:**
   - Unit tests for DSP and audio normalization.
   - API contract tests for FastAPI routers.
   - Integrity verification for capsule hashing and assertions.
   - Comprehensive multi-step End-to-End lifecycle tests verifying the complete defect-to-regression journey.
   - Frontend TypeScript typechecking and production build verification.

---

## 2. Test Suites Overview

The backend test suite is organized into 6 test modules containing 21 tests:

| Test File | Focus Area | Key Assertions Covered |
|---|---|---|
| `backend/tests/test_scenario_management.py` | Test Case Studio Management | - Full-text search and query filters<br>- Partial field updates (PATCH)<br>- Scenario duplication<br>- Safe deletion prevention with active capsules<br>- Structured CSV import error handling |
| `backend/tests/test_capsule_integrity.py` | Capsule Compilation & Integrity | - SHA-256 byte digest hashing<br>- Deterministic 10-defect assertion generation<br>- Regression evaluation state machine (`NEEDS_REVIEW`, `RESOLVED`, `STILL_FAILING`)<br>- Live SHA-256 re-computation and tamper validation API |
| `backend/tests/test_e2e_lifecycle.py` | 15-Step Defect-to-Regression Journey | - Complete roundtrip: Scenario creation $\to$ Audio synthesis $\to$ DSP analysis $\to$ Dual-ASR Jury $\to$ Suspected finding creation $\to$ Human review confirmation $\to$ Capsule compilation with SHA-256 $\to$ Tamper check $\to$ Re-synthesis $\to$ Regression evaluation $\to$ Native sign-off $\to$ Final RESOLVED state |
| `backend/tests/test_api_endpoints.py` | Router Contracts & CRUD | - Health check and system readiness<br>- Primary loop execution end-to-end |
| `backend/tests/test_text_audio.py` | Text & Audio Preprocessing | - Text normalization and Hindi tokenization<br>- WAV float32 loading and RMS calculation |
| `backend/tests/test_multi_model.py` | Multi-Model TTS & STT Adapters | - Timbre v3.0 / v2.5 synthesis contract<br>- Prisma v3.0 / v2.5 dual transcription with WER/CER |

---

## 3. Running Automated Tests

### 3.1 Backend Pytest Execution
Ensure the virtual environment is activated and `PYTHONPATH=backend`:

```bash
# Run all tests with verbose output
PYTHONPATH=backend .venv/bin/pytest backend/tests/ -v

# Run specifically the E2E lifecycle test
PYTHONPATH=backend .venv/bin/pytest backend/tests/test_e2e_lifecycle.py -v

# Run with test coverage report
PYTHONPATH=backend .venv/bin/pytest backend/tests/ --cov=backend/app
```

### 3.2 Frontend Build & Typecheck
Ensure node dependencies are installed:

```bash
cd frontend
npm run build
```
This runs `tsc -b` to enforce zero TypeScript errors, followed by `vite build` to bundle static assets into `frontend/dist/`.

---

## 4. E2E Lifecycle Test Walkthrough

`backend/tests/test_e2e_lifecycle.py` validates the 15-step defect lifecycle:
1. Initialize test scenario (Hindi Health Insurance claim).
2. Synthesize audio with intentional truncation defect.
3. Run acoustic DSP framing analysis (detect abrupt tail cutoff).
4. Run Dual-ASR Jury (detect omitted final sentence).
5. Cross-corroborate into `END_TRUNCATION` finding with `STATUS: SUSPECTED`.
6. Submit human review confirming the defect (`STATUS: CONFIRMED`).
7. Compile Voice Defect Capsule; generate `audio_sha256` and assertions.
8. Call `GET /api/capsules/{id}/validate` to confirm byte hash integrity.
9. Synthesize replacement audio fixing the truncation defect.
10. Trigger regression execution (`POST /api/capsules/{id}/regression`).
11. Verify machine assertions pass (`A1` present, `A2` clean tail).
12. Verify verdict is `NEEDS_REVIEW` due to `A3: reviewer_approval_required`.
13. Submit human reviewer sign-off approving naturalness.
14. Final regression verdict transitions to `RESOLVED`.
15. Verify immutable audit event entry recorded in database.
