"""Central capsule state machine. The backend is the only writer of capsule.state."""
from typing import Dict, Optional, Set

class IllegalTransition(Exception):
    pass

TRANSITIONS: Dict[str, Set[str]] = {
    "DRAFT": {"EVIDENCE_LOCKED", "REJECTED"},
    "EVIDENCE_LOCKED": {"OPEN", "REJECTED"},
    "OPEN": {"REGRESSION_IN_PROGRESS", "REJECTED"},
    "REGRESSION_IN_PROGRESS": {"NEEDS_REVIEW", "STILL_FAILING", "REGRESSED", "BLOCKED"},
    "NEEDS_REVIEW": {"RESOLVED", "STILL_FAILING", "REGRESSION_IN_PROGRESS"},
    "STILL_FAILING": {"REGRESSION_IN_PROGRESS", "REJECTED"},
    "REGRESSED": {"REGRESSION_IN_PROGRESS", "REJECTED"},
    "BLOCKED": {"REGRESSION_IN_PROGRESS", "REJECTED"},
    "RESOLVED": {"REGRESSED"},        # a resolved capsule can only be re-opened by a later failure
    "REJECTED": set(),                # terminal
}
# Legacy value written by the pre-2.0 code; treated like STILL_FAILING for existing databases.
TRANSITIONS["REOPENED"] = set(TRANSITIONS["STILL_FAILING"])
LEGACY_ALIASES = {"REOPENED": "STILL_FAILING"}

def transition(current: str, target: str, *, regression_verdict: Optional[str] = None,
               signed_off_by: Optional[str] = None, evidence_hash_verified: bool = False) -> str:
    if target not in TRANSITIONS:
        raise IllegalTransition(f"Unknown state {target!r}")
    if current not in TRANSITIONS:
        raise IllegalTransition(f"Unknown current state {current!r}")
    if target not in TRANSITIONS[current]:
        raise IllegalTransition(f"{current} -> {target} is not permitted")
    if target == "EVIDENCE_LOCKED" and not evidence_hash_verified:
        raise IllegalTransition("Evidence can only be locked after the audio hash is verified")
    if target == "RESOLVED":
        if regression_verdict != "RESOLVED":
            raise IllegalTransition("RESOLVED requires an automated regression verdict of RESOLVED")
        if not (signed_off_by and signed_off_by.strip()):
            raise IllegalTransition("RESOLVED requires a named sign-off")
    return target


def apply_regression_outcome(current: str, verdict: str) -> str:
    """Move a capsule through REGRESSION_IN_PROGRESS to the state implied by an automated verdict.
    RESOLVED is deliberately NOT reachable here; it needs transition(..., signed_off_by=...)."""
    if verdict not in {"NEEDS_REVIEW", "STILL_FAILING", "REGRESSED", "BLOCKED"}:
        raise IllegalTransition(f"Verdict {verdict!r} cannot be applied automatically")
    state = transition(current, "REGRESSION_IN_PROGRESS")
    return transition(state, verdict)
