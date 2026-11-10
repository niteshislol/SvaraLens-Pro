import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Suite, TestCase, Run, Finding, Capsule, RegressionRun, User
from ..schemas import SuiteSummary
from ..config import settings
from ..export.json_ import export_capsule_json
from ..export.csv_ import export_suite_csv
from ..export.html_ import export_suite_html_report
from ..auth.dependencies import get_current_user

router = APIRouter(tags=["exports"])


@router.get("/suites/{id}/summary", response_model=SuiteSummary)
def get_suite_summary(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Summarizes test suite metrics strictly within the caller's organisation."""
    suite = db.query(Suite).filter(Suite.id == id, Suite.org_id == current_user.org_id).first()
    suite_name = suite.name if suite else "Insurance Hindi Voice Test Suite"

    cases = db.query(TestCase).filter(TestCase.suite_id == id, TestCase.org_id == current_user.org_id).all()
    case_ids = [c.id for c in cases]

    runs = db.query(Run).filter(Run.case_id.in_(case_ids), Run.org_id == current_user.org_id).all() if case_ids else []
    run_ids = [r.id for r in runs]

    findings = db.query(Finding).filter(Finding.run_id.in_(run_ids), Finding.org_id == current_user.org_id).all() if run_ids else []

    confirmed_failures = sum(1 for f in findings if f.review_state == "HUMAN_CONFIRMED")
    needs_review = sum(1 for f in findings if f.review_state in ("AUTO_DETECTED", "NEEDS_SECOND_REVIEW") and f.status in ("WARN", "SUSPECTED", "FAIL"))

    runs_with_fails = {f.run_id for f in findings if f.status in ("FAIL", "SUSPECTED")}
    auto_passed = sum(1 for r in runs if r.id not in runs_with_fails)

    capsules = db.query(Capsule).filter(Capsule.case_id.in_(case_ids), Capsule.org_id == current_user.org_id).all() if case_ids else []
    open_caps = sum(1 for c in capsules if c.state == "OPEN")
    resolved_caps = sum(1 for c in capsules if c.state == "RESOLVED")
    reopened_caps = sum(1 for c in capsules if c.state == "REOPENED")

    return SuiteSummary(
        suite_id=id,
        suite_name=suite_name,
        total_cases=len(cases),
        runs_count=len(runs),
        auto_passed=auto_passed,
        needs_review=needs_review,
        confirmed_failures=confirmed_failures,
        open_capsules=open_caps,
        resolved_capsules=resolved_caps,
        reopened_capsules=reopened_caps,
        mock_mode=settings.MOCK_MODE or not bool(settings.GNANI_API_KEY)
    )


@router.get("/exports/capsule/{id}.json")
def get_capsule_json_export(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exports capsule JSON representation. Scoped to organisation."""
    c = db.query(Capsule).filter(Capsule.id == id, Capsule.org_id == current_user.org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Capsule not found")
    spec = json.loads(c.spec_json)
    content = export_capsule_json(spec)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={id}.json"}
    )


@router.get("/exports/suite/{id}.csv")
def get_suite_csv_export(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exports test suite as CSV. Scoped to organisation."""
    cases = db.query(TestCase).filter(TestCase.suite_id == id, TestCase.org_id == current_user.org_id).all()
    runs_by_case = {}
    for c in cases:
        runs_by_case[c.id] = db.query(Run).filter(
            Run.case_id == c.id,
            Run.org_id == current_user.org_id
        ).order_by(Run.created_at.asc()).all()

    csv_data = export_suite_csv(cases, runs_by_case)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=suite_{id}.csv"}
    )


@router.get("/exports/report/{id}.html")
def get_suite_html_report_export(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates standalone HTML quality report strictly scoped to organisation."""
    suite = db.query(Suite).filter(Suite.id == id, Suite.org_id == current_user.org_id).first()
    suite_name = suite.name if suite else "Indic Voice QA Suite"
    cases = db.query(TestCase).filter(TestCase.suite_id == id, TestCase.org_id == current_user.org_id).all()

    summary = get_suite_summary(id, current_user, db).model_dump()

    cases_data = []
    for c in cases:
        latest_run = db.query(Run).filter(
            Run.case_id == c.id,
            Run.org_id == current_user.org_id
        ).order_by(Run.created_at.desc()).first()
        wer = "N/A"
        findings_list = []
        if latest_run:
            if latest_run.metrics_json:
                try:
                    wer = str(json.loads(latest_run.metrics_json).get("wer", "N/A"))
                except Exception:
                    pass
            for f in latest_run.findings:
                findings_list.append({
                    "check_type": f.check_type,
                    "status": f.status,
                    "review_state": f.review_state
                })
        cases_data.append({
            "id": c.id,
            "scenario": c.scenario,
            "language": c.language,
            "reference_text": c.reference_text,
            "wer": wer,
            "findings": findings_list
        })

    capsules = db.query(Capsule).filter(Capsule.org_id == current_user.org_id).all()
    caps_data = [{
        "id": cap.id,
        "defect_type": cap.defect_type,
        "state": cap.state,
        "failing_audio_sha256": cap.failing_audio_sha256
    } for cap in capsules]

    html_content = export_suite_html_report(suite_name, summary, cases_data, caps_data)
    return Response(content=html_content, media_type="text/html")


@router.get("/analytics/suite/{id}")
def get_suite_analytics(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Computes real database metrics and release readiness gates scoped to organisation."""
    cases = db.query(TestCase).filter(TestCase.suite_id == id, TestCase.org_id == current_user.org_id).all()
    case_ids = [c.id for c in cases]

    lang_counts = {}
    sev_counts = {}
    for c in cases:
        lang_counts[c.language] = lang_counts.get(c.language, 0) + 1
        sev_counts[c.severity] = sev_counts.get(c.severity, 0) + 1

    runs = db.query(Run).filter(Run.case_id.in_(case_ids), Run.org_id == current_user.org_id).all() if case_ids else []
    run_ids = [r.id for r in runs]
    findings = db.query(Finding).filter(Finding.run_id.in_(run_ids), Finding.org_id == current_user.org_id).all() if run_ids else []

    defects_by_cat = {}
    for f in findings:
        if f.status in ("WARN", "SUSPECTED", "FAIL"):
            defects_by_cat[f.check_type] = defects_by_cat.get(f.check_type, 0) + 1

    capsules = db.query(Capsule).filter(Capsule.case_id.in_(case_ids), Capsule.org_id == current_user.org_id).all() if case_ids else []
    open_critical_caps = [c.id for c in capsules if c.state in ("OPEN", "REOPENED") and c.severity == "CRITICAL"]
    pending_critical_reviews = [f.id for f in findings if f.review_state in ("AUTO_DETECTED", "NEEDS_SECOND_REVIEW") and f.severity == "CRITICAL"]

    is_ready = (len(open_critical_caps) == 0 and len(pending_critical_reviews) == 0)
    blockers = []
    if open_critical_caps:
        blockers.append(f"{len(open_critical_caps)} unresolved CRITICAL Voice Defect Capsule(s): {', '.join(open_critical_caps)}")
    if pending_critical_reviews:
        blockers.append(f"{len(pending_critical_reviews)} unverified CRITICAL automated finding(s)")

    dual_runs = [r for r in runs if r.stt_dual_results_json]
    avg_consensus = 0.0
    if dual_runs:
        consensus_scores = []
        for r in dual_runs:
            try:
                sc = json.loads(r.stt_dual_results_json).get("consensus_score")
                if sc is not None:
                    consensus_scores.append(float(sc))
            except Exception:
                pass
        if consensus_scores:
            avg_consensus = round(sum(consensus_scores) / len(consensus_scores), 1)

    return {
        "suite_id": id,
        "total_scenarios": len(cases),
        "total_runs": len(runs),
        "language_distribution": lang_counts,
        "severity_distribution": sev_counts,
        "defects_by_category": defects_by_cat,
        "dual_asr_average_consensus": avg_consensus,
        "open_capsules_count": sum(1 for c in capsules if c.state == "OPEN"),
        "resolved_capsules_count": sum(1 for c in capsules if c.state == "RESOLVED"),
        "release_readiness": {
            "status": "READY_FOR_RELEASE" if is_ready else "BLOCKED",
            "is_approved": is_ready,
            "blockers_count": len(blockers),
            "blockers": blockers
        }
    }
