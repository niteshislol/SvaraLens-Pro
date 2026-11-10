from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Float, Integer, ForeignKey, Index, CheckConstraint
)
from sqlalchemy.orm import relationship
from .db import Base


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(String, primary_key=True)  # e.g. 'org-gnani-qa', 'org-default'
    name = Column(String, nullable=False)
    created_at = Column(String, default=utcnow_iso, nullable=False)
    is_active = Column(Integer, default=1, nullable=False)

    users = relationship("User", back_populates="organisation", cascade="all, delete-orphan")
    suites = relationship("Suite", back_populates="organisation", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="organisation", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="organisation", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # usr-xxxx
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'ADMIN', 'QA_LEAD', 'QA_REVIEWER', 'AUDITOR'
    full_name = Column(String, nullable=True)
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(String, default=utcnow_iso, nullable=False)
    last_login_at = Column(String, nullable=True)

    organisation = relationship("Organisation", back_populates="users")

    __table_args__ = (
        CheckConstraint("role IN ('ADMIN', 'QA_LEAD', 'QA_REVIEWER', 'AUDITOR')", name="check_user_role"),
    )


class Suite(Base):
    __tablename__ = "suites"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(String, default=utcnow_iso, nullable=False)

    organisation = relationship("Organisation", back_populates="suites")
    test_cases = relationship("TestCase", back_populates="suite", cascade="all, delete-orphan")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(String, primary_key=True)  # TC-001, TC-014, etc.
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    suite_id = Column(String, ForeignKey("suites.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    language = Column(String, nullable=False)  # 'hi-IN' or 'hinglish'
    dialect = Column(String, default="standard", nullable=True)
    reference_text = Column(Text, nullable=False)
    critical_phrases_json = Column(Text, nullable=False)  # JSON list of [{text, variants[], severity}]
    critical_entities_json = Column(Text, nullable=True)  # JSON list of entities
    voice = Column(String, default="Shivani", nullable=True)
    tts_model = Column(String, default="timbre-v3.0", nullable=True)
    speed = Column(Float, default=1.0, nullable=False)
    channel = Column(String, default="standard", nullable=False)  # 'standard' or 'tel_8k'
    sample_rate = Column(Integer, default=16000, nullable=True)
    pace_min = Column(Float, default=1.8, nullable=False)
    pace_max = Column(Float, default=4.0, nullable=False)
    severity = Column(String, nullable=False)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    is_synthetic = Column(Integer, default=1, nullable=False)
    created_at = Column(String, default=utcnow_iso, nullable=False)
    updated_at = Column(String, default=utcnow_iso, onupdate=utcnow_iso, nullable=False)

    organisation = relationship("Organisation", back_populates="test_cases")
    suite = relationship("Suite", back_populates="test_cases")
    runs = relationship("Run", back_populates="test_case", cascade="all, delete-orphan")
    capsules = relationship("Capsule", back_populates="test_case", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("language IN ('hi-IN', 'hinglish')", name="check_language"),
        CheckConstraint("channel IN ('standard', 'tel_8k')", name="check_channel"),
        CheckConstraint("severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="check_severity"),
    )


class Run(Base):
    __tablename__ = "runs"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    case_id = Column(String, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    source = Column(String, nullable=False)  # 'TIMBRE_LIVE', 'UPLOAD', 'MOCK_FIXTURE'
    status = Column(String, nullable=False)  # 'CREATED', 'AUDIO_READY', 'TRANSCRIBED', 'ANALYSED', 'FAILED'
    audio_path = Column(Text, nullable=True)
    audio_sha256 = Column(String, nullable=True)
    duration_s = Column(Float, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    channels = Column(Integer, nullable=True)
    transcript_text = Column(Text, nullable=True)
    transcript_words_json = Column(Text, nullable=True)
    stt_raw_json = Column(Text, nullable=True)
    tts_request_json = Column(Text, nullable=True)
    tts_model = Column(String, default="timbre-v3.0", nullable=True)
    tts_voice = Column(String, default="Shivani", nullable=True)
    stt_dual_results_json = Column(Text, nullable=True)  # stores {prisma_v25, prisma_v30, consensus_score}
    defect_pins_json = Column(Text, nullable=True)  # stores [{id, timestamp_start_s, timestamp_end_s, category, severity, note}]
    metrics_json = Column(Text, nullable=True)  # wer, cer, pace, peak_db, clip_ratio
    injected_fault = Column(Text, nullable=True)  # null unless deliberately injected
    error = Column(Text, nullable=True)
    created_at = Column(String, default=utcnow_iso, nullable=False)

    test_case = relationship("TestCase", back_populates="runs")
    findings = relationship("Finding", back_populates="run", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="run", cascade="all, delete-orphan")
    regression_runs = relationship("RegressionRun", back_populates="run", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("source IN ('TIMBRE_LIVE', 'UPLOAD', 'MOCK_FIXTURE')", name="check_run_source"),
        Index("idx_runs_case", "case_id"),
    )


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    run_id = Column(String, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    check_type = Column(String, nullable=False)
    status = Column(String, nullable=False)  # 'WARN', 'SUSPECTED', 'FAIL'
    review_state = Column(String, default="AUTO_DETECTED", nullable=False)  # 'AUTO_DETECTED', 'HUMAN_CONFIRMED', 'FALSE_POSITIVE', 'NEEDS_SECOND_REVIEW'
    severity = Column(String, nullable=False)
    evidence_json = Column(Text, nullable=False)
    region_start_s = Column(Float, nullable=True)
    region_end_s = Column(Float, nullable=True)
    reviewer_note = Column(Text, nullable=True)
    reviewed_by = Column(Text, nullable=True)
    reviewed_at = Column(String, nullable=True)

    run = relationship("Run", back_populates="findings")
    capsules = relationship("Capsule", back_populates="source_finding", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('WARN', 'SUSPECTED', 'FAIL')", name="check_finding_status"),
        CheckConstraint("review_state IN ('AUTO_DETECTED', 'HUMAN_CONFIRMED', 'FALSE_POSITIVE', 'NEEDS_SECOND_REVIEW')", name="check_finding_review_state"),
    )


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    run_id = Column(String, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    reviewer = Column(Text, nullable=False)
    reviewer_role = Column(String, default="PRIMARY", nullable=False)  # 'PRIMARY' or 'SECOND_REVIEWER'
    consensus_status = Column(String, default="AGREED", nullable=False)  # 'AGREED', 'DISPUTED', 'PENDING'
    review_status = Column(String, default="CONFIRMED", nullable=False)  # 'CONFIRMED', 'REJECTED', 'NEEDS_SECOND_REVIEW'
    ratings_json = Column(Text, nullable=True)  # {pronunciation, naturalness, clarity, prosody, code_switching, delivery}: 1-5 or null
    created_at = Column(String, default=utcnow_iso, nullable=False)

    run = relationship("Run", back_populates="reviews")
    annotations = relationship("ReviewAnnotation", back_populates="review", cascade="all, delete-orphan")


class ReviewAnnotation(Base):
    __tablename__ = "review_annotations"

    id = Column(String, primary_key=True)
    review_id = Column(String, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    start_s = Column(Float, nullable=False)
    end_s = Column(Float, nullable=False)
    tag = Column(String, nullable=False)  # PRONUNCIATION, MISSING_CONTENT, CLARITY, PROSODY, CODE_SWITCH, OTHER
    comment = Column(Text, nullable=True)

    review = relationship("Review", back_populates="annotations")


class Capsule(Base):
    __tablename__ = "capsules"

    id = Column(String, primary_key=True)  # SL-001
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    case_id = Column(String, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    source_finding_id = Column(String, ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    defect_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    review_status = Column(String, default="HUMAN_CONFIRMED", nullable=False)
    failing_audio_sha256 = Column(Text, nullable=False)
    spec_json = Column(Text, nullable=False)  # Full regression spec, immutable
    defect_pins_json = Column(Text, nullable=True)  # Reviewer pinned defect timestamps
    state = Column(String, default="OPEN", nullable=False)  # 'OPEN', 'RESOLVED', 'REOPENED', etc.
    created_at = Column(String, default=utcnow_iso, nullable=False)

    test_case = relationship("TestCase", back_populates="capsules")
    source_finding = relationship("Finding", back_populates="capsules")
    regression_runs = relationship("RegressionRun", back_populates="capsule", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("state IN ('DRAFT', 'EVIDENCE_LOCKED', 'OPEN', 'REGRESSION_IN_PROGRESS', 'NEEDS_REVIEW', 'STILL_FAILING', 'REGRESSED', 'BLOCKED', 'RESOLVED', 'REJECTED', 'REOPENED')", name="check_capsule_state"),
    )


class RegressionRun(Base):
    __tablename__ = "regression_runs"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    capsule_id = Column(String, ForeignKey("capsules.id", ondelete="CASCADE"), nullable=False)
    run_id = Column(String, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    assertion_results_json = Column(Text, nullable=False)  # [{id, before, after}]
    verdict = Column(String, nullable=False)  # 'RESOLVED', 'STILL_FAILING', 'REGRESSED', 'NEEDS_REVIEW', 'BLOCKED'
    approved_by = Column(Text, nullable=True)
    approved_at = Column(String, nullable=True)
    created_at = Column(String, default=utcnow_iso, nullable=False)

    capsule = relationship("Capsule", back_populates="regression_runs")
    run = relationship("Run", back_populates="regression_runs")

    __table_args__ = (
        CheckConstraint("verdict IN ('RESOLVED', 'STILL_FAILING', 'REGRESSED', 'NEEDS_REVIEW', 'BLOCKED')", name="check_verdict"),
    )


class EvalResult(Base):
    __tablename__ = "eval_results"

    id = Column(String, primary_key=True)
    case_id = Column(String, nullable=True)
    run_id = Column(String, nullable=True)
    expected_defect = Column(Text, nullable=True)
    detected_defects_json = Column(Text, nullable=True)
    is_clean = Column(Integer, default=0, nullable=False)
    created_at = Column(String, default=utcnow_iso, nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, default="org-default", index=True)
    actor_id = Column(String, nullable=False)
    actor_username = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)
    action = Column(String, nullable=False)  # 'AUTH_LOGIN', 'FINDING_CONFIRMED', 'REVIEW_CREATED', etc.
    resource_type = Column(String, nullable=False)  # 'Finding', 'Capsule', 'RegressionRun', 'TestCase', 'User', etc.
    resource_id = Column(String, nullable=False)
    timestamp = Column(String, default=utcnow_iso, nullable=False, index=True)
    details_json = Column(Text, default="{}", nullable=False)
    ip_address = Column(String, nullable=True)

    organisation = relationship("Organisation", back_populates="audit_events")
