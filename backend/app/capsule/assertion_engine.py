"""Fail-closed regression assertion engine (pure logic, no I/O, no DB, no provider calls).

Design rules (see docs/REGRESSION_ENGINE.md):
  * Every assertion returns exactly one of PASS / FAIL / WARNING / NOT_EVALUATED / NEEDS_REVIEW.
  * Missing, malformed or unmeasured evidence NEVER yields PASS.
  * Unknown assertion types are NOT_EVALUATED.
  * Subjective defects are never auto-passed; they need a named human sign-off.
  * RESOLVED is only reachable when every assertion is PASS, including human sign-off.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Dict, List, Optional, Tuple

ENGINE_VERSION = "2.0.0"

PASS, FAIL, WARNING = "PASS", "FAIL", "WARNING"
NOT_EVALUATED, NEEDS_REVIEW = "NOT_EVALUATED", "NEEDS_REVIEW"
STATUSES = {PASS, FAIL, WARNING, NOT_EVALUATED, NEEDS_REVIEW}

HUMAN_TYPE = "reviewer_approval_required"
DEFAULT_CLIP_THRESHOLD = 0.001  # fraction of samples at/above clipping amplitude


def _num(v: Any) -> Optional[float]:
    """Return v as float only if it is a real number (bool/None/str are rejected)."""
    if isinstance(v, bool) or v is None:
        return None
    return float(v) if isinstance(v, (int, float)) else None


@dataclass
class Evidence:
    """Everything the engine may look at. Absent data stays absent (None) - never defaulted."""
    transcript: Optional[str] = None
    asr_status: Optional[str] = None            # must be "SUCCESS" for transcript to count
    metrics: Dict[str, Any] = field(default_factory=dict)
    reference_text: str = ""
    # callables injected by the caller so this module stays dependency-free:
    phrase_matcher: Optional[Callable[[str, List[str], str], Tuple[bool, float, str]]] = None
    normalizer: Callable[[str], str] = lambda s: s
    last_sentence_eval: Optional[Dict[str, Any]] = None
    phrase_variants: Dict[str, List[str]] = field(default_factory=dict)
    human_signoff_by: Optional[str] = None       # authenticated reviewer id, never a free-text default
    new_findings: List[str] = field(default_factory=list)  # check_types detected on replacement audio

    def transcript_usable(self) -> bool:
        return self.asr_status == "SUCCESS" and bool(self.transcript and self.transcript.strip())

    def audio_ok(self) -> bool:
        return self.metrics.get("analysis_ok") is True


@dataclass
class AssertionResult:
    id: str
    type: str
    description: str
    status: str
    expected: str
    actual: str
    explanation: str
    method: str
    mandatory: bool = True
    engine_version: str = ENGINE_VERSION

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # backwards-compatible keys used by the existing API/UI
        d["before"] = "PENDING" if self.type == HUMAN_TYPE else "FAIL"
        d["after"] = self.status
        d["detail"] = self.explanation
        return d


def _res(a: Dict[str, Any], status: str, expected: str, actual: str, why: str, method: str) -> AssertionResult:
    assert status in STATUSES
    return AssertionResult(
        id=str(a.get("id", "?")), type=str(a.get("type", "?")), description=a.get("description", ""),
        status=status, expected=expected, actual=actual, explanation=why, method=method,
        mandatory=bool(a.get("mandatory", True)),
    )


# ---------------------------------------------------------------- evaluators
def _critical_phrase(a, ev: Evidence) -> AssertionResult:
    phrase = a.get("phrase", "")
    exp, meth = f"phrase '{phrase}' present in ASR transcript", "fuzzy phrase match on normalised transcript"
    if not phrase:
        return _res(a, NOT_EVALUATED, exp, "n/a", "Assertion has no phrase to check.", meth)
    if not ev.transcript_usable() or ev.phrase_matcher is None:
        return _res(a, NOT_EVALUATED, exp, "no usable transcript",
                    "ASR result unavailable or empty; cannot evaluate.", meth)
    matched, score, mtype = ev.phrase_matcher(phrase, ev.phrase_variants.get(phrase, []),
                                              ev.normalizer(ev.transcript))
    if matched:
        return _res(a, PASS, exp, f"matched ({mtype}, {score}%)", "Phrase found in transcript.", meth)
    return _res(a, FAIL, exp, f"not matched (best {score}%)",
                "Phrase not found. Note: ASR error can also cause this; human review resolves ambiguity.", meth)


def _truncation(a, ev: Evidence) -> AssertionResult:
    exp = "final sentence recognised AND audio tail not abruptly cut"
    meth = "last-sentence transcript match + tail-energy abrupt-end signal"
    tail = ev.metrics.get("tail_analysis")
    if not ev.audio_ok() or not isinstance(tail, dict) or not isinstance(tail.get("abrupt_end"), bool) \
            or not ev.transcript_usable() or ev.last_sentence_eval is None:
        return _res(a, NOT_EVALUATED, exp, "incomplete evidence",
                    "Need successful audio analysis, tail analysis and a usable transcript.", meth)
    text_candidate = bool(ev.last_sentence_eval.get("is_text_truncation_candidate"))
    abrupt = tail["abrupt_end"]
    act = f"text_candidate={text_candidate}, abrupt_end={abrupt}"
    if abrupt:
        return _res(a, FAIL, exp, act, "Audio tail energy indicates abrupt termination.", meth)
    if text_candidate:
        # A missing sentence in ASR does not prove truncation (ASR can err) -> human decides.
        return _res(a, NEEDS_REVIEW, exp, act,
                    "SUSPECTED_END_TRUNCATION: final sentence not recognised but audio tail looks normal.", meth)
    return _res(a, PASS, exp, act, "Final sentence recognised and tail is not abrupt.", meth)


def _clipping(a, ev: Evidence) -> AssertionResult:
    thr = _num(a.get("threshold"))
    thr = DEFAULT_CLIP_THRESHOLD if thr is None else thr
    exp, meth = f"clip_ratio < {thr}", "fraction of samples at or above clipping amplitude"
    ratio = _num(ev.metrics.get("clip_ratio"))
    if not ev.audio_ok() or ratio is None:
        return _res(a, NOT_EVALUATED, exp, "not measured", "Clipping was not measured.", meth)
    ok = ratio < thr
    return _res(a, PASS if ok else FAIL, exp, f"clip_ratio={ratio}",
                "Below threshold." if ok else "Clipping still exceeds threshold.", meth)


def _silence(a, ev: Evidence) -> AssertionResult:
    exp, meth = "0 significant silence gaps", "frame-RMS silence detection (see AUDIO_ANALYSIS)"
    n = _num(ev.metrics.get("silence_regions_count"))
    if not ev.audio_ok() or n is None:
        return _res(a, NOT_EVALUATED, exp, "not measured", "Silence was not measured.", meth)
    ok = n == 0
    return _res(a, PASS if ok else FAIL, exp, f"{int(n)} gaps",
                "No unexpected silence." if ok else f"{int(n)} silence gap(s) detected.", meth)


def _pace(a, ev: Evidence) -> AssertionResult:
    lo, hi = _num(a.get("min_pace")), _num(a.get("max_pace"))
    lo = 1.8 if lo is None else lo
    hi = 4.0 if hi is None else hi
    exp = f"{lo} <= words/second <= {hi}"
    meth = "reference word count / audio duration (APPROXIMATE; not syllable rate)"
    pace = _num(ev.metrics.get("pace_wps"))   # single canonical key; legacy 'pace_sps' deliberately ignored
    if not ev.audio_ok() or pace is None:
        return _res(a, NOT_EVALUATED, exp, "not measured", "Pace was not measured.", meth)
    ok = lo <= pace <= hi
    return _res(a, PASS if ok else FAIL, exp, f"{pace} words/s",
                "Within range." if ok else "Outside range.", meth)


def _code_switch(a, ev: Evidence) -> AssertionResult:
    exp, meth = "natural code-switch delivery", "automated transcript presence only; acoustic naturalness not machine-validated"
    if not ev.transcript_usable():
        return _res(a, NOT_EVALUATED, exp, "no usable transcript", "No usable transcript.", meth)
    return _res(a, NEEDS_REVIEW, exp, "transcript present",
                "A transcript existing does not prove natural code-switching; human review required.", meth)


def _human(a, ev: Evidence) -> AssertionResult:
    exp, meth = "named human reviewer sign-off", "authenticated reviewer decision"
    if ev.human_signoff_by and ev.human_signoff_by.strip():
        return _res(a, PASS, exp, f"signed off by {ev.human_signoff_by}", "Human sign-off recorded.", meth)
    return _res(a, NEEDS_REVIEW, exp, "no sign-off", "Requires human listener sign-off.", meth)


EVALUATORS: Dict[str, Callable[[Dict[str, Any], Evidence], AssertionResult]] = {
    "critical_phrase_present": _critical_phrase,
    "no_end_truncation": _truncation,
    "last_sentence_match": _truncation,
    "no_clipping": _clipping,
    "no_unexpected_silence": _silence,
    "speaking_pace_in_range": _pace,
    "code_switch_consistency": _code_switch,
    HUMAN_TYPE: _human,
}


def evaluate_assertion(a: Dict[str, Any], ev: Evidence) -> AssertionResult:
    fn = EVALUATORS.get(a.get("type"))
    if fn is None:
        return _res(a, NOT_EVALUATED, "known assertion type", f"type={a.get('type')!r}",
                    "Unknown assertion type; refusing to pass unvalidated assertion.", "none")
    try:
        return fn(a, ev)
    except Exception as exc:  # an evaluator crash must never become a PASS
        return _res(a, NOT_EVALUATED, "evaluation completes", "evaluator error",
                    f"Evaluator raised {type(exc).__name__}.", "none")


# ---------------------------------------------------------------- verdict
REGRESSION_CHECKS = {"CLIPPING", "UNEXPECTED_SILENCE", "PACE_OUT_OF_RANGE"}


def decide_verdict(results: List[AssertionResult], original_defect_type: Optional[str],
                   new_findings: List[str]) -> str:
    """Priority: STILL_FAILING > REGRESSED > BLOCKED > NEEDS_REVIEW > RESOLVED."""
    if not results:
        return "BLOCKED"                       # nothing proves anything
    mand = [r for r in results if r.mandatory]
    auto = [r for r in mand if r.type != HUMAN_TYPE]
    if not auto:
        return "BLOCKED"                       # fix must be demonstrated by an automated assertion
    if any(r.status == FAIL for r in mand):
        return "STILL_FAILING"
    if any(f in REGRESSION_CHECKS and f != original_defect_type for f in new_findings):
        return "REGRESSED"
    if any(r.status == NOT_EVALUATED for r in mand):
        return "BLOCKED"
    if any(r.status in (NEEDS_REVIEW, WARNING) for r in mand):
        return "NEEDS_REVIEW"
    if all(r.status == PASS for r in mand) and any(r.type == HUMAN_TYPE for r in mand):
        return "RESOLVED"
    return "NEEDS_REVIEW"                      # all auto PASS but no human assertion present -> still needs a human


def run_regression(spec: Dict[str, Any], ev: Evidence) -> Tuple[str, List[Dict[str, Any]]]:
    results = [evaluate_assertion(a, ev) for a in spec.get("assertions", [])]
    verdict = decide_verdict(results, spec.get("defect_type"), ev.new_findings)
    return verdict, [r.to_dict() for r in results]
