# SvaraLens Pro — Product Readiness Audit (Phase 0 + partial Phase 1)

**Method:** static source review of the 115-file archive (~4,150 lines backend Python, React/TS frontend).
**Not done:** the sandbox had no network, so dependencies could not be installed, the backend and tests were **not executed**, and docs.gnani.ai was **not consulted**. Nothing below is "IMPLEMENTED_AND_VERIFIED" for that reason. Fixes applied were only `py_compile`-checked.
**Not checkable:** Git history (archive has no `.git`).

## Readiness verdict (current)
**Demonstration-ready only.** Not internal-pilot-ready: no authentication, no tenancy, regression engine can false-PASS, evaluation report is invalid.

## Findings

Status key: FIXED_UNTESTED = patched, compiles, needs test run · OPEN = not yet addressed

| ID | Sev | File / function | Problem | Business impact | Correction | Acceptance test | Status |
|---|---|---|---|---|---|---|---|
| SEC-01 | CRIT | `.env.example` | Contained a 134-char live-looking Gnani key (`vach…`) | Credential exposure in any distributed copy | Scrubbed to empty placeholder; secret scan added (`scripts/scan_secrets.py`); `docs/DEPLOYMENT.md` placeholder fixed | Scan exits 0; key absent from tree | FIXED_UNTESTED. **You must still revoke/rotate the key and scan Git history — the key must be treated as compromised.** |
| SEC-02 | CRIT | `routers/runs.py::get_run_audio` | Route `/{id:path}/audio` fell back to `Path(id)` → arbitrary server file read | Any caller reads any readable file | Route by run ID only; resolved path must be inside `AUDIO_STORE_PATH`; RIFF signature check; nosniff | `GET /api/runs/..%2f..%2fetc%2fpasswd/audio` → 404; path outside root → 404 | FIXED_UNTESTED (auth/org checks/access logging still OPEN) |
| SEC-03 | CRIT | whole backend | No authentication, users, roles, or org scoping anywhere (grep: zero matches) | Anyone can read, review, approve, resolve | Auth + RBAC + `org_id` on all tables, enforced server-side | Unauthenticated → 401; cross-org → 404; reviewer approve → 403 | OPEN |
| SEC-04 | HIGH | `main.py` | `allow_credentials=True` with `CORS_ORIGINS or ["*"]` | Unsafe if origins unset | Fail closed on empty origins | Startup refuses `*` with credentials | OPEN |
| REG-01 | CRIT | `routers/capsules.py::approve_regression_run` | Approval set verdict `RESOLVED` unconditionally, overwriting STILL_FAILING | A failed fix could be signed off | Require verdict `NEEDS_REVIEW` and all non-human assertions PASS, else 409 | Approve on STILL_FAILING → 409 | FIXED_AND_UNIT_TESTED (engine rule); endpoint compile-checked |
| REG-02 | CRIT | `capsule/regression.py` | `code_switch_consistency` passes on any non-empty transcript | False PASS on subjective defect | Return `NEEDS_REVIEW`; add timing/marker evidence | Garbage transcript never yields PASS | FIXED_AND_UNIT_TESTED (engine); adapter wiring compile-checked |
| REG-03 | CRIT | `capsule/regression.py` | Missing metrics default to `0.0` (`clip_ratio`, `pace_sps`, `silence_regions_count`) → missing data passes clipping/silence | Violates fail-closed rule | Missing → `NOT_EVALUATED`, blocks resolution | Absent metric → not PASS | FIXED_AND_UNIT_TESTED (engine); adapter wiring compile-checked |
| REG-04 | HIGH | `capsule/regression.py` | Reads `pace_sps`; checker emits `pace_wps`; message says "syl/s" (is words/s) | Pace assertion tests wrong key/unit | Single key + unit `words_per_second`, labelled approximate | Unit test on key/unit | FIXED_AND_UNIT_TESTED (engine); adapter wiring compile-checked |
| REG-05 | HIGH | `capsule/regression.py` else-branch | Unknown assertion types PASS unless another already failed | Unvalidated assertions pass | Unknown type → `NOT_EVALUATED` | Unknown type blocks | FIXED_AND_UNIT_TESTED (engine); adapter wiring compile-checked |
| REG-06 | HIGH | `routers/capsules.py::rerun` | Replacement run hardcodes `tts_model="timbre-v3.0"`, `tts_voice="Shivani"` regardless of request; uploads labelled by `source` only; `consensus_score` defaults to 100.0 | False provenance | Record real model/voice from provider response; null for uploads | Provenance equals request | PARTIAL: fake model/voice/consensus defaults removed (null when unknown); real provenance capture still needs provider adapter |
| REG-07 | MED | same | Regression assertions use evaluation of `injected_fault="FIXED"` via signature inspection hack | Mock path leaks into regression logic | Remove; separate mock adapter | — | OPEN |
| CAP-01 | CRIT | `capsule/compiler.py` | Hash fell back to `"sha256:unknown"`; stored hash trusted without recompute | Fake evidence hash | Always hash actual bytes; mismatch or missing file → error | Missing file → compile raises | FIXED_UNTESTED |
| CAP-02 | HIGH | `capsule/compiler.py` | Provenance hardcoded `timbre-v2.5`/`prisma-v2.5`, voice default `"ananya"` | Capsules misstate execution | TTS now from run; **STT model still `None`** pending ASRExecution table | Capsule model == run model | PARTIAL |
| CAP-03 | HIGH | `routers/capsules.py::validate` | Returns `"FILE_NOT_FOUND_ON_DISK"` as a hash string; reads `audio_file_path` from spec (path from DB JSON) | Ambiguous, path trust | Typed error state; resolve inside storage root | — | OPEN |
| CAP-04 | HIGH | `models.py` Capsule | States `OPEN/RESOLVED/REOPENED` only; no state machine; `review_status` defaults `HUMAN_CONFIRMED` | No transition control | Central state machine, no defaults | Illegal transitions 409 | PARTIAL: state machine implemented + unit-tested and used by rerun/approve; `review_status` default still OPEN |
| REV-01 | HIGH | `pages/ReviewStudio.tsx:48` | Default reviewer `'Senior Indic QA Consultant'` | Fabricated identity | Identity from session | No default | OPEN |
| REV-02 | HIGH | `models.py` Review | Defaults `consensus_status=AGREED`, `review_status=CONFIRMED` | Pre-populated judgments | No defaults; explicit states | New review starts unselected | OPEN |
| REV-03 | HIGH | `routers/findings.py` PATCH | Client sets `review_state` freely; `reviewed_by` is client-supplied | Anyone can "confirm" a finding | Server-owned transitions + identity | Forged reviewer ignored | OPEN |
| REV-04 | MED | `routers/runs.py` pins | Pins stored as JSON blob, `dict` body unvalidated, category defaults `END_TRUNCATION`/`HIGH` | Silent wrong data | Pin table + schema validation | Missing category → 422 | OPEN |
| GN-01 | HIGH | `gnani/client.py` | `TIMBRE_V3_VOICES`/`V25_VOICES` hardcoded; unknown voice silently replaced (`"Shivani"`/`"Nalini"`) | Provenance mismatch | Validate against verified manifest; reject | Unsupported voice → 422 | OPEN, **needs docs/account access** |
| GN-02 | HIGH | `gnani/client.py` | Default base differs across files (`api.vachana.ai` / `api.gnani.ai`); TTS and STT use different URL styles; STT hardcodes `/stt/v3` for both models; **none verified against official docs** | May fail live or hit wrong endpoint | Verify with docs; live smoke test | Smoke test | BLOCKED (no network) |
| GN-03 | HIGH | `gnani/client.py::synthesize` | `hinglish`→`hi-IN`; STT `indic-auto` for v3 else same mapping; request ID defaults to fake `"req-live-timbre"`; retries synthesis 3× blindly | Wrong language handling; duplicate billed calls; fake IDs | Separate TTS/STT language maps; real IDs or null; no blind retry | — | OPEN |
| GN-04 | HIGH | `gnani/client.py::transcribe_dual_asr` | Failed engine → `""` text; latency defaults `0.23` s / `230.0` ms (**invented**); `both_agree` can be computed from empty strings; v3.0 duration reuse | Fabricated latency; failure looks like a result | Per-engine status enum; null latency; agreement only from usable transcripts | Failed engine ≠ empty success | OPEN |
| GN-05 | MED | `routers/health.py` | `gnani_connected = bool(key and not MOCK)` — configured ≠ reachable | "Live" shown without any call | configured / authenticated / reachable triad | — | OPEN |
| GN-06 | HIGH | `client.py` END_TRUNCATION | Live client *trims the TTS prompt* when `injected_fault` set | Simulated defects in live path | Move injection to labelled post-processing of audio | Injected runs flagged `simulated` | OPEN |
| AUD-01 | HIGH | `checks/pace.py` | Words/sec labelled "syllables" elsewhere; `reference.split()` on Devanagari/Hinglish is crude | Unit mismatch | Documented word-based approximation | — | OPEN |
| AUD-02 | MED | `routers/cases.py` / `capsules.py` uploads | `shutil.copyfileobj` of whole upload; no size cap, signature, or duration check; raw file written then unlinked | DoS, invalid media | Size/MIME/signature/duration validation; ffmpeg present (`/usr/bin/ffmpeg` in sandbox) but Dockerfile doesn't install it | Oversized → 413 | OPEN |
| AUD-03 | MED | `checks/truncation.py` | Exists with multi-signal approach; **unverified** | — | Run tests; ensure `SUSPECTED_*` wording | — | IMPLEMENTED_BUT_UNVERIFIED |
| UI-01 | HIGH | `pages/SuiteDashboard.tsx:91,98,105,112` | Fallbacks `'32'`, `'1'`, `'0'`, `'1'` shown when API fails | Fake figures | Loading / No Data / Unable to Load states | API down → "Unable to Load" | OPEN |
| UI-02 | HIGH | `components/CompactAudioHealth.tsx:86,90,93` | Missing clip metric → `'0.0%'`; no silence findings → `'OK'`; no findings → "Healthy" | False reassurance | NOT_EVALUATED state | Missing metric ≠ 0% | OPEN |
| EVAL-01 | CRIT | `scripts/run_eval.py`, `run_eval_direct.py` | `PASS` is a literal string in every row | Report claims success it didn't earn | Computed verdicts with n and CIs | 71.4% vs ≥85% → FAIL | FIXED_AND_UNIT_TESTED (verdict module); scripts patched, not executed |
| EVAL-02 | CRIT | `EVALUATION_REPORT.md` | CPR 71.4% (≥85), WER 47.9% (≤35), CER 37.5% (≤20), FPR 44.4% (≤20) all labelled PASS; reproducibility "100%" is asserted, not measured | Misleading to evaluators | Banner added: INVALID. Real numbers show failing targets | — | MITIGATED |
| DB-01 | MED | `db.py::ensure_schema` | Manual `ALTER TABLE` ladder; line 78 `except Exception` swallows errors; `create_all` at import | Silent migration failure | Alembic, backup, no swallowed errors | Fresh + upgrade tests | OPEN |
| DB-02 | HIGH | `models.py` | No Organisation/User/Role/AuditEvent-per-actor, no ASR/Model execution tables; heavy JSON-blob columns | Cannot satisfy traceability | Schema per Part L | — | OPEN |
| OPS-01 | MED | `Dockerfile`, `docker-compose.yml` | No ffmpeg; `npm install` not `ci`; runs as root; compose default `MOCK_MODE=false`, base `api.gnani.ai` vs `.env.example` `api.vachana.ai` | Inconsistent/insecure deploy | Non-root user, ffmpeg, consistent config | — | OPEN |
| OPS-02 | MED | whole backend | No structured logging, request IDs, jobs, cancellation | Not operable | Per Part M | — | OPEN |

### Features by classification
- **IMPLEMENTED_BUT_UNVERIFIED:** scenario CRUD, waveform player, truncation/phrase/entity/silence/clipping checks, CSV/HTML/JSON export, existing 6 test files (never run here).
- **PARTIALLY_IMPLEMENTED:** Dual-ASR (GN-04), capsule compile (CAP-01..04), review workflow (REV-*), health (GN-05).
- **INCORRECT_IMPLEMENTATION:** regression engine (REG-02..05), approval (REG-01, now patched), eval scripts (EVAL-01).
- **NOT_IMPLEMENTED:** auth, RBAC, tenancy, second-reviewer/adjudication, model catalogue, number-normalisation stage, batch/streaming STT, job queue, Alembic, benchmarking, release gate, defect-injection framework with manifests.
- **BLOCKED_BY_PROVIDER / ENVIRONMENT:** live endpoint/parameter verification, voice/model entitlement (needs docs access + valid key).
- **FUTURE_ENTERPRISE_ENHANCEMENT:** OIDC/SSO, object storage, streaming ASR.

## Changes made in this pass (all FIXED_UNTESTED)
1. `.env.example`, `docs/DEPLOYMENT.md`: credential removed; `scripts/scan_secrets.py` added (tree is clean).
2. `routers/runs.py`: arbitrary-path audio read removed.
3. `routers/capsules.py`: approval is fail-closed.
4. `capsule/compiler.py`: real-bytes hash only; TTS provenance from run.
5. `EVALUATION_REPORT.md`: marked invalid.
Original archive preserved at `backup/SvaraLens-Pro-main.ORIGINAL.zip`.

## Recommended order for remaining work
Auth/RBAC/org scoping (SEC-03) → regression fail-closed rewrite with tests (REG-02..06) → Gnani adapter + manifest (needs docs & key) → review workflow → Alembic → analytics/UI honesty → eval framework → E2E.


## Update — Phase 6 (regression engine) brought forward
Verified by execution: **37 unit tests pass** (`python -m unittest` from `backend/`) covering REG-01..05, the state machine and the eval verdict module. Not verified by execution: FastAPI endpoints, DB writes, the adapter's import of `rapidfuzz`/SQLAlchemy, and the patched eval scripts (no network → dependencies unavailable).
Additional changes: `audio/analyze.py` and `checks/runner.py` now emit `analysis_ok`; `schemas.RunRead` and `runs.py` no longer invent `timbre-v3.0`/`Shivani` provenance on read; new `docs/REGRESSION_ENGINE.md`.
Still open and now highest priority: SEC-03 (auth/RBAC/org scoping), which also fixes client-supplied `approved_by`/`reviewer` (REV-03).
