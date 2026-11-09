import csv
import io
import json
from typing import List, Any

def export_suite_csv(test_cases: List[Any], runs_by_case: dict) -> str:
    """Exports test suite cases and latest findings to CSV."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Case ID", "Scenario", "Language", "Severity", "Channel",
        "Reference Text", "Critical Phrases", "Latest Status", "WER", "Duration (s)", "Findings Count"
    ])

    for tc in test_cases:
        runs = runs_by_case.get(tc.id, [])
        latest_run = runs[-1] if runs else None
        
        status = latest_run.status if latest_run else "PENDING"
        wer = "N/A"
        duration = "N/A"
        findings_count = 0

        if latest_run and latest_run.metrics_json:
            try:
                m = json.loads(latest_run.metrics_json)
                wer = str(m.get("wer", "N/A"))
                duration = str(m.get("duration_s", "N/A"))
            except Exception:
                pass
        if latest_run and hasattr(latest_run, "findings"):
            findings_count = len(latest_run.findings)

        writer.writerow([
            tc.id,
            tc.scenario,
            tc.language,
            tc.severity,
            tc.channel,
            tc.reference_text,
            tc.critical_phrases_json,
            status,
            wer,
            duration,
            findings_count
        ])

    return output.getvalue()
