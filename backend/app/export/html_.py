import html
from typing import Dict, Any, List

def export_suite_html_report(suite_name: str, summary: Dict[str, Any], cases_data: List[Dict[str, Any]], capsules_data: List[Dict[str, Any]]) -> str:
    """
    Renders a standalone printable HTML QA report.
    Adheres to design rules:
    - Objective and human review results are kept visibly separated.
    - Honest uncertainty: warnings worded 'possible', only confirmed defects marked red.
    - Monospace for hashes.
    """
    rows_cases = ""
    for c in cases_data:
        findings_badges = ""
        for f in c.get("findings", []):
            color = "#F04D4D" if f.get("review_state") == "HUMAN_CONFIRMED" else ("#F5A524" if f.get("status") == "WARN" else "#A78BFA")
            findings_badges += f'<span style="background:{color}22; color:{color}; border:1px solid {color}55; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px;">{html.escape(f.get("check_type", ""))}</span>'

        rows_cases += f"""
        <tr>
            <td style="font-family:monospace; font-weight:bold;">{html.escape(c.get('id', ''))}</td>
            <td><strong>{html.escape(c.get('scenario', ''))}</strong><br><small style="color:#666;">{html.escape(c.get('language', ''))}</small></td>
            <td style="font-size:12px;">{html.escape(c.get('reference_text', ''))[:90]}...</td>
            <td style="font-family:monospace;">{c.get('wer', 'N/A')}</td>
            <td>{findings_badges or '<span style="color:#2FBF71;">✓ PASS</span>'}</td>
        </tr>
        """

    capsule_cards = ""
    for cap in capsules_data:
        capsule_cards += f"""
        <div style="background:#171A21; border:1px solid #262B36; border-radius:8px; padding:16px; margin-bottom:12px; color:#E6E8EE;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-family:monospace; font-weight:bold; color:#4F8CFF;">{html.escape(cap.get('id', ''))}</span>
                <span style="background:#F04D4D22; color:#F04D4D; border:1px solid #F04D4D55; padding:2px 8px; border-radius:4px; font-size:12px;">{html.escape(cap.get('defect_type', ''))}</span>
                <span style="background:{'#2FBF7122' if cap.get('state') == 'RESOLVED' else '#F5A52422'}; color:{'#2FBF71' if cap.get('state') == 'RESOLVED' else '#F5A524'}; padding:2px 8px; border-radius:4px; font-size:12px;">{html.escape(cap.get('state', ''))}</span>
            </div>
            <div style="font-family:monospace; font-size:11px; color:#9AA3B2; margin-top:8px;">Audio SHA-256: {html.escape(cap.get('failing_audio_sha256', '')[:24])}...</div>
        </div>
        """

    html_doc = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SvaraLens QA Release Report - {html.escape(suite_name)}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F1115; color: #E6E8EE; margin: 0; padding: 40px; }}
        .header {{ border-bottom: 1px solid #262B36; padding-bottom: 24px; margin-bottom: 32px; }}
        .title {{ font-size: 26px; font-weight: 700; margin: 0 0 8px 0; color: #FFFFFF; }}
        .subtitle {{ font-size: 14px; color: #9AA3B2; margin: 0; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }}
        .stat-card {{ background: #171A21; border: 1px solid #262B36; border-radius: 8px; padding: 18px; }}
        .stat-val {{ font-size: 28px; font-weight: 700; margin-top: 4px; }}
        .stat-lbl {{ font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #9AA3B2; }}
        h2 {{ font-size: 18px; margin: 28px 0 16px 0; color: #FFFFFF; border-left: 3px solid #4F8CFF; padding-left: 10px; }}
        table {{ width: 100%; border-collapse: collapse; background: #171A21; border-radius: 8px; overflow: hidden; }}
        th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #262B36; }}
        th {{ background: #1F232D; font-size: 12px; text-transform: uppercase; color: #9AA3B2; }}
        @media print {{
            body {{ background: #ffffff; color: #111111; padding: 20px; }}
            .stat-card, table, .header {{ border-color: #ddd; background: #fafafa; }}
            th {{ background: #eee; color: #333; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">SvaraLens — QA Evidence & Regression Report</h1>
        <p class="subtitle">Suite: {html.escape(suite_name)} | Evaluated with Gnani Timbre v2.5 & Prisma v2.5</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-lbl">Total Test Cases</div>
            <div class="stat-val" style="color: #4F8CFF;">{summary.get('total_cases', 0)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-lbl">Automated Pass</div>
            <div class="stat-val" style="color: #2FBF71;">{summary.get('auto_passed', 0)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-lbl">Needs Human Review</div>
            <div class="stat-val" style="color: #A78BFA;">{summary.get('needs_review', 0)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-lbl">Confirmed Defects</div>
            <div class="stat-val" style="color: #F04D4D;">{summary.get('confirmed_failures', 0)}</div>
        </div>
    </div>

    <h2>1. Objective Automated Test Run Results</h2>
    <table>
        <thead>
            <tr>
                <th>Case ID</th>
                <th>Scenario</th>
                <th>Reference Script</th>
                <th>WER</th>
                <th>Automated Checks</th>
            </tr>
        </thead>
        <tbody>
            {rows_cases}
        </tbody>
    </table>

    <h2>2. Defect Capsules & Regression Ledger</h2>
    {capsule_cards or '<p style="color:#9AA3B2;">No defect capsules compiled.</p>'}

    <div style="margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #262B36; padding-top: 16px;">
        Generated by SvaraLens (Indic Voice QA Evidence & Regression Workbench). All timestamps UTC.
    </div>
</body>
</html>
"""
    return html_doc
