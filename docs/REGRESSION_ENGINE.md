# Regression Engine (engine version 2.0.0)

Implemented in `backend/app/capsule/assertion_engine.py` (pure logic) with `regression.py` as adapter and `state_machine.py` for capsule states.

## Statuses
PASS · FAIL · WARNING · NOT_EVALUATED · NEEDS_REVIEW. Each assertion result records id, type, description, method, expected, actual, status, explanation, mandatory, engine_version.

## Rules (all covered by `backend/tests/test_regression_fail_closed.py`)
- Missing/unmeasured/boolean/non-numeric evidence → NOT_EVALUATED, never PASS. Audio analysis that failed (`analysis_ok != True`) makes all acoustic assertions NOT_EVALUATED, even if it reported zeros.
- Unknown assertion type, or an evaluator exception → NOT_EVALUATED.
- Pace: single key `pace_wps`, unit words/second, approximate (reference word count ÷ duration). Legacy `pace_sps` is ignored.
- Code-switch: automated check can only return NEEDS_REVIEW (or NOT_EVALUATED). It never passes.
- Truncation: abrupt tail → FAIL; text-only suspicion (ASR missing the last sentence, tail normal) → NEEDS_REVIEW ("SUSPECTED_END_TRUNCATION"); PASS needs both signals clean.
- Verdict priority: STILL_FAILING > REGRESSED > BLOCKED > NEEDS_REVIEW > RESOLVED.
- RESOLVED requires: ≥1 automated mandatory assertion, every mandatory assertion PASS, and a named human sign-off. A sign-off can never change a FAIL or NOT_EVALUATED.
- Approval endpoint additionally requires the stored verdict to be NEEDS_REVIEW with all automated assertions PASS (HTTP 409 otherwise).
- Capsule state changes only via `state_machine.transition`; RESOLVED needs verdict RESOLVED + sign-off; REJECTED is terminal.

## Not yet implemented (honest limits)
- Defect-specific validators for AMOUNT (normalised entity equality) and PRONUNCIATION_ANOMALY are not separate evaluators; amounts use `critical_phrase_present`.
- Sign-off identity is still taken from the request body (`approved_by`) until authentication lands. A QA Lead role check is NOT enforced.
- Assertion results are stored as JSON on `RegressionRun`, not in a `RegressionResult` table.
- The adapter and endpoint wiring are compile-checked only; the pure engine is unit-tested (37 tests).
