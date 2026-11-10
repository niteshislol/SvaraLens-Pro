import sys, pathlib, unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "scripts"))
from eval_verdicts import evaluate_minimum as mn, evaluate_maximum as mx

class V(unittest.TestCase):
    def test_reported_report_numbers_fail(self):          # EVAL-02: the numbers in the old report
        self.assertEqual(mn(71.4, 85.0, n=49), "PASS" if False else "FAIL")
        self.assertEqual(mx(47.9, 35.0), "FAIL")
        self.assertEqual(mx(37.5, 20.0), "FAIL")
        self.assertEqual(mx(44.4, 20.0, n=18), "FAIL")
    def test_pass_requires_enough_samples(self):
        self.assertEqual(mn(100.0, 80.0, n=1), "INSUFFICIENT_DATA")
        self.assertEqual(mn(100.0, 80.0, n=40), "PASS")
    def test_missing_or_invalid_is_not_measured(self):
        for bad in (None, float("nan"), "x", True): self.assertEqual(mn(bad, 1), "NOT_MEASURED")
    def test_boundary(self):
        self.assertEqual(mn(85.0, 85.0), "PASS"); self.assertEqual(mx(20.0, 20.0), "PASS")
if __name__ == "__main__": unittest.main()
