"""Dedicated tests for audit findings REG-01..REG-05 and the capsule state machine.
Pure-logic: runs with stdlib unittest (python -m unittest) or pytest."""
import unittest
from app.capsule.assertion_engine import Evidence, run_regression, evaluate_assertion
from app.capsule.state_machine import transition, IllegalTransition

def matcher(phrase, variants, hyp):
    return (phrase in hyp, 100.0 if phrase in hyp else 0.0, "exact")

GOOD = {"analysis_ok": True, "clip_ratio": 0.0, "silence_regions_count": 0, "pace_wps": 2.5,
        "tail_analysis": {"abrupt_end": False}}
OK_LAST = {"is_text_truncation_candidate": False}

def ev(**kw):
    base = dict(transcript="कृपया भुगतान करें धन्यवाद", asr_status="SUCCESS", metrics=dict(GOOD),
                phrase_matcher=matcher, last_sentence_eval=dict(OK_LAST))
    base.update(kw); return Evidence(**base)

def A(t, **kw): return {"id": "A1", "type": t, **kw}
HUMAN = {"id": "A9", "type": "reviewer_approval_required"}

def status(a, e): return evaluate_assertion(a, e).status

class MissingDataNeverPasses(unittest.TestCase):          # REG-03
    def test_clipping_missing_metric(self):
        m = dict(GOOD); del m["clip_ratio"]
        self.assertEqual(status(A("no_clipping"), ev(metrics=m)), "NOT_EVALUATED")
    def test_silence_missing_metric(self):
        m = dict(GOOD); del m["silence_regions_count"]
        self.assertEqual(status(A("no_unexpected_silence"), ev(metrics=m)), "NOT_EVALUATED")
    def test_failed_analysis_zeros_are_not_measurements(self):
        m = {"analysis_ok": False, "clip_ratio": 0.0, "silence_regions_count": 0, "pace_wps": 0.0}
        for t in ("no_clipping", "no_unexpected_silence", "speaking_pace_in_range"):
            self.assertEqual(status(A(t), ev(metrics=m)), "NOT_EVALUATED", t)
    def test_boolean_is_not_a_number(self):
        m = dict(GOOD, clip_ratio=True)
        self.assertEqual(status(A("no_clipping"), ev(metrics=m)), "NOT_EVALUATED")
    def test_asr_failure_means_not_evaluated(self):
        e = ev(asr_status="FAILED", transcript="")
        self.assertEqual(status(A("critical_phrase_present", phrase="x"), e), "NOT_EVALUATED")
        self.assertEqual(status(A("no_end_truncation"), e), "NOT_EVALUATED")

class CodeSwitch(unittest.TestCase):                      # REG-02
    def test_nonempty_transcript_is_not_a_pass(self):
        self.assertEqual(status(A("code_switch_consistency"), ev(transcript="asdf")), "NEEDS_REVIEW")
    def test_no_transcript(self):
        self.assertEqual(status(A("code_switch_consistency"), ev(transcript="  ")), "NOT_EVALUATED")

class Pace(unittest.TestCase):                            # REG-04
    def test_uses_pace_wps(self):
        self.assertEqual(status(A("speaking_pace_in_range"), ev(metrics=dict(GOOD, pace_wps=2.5))), "PASS")
    def test_legacy_key_is_ignored_not_misread(self):
        m = dict(GOOD); del m["pace_wps"]; m["pace_sps"] = 2.5
        self.assertEqual(status(A("speaking_pace_in_range"), ev(metrics=m)), "NOT_EVALUATED")
    def test_out_of_range_fails_and_unit_is_words(self):
        r = evaluate_assertion(A("speaking_pace_in_range"), ev(metrics=dict(GOOD, pace_wps=6.0)))
        self.assertEqual(r.status, "FAIL"); self.assertIn("words", r.actual); self.assertNotIn("syl", r.actual)

class UnknownType(unittest.TestCase):                     # REG-05
    def test_unknown_type_never_passes(self):
        self.assertEqual(status(A("made_up_check"), ev()), "NOT_EVALUATED")
    def test_evaluator_crash_never_passes(self):
        bad = Evidence(transcript="x", asr_status="SUCCESS", metrics=GOOD,
                       phrase_matcher=lambda *a: (_ for _ in ()).throw(RuntimeError("boom")))
        self.assertEqual(status(A("critical_phrase_present", phrase="x"), bad), "NOT_EVALUATED")

class Truncation(unittest.TestCase):
    def test_text_only_suspicion_requires_human(self):
        e = ev(last_sentence_eval={"is_text_truncation_candidate": True})
        self.assertEqual(status(A("no_end_truncation"), e), "NEEDS_REVIEW")
    def test_abrupt_end_fails(self):
        e = ev(metrics=dict(GOOD, tail_analysis={"abrupt_end": True}))
        self.assertEqual(status(A("no_end_truncation"), e), "FAIL")
    def test_clean_passes(self):
        self.assertEqual(status(A("no_end_truncation"), ev()), "PASS")

class Verdicts(unittest.TestCase):
    spec = {"defect_type": "CLIPPING", "assertions": [A("no_clipping"), HUMAN]}
    def test_all_auto_pass_without_signoff_needs_review(self):
        self.assertEqual(run_regression(self.spec, ev())[0], "NEEDS_REVIEW")
    def test_resolved_only_with_named_signoff(self):
        self.assertEqual(run_regression(self.spec, ev(human_signoff_by="reviewer-7"))[0], "RESOLVED")
    def test_blank_signoff_is_not_signoff(self):
        self.assertEqual(run_regression(self.spec, ev(human_signoff_by="  "))[0], "NEEDS_REVIEW")
    def test_signoff_cannot_override_failure(self):       # REG-01
        e = ev(metrics=dict(GOOD, clip_ratio=0.05), human_signoff_by="reviewer-7")
        self.assertEqual(run_regression(self.spec, e)[0], "STILL_FAILING")
    def test_signoff_cannot_override_missing_data(self):
        m = dict(GOOD); del m["clip_ratio"]
        self.assertEqual(run_regression(self.spec, ev(metrics=m, human_signoff_by="r"))[0], "BLOCKED")
    def test_human_only_spec_is_blocked(self):            # fix must be shown against an automated assertion
        self.assertEqual(run_regression({"assertions": [HUMAN]}, ev(human_signoff_by="r"))[0], "BLOCKED")
    def test_empty_spec_is_blocked(self):
        self.assertEqual(run_regression({"assertions": []}, ev())[0], "BLOCKED")
    def test_new_defect_elsewhere_is_regression(self):
        self.assertEqual(run_regression(self.spec, ev(new_findings=["UNEXPECTED_SILENCE"], human_signoff_by="r"))[0], "REGRESSED")
    def test_results_carry_full_assertion_record(self):
        _, rows = run_regression(self.spec, ev())
        for k in ("id","type","description","status","expected","actual","explanation","method","engine_version","before","after","detail"):
            self.assertIn(k, rows[0])

class StateMachine(unittest.TestCase):
    def test_happy_path(self):
        s = "DRAFT"
        s = transition(s, "EVIDENCE_LOCKED", evidence_hash_verified=True)
        for t in ("OPEN", "REGRESSION_IN_PROGRESS", "NEEDS_REVIEW"):
            s = transition(s, t)
        self.assertEqual(transition(s, "RESOLVED", regression_verdict="RESOLVED", signed_off_by="lead-1"), "RESOLVED")
    def test_cannot_lock_without_verified_hash(self):
        with self.assertRaises(IllegalTransition): transition("DRAFT", "EVIDENCE_LOCKED")
    def test_cannot_jump_to_resolved(self):
        for cur in ("DRAFT", "OPEN", "STILL_FAILING", "BLOCKED", "REGRESSION_IN_PROGRESS"):
            with self.assertRaises(IllegalTransition): transition(cur, "RESOLVED", regression_verdict="RESOLVED", signed_off_by="x")
    def test_resolved_needs_verdict_and_signoff(self):
        with self.assertRaises(IllegalTransition): transition("NEEDS_REVIEW", "RESOLVED", regression_verdict="STILL_FAILING", signed_off_by="x")
        with self.assertRaises(IllegalTransition): transition("NEEDS_REVIEW", "RESOLVED", regression_verdict="RESOLVED")
    def test_rejected_is_terminal_and_unknown_rejected(self):
        with self.assertRaises(IllegalTransition): transition("REJECTED", "OPEN")
        with self.assertRaises(IllegalTransition): transition("OPEN", "WHATEVER")
    def test_legacy_reopened_still_usable(self):
        self.assertEqual(transition("REOPENED", "REGRESSION_IN_PROGRESS"), "REGRESSION_IN_PROGRESS")

if __name__ == "__main__":
    unittest.main()


class Outcome(unittest.TestCase):
    def test_outcome_paths_through_in_progress(self):
        from app.capsule.state_machine import apply_regression_outcome
        self.assertEqual(apply_regression_outcome("OPEN", "STILL_FAILING"), "STILL_FAILING")
        self.assertEqual(apply_regression_outcome("STILL_FAILING", "NEEDS_REVIEW"), "NEEDS_REVIEW")
    def test_outcome_can_never_resolve(self):
        from app.capsule.state_machine import apply_regression_outcome
        with self.assertRaises(IllegalTransition): apply_regression_outcome("OPEN", "RESOLVED")
    def test_resolved_capsule_cannot_be_silently_rerun_to_needs_review(self):
        from app.capsule.state_machine import apply_regression_outcome
        with self.assertRaises(IllegalTransition): apply_regression_outcome("RESOLVED", "NEEDS_REVIEW")
