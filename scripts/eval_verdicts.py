"""Metric verdicts computed from measured values. Never hardcode PASS.
Returns PASS | FAIL | INSUFFICIENT_DATA | NOT_MEASURED."""
from typing import Optional
import math

MIN_SAMPLES = 30   # below this a rate is reported but cannot earn PASS

def _valid(x) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)

def evaluate_minimum(actual, target, n: Optional[int] = None, min_n: int = MIN_SAMPLES) -> str:
    if not _valid(actual) or not _valid(target): return "NOT_MEASURED"
    if n is not None and n < min_n: return "FAIL" if actual < target else "INSUFFICIENT_DATA"
    return "PASS" if actual >= target else "FAIL"

def evaluate_maximum(actual, target, n: Optional[int] = None, min_n: int = MIN_SAMPLES) -> str:
    if not _valid(actual) or not _valid(target): return "NOT_MEASURED"
    if n is not None and n < min_n: return "FAIL" if actual > target else "INSUFFICIENT_DATA"
    return "PASS" if actual <= target else "FAIL"
# Note: a miss on a tiny sample is still reported FAIL (we do not hide a miss behind small n);
# a hit on a tiny sample is INSUFFICIENT_DATA (we do not claim success from too little data).
