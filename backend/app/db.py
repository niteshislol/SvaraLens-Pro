from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# In SQLite we use check_same_thread=False
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema(bind_engine):
    """Ensures database schema integrity, column additions, organisation scoping,
    and seeds initial default organisation and administrator account."""
    try:
        from . import models

        with bind_engine.connect() as conn:
            # Check legacy audit_events table structure
            res = conn.execute(text("PRAGMA table_info(audit_events)"))
            aud_cols = {row[1] for row in res.fetchall()}
            if aud_cols and "org_id" not in aud_cols:
                conn.execute(text("DROP TABLE audit_events"))
                conn.commit()

        # Create newly declared tables (organisations, users, audit_events)
        Base.metadata.create_all(bind=bind_engine)

        with bind_engine.connect() as conn:
            # 1. Add org_id to all domain tables if missing
            domain_tables = ["suites", "test_cases", "runs", "findings", "reviews", "capsules", "regression_runs"]
            for tbl in domain_tables:
                res = conn.execute(text(f"PRAGMA table_info({tbl})"))
                cols = {row[1] for row in res.fetchall()}
                if cols and "org_id" not in cols:
                    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN org_id TEXT DEFAULT 'org-default'"))

            # 2. Add other optional columns if missing
            res = conn.execute(text("PRAGMA table_info(test_cases)"))
            tc_cols = {row[1] for row in res.fetchall()}
            for col_name, col_type in [
                ("tts_model", "TEXT DEFAULT 'timbre-v3.0'"),
                ("title", "TEXT"),
                ("description", "TEXT"),
                ("dialect", "TEXT DEFAULT 'standard'"),
                ("critical_entities_json", "TEXT"),
                ("sample_rate", "INTEGER DEFAULT 16000"),
            ]:
                if tc_cols and col_name not in tc_cols:
                    conn.execute(text(f"ALTER TABLE test_cases ADD COLUMN {col_name} {col_type}"))

            res = conn.execute(text("PRAGMA table_info(runs)"))
            run_cols = {row[1] for row in res.fetchall()}
            for col_name, col_type in [
                ("tts_model", "TEXT DEFAULT 'timbre-v3.0'"),
                ("tts_voice", "TEXT DEFAULT 'Shivani'"),
                ("stt_dual_results_json", "TEXT"),
                ("defect_pins_json", "TEXT"),
            ]:
                if run_cols and col_name not in run_cols:
                    conn.execute(text(f"ALTER TABLE runs ADD COLUMN {col_name} {col_type}"))

            res = conn.execute(text("PRAGMA table_info(reviews)"))
            rev_cols = {row[1] for row in res.fetchall()}
            for col_name, col_type in [
                ("reviewer_role", "TEXT DEFAULT 'PRIMARY'"),
                ("consensus_status", "TEXT DEFAULT 'AGREED'"),
                ("review_status", "TEXT DEFAULT 'CONFIRMED'"),
            ]:
                if rev_cols and col_name not in rev_cols:
                    conn.execute(text(f"ALTER TABLE reviews ADD COLUMN {col_name} {col_type}"))

            res = conn.execute(text("PRAGMA table_info(capsules)"))
            cap_cols = {row[1] for row in res.fetchall()}
            if cap_cols and "defect_pins_json" not in cap_cols:
                conn.execute(text("ALTER TABLE capsules ADD COLUMN defect_pins_json TEXT"))

            # 3. Check and migrate SQLite check constraint on capsules if outdated
            res = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='capsules'"))
            row = res.fetchone()
            if row and row[0] and "NEEDS_REVIEW" not in row[0]:
                conn.execute(text("PRAGMA foreign_keys=OFF;"))
                conn.execute(text("""
                    CREATE TABLE capsules_v2 (
                        id VARCHAR NOT NULL,
                        org_id VARCHAR NOT NULL DEFAULT 'org-default',
                        case_id VARCHAR NOT NULL,
                        source_finding_id VARCHAR NOT NULL,
                        defect_type VARCHAR NOT NULL,
                        severity VARCHAR NOT NULL,
                        review_status VARCHAR NOT NULL,
                        failing_audio_sha256 TEXT NOT NULL,
                        spec_json TEXT NOT NULL,
                        defect_pins_json TEXT,
                        state VARCHAR NOT NULL,
                        created_at VARCHAR NOT NULL,
                        PRIMARY KEY (id),
                        CONSTRAINT check_capsule_state CHECK (state IN ('DRAFT', 'EVIDENCE_LOCKED', 'OPEN', 'REGRESSION_IN_PROGRESS', 'NEEDS_REVIEW', 'STILL_FAILING', 'REGRESSED', 'BLOCKED', 'RESOLVED', 'REJECTED', 'REOPENED')),
                        FOREIGN KEY(case_id) REFERENCES test_cases (id) ON DELETE CASCADE,
                        FOREIGN KEY(source_finding_id) REFERENCES findings (id) ON DELETE CASCADE
                    );
                """))
                # Copy existing data
                conn.execute(text("""
                    INSERT INTO capsules_v2 (id, org_id, case_id, source_finding_id, defect_type, severity, review_status, failing_audio_sha256, spec_json, defect_pins_json, state, created_at)
                    SELECT id, COALESCE(org_id, 'org-default'), case_id, source_finding_id, defect_type, severity, review_status, failing_audio_sha256, spec_json, defect_pins_json, state, created_at
                    FROM capsules;
                """))
                conn.execute(text("DROP TABLE capsules;"))
                conn.execute(text("ALTER TABLE capsules_v2 RENAME TO capsules;"))
                conn.execute(text("PRAGMA foreign_keys=ON;"))

            # 4. Check and migrate SQLite check constraint on regression_runs if outdated
            res = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='regression_runs'"))
            row = res.fetchone()
            if row and row[0] and "BLOCKED" not in row[0]:
                conn.execute(text("PRAGMA foreign_keys=OFF;"))
                conn.execute(text("""
                    CREATE TABLE regression_runs_v2 (
                        id VARCHAR NOT NULL,
                        org_id VARCHAR NOT NULL DEFAULT 'org-default',
                        capsule_id VARCHAR NOT NULL,
                        run_id VARCHAR NOT NULL,
                        assertion_results_json TEXT NOT NULL,
                        verdict VARCHAR NOT NULL,
                        approved_by TEXT,
                        approved_at VARCHAR,
                        created_at VARCHAR NOT NULL,
                        PRIMARY KEY (id),
                        CONSTRAINT check_verdict CHECK (verdict IN ('RESOLVED', 'STILL_FAILING', 'REGRESSED', 'NEEDS_REVIEW', 'BLOCKED')),
                        FOREIGN KEY(capsule_id) REFERENCES capsules (id) ON DELETE CASCADE,
                        FOREIGN KEY(run_id) REFERENCES runs (id) ON DELETE CASCADE
                    );
                """))
                conn.execute(text("""
                    INSERT INTO regression_runs_v2 (id, org_id, capsule_id, run_id, assertion_results_json, verdict, approved_by, approved_at, created_at)
                    SELECT id, COALESCE(org_id, 'org-default'), capsule_id, run_id, assertion_results_json, verdict, approved_by, approved_at, created_at
                    FROM regression_runs;
                """))
                conn.execute(text("DROP TABLE regression_runs;"))
                conn.execute(text("ALTER TABLE regression_runs_v2 RENAME TO regression_runs;"))
                conn.execute(text("PRAGMA foreign_keys=ON;"))

            # 5. Seed default organisation
            conn.execute(text("""
                INSERT OR IGNORE INTO organisations (id, name, created_at, is_active)
                VALUES ('org-default', 'Gnani QA Internal', '2026-11-10T00:00:00Z', 1)
            """))

            # 5. Seed initial admin user if no users exist
            res = conn.execute(text("SELECT COUNT(*) FROM users"))
            count = res.scalar() or 0
            if count == 0:
                from .auth.security import hash_password
                admin_hash = hash_password("AdminPassword@123!")
                lead_hash = hash_password("LeadPassword@123!")
                reviewer_hash = hash_password("ReviewerPassword@123!")
                auditor_hash = hash_password("AuditorPassword@123!")

                conn.execute(text("""
                    INSERT INTO users (id, org_id, username, email, hashed_password, role, full_name, is_active, created_at)
                    VALUES 
                    ('usr-admin-01', 'org-default', 'admin', 'admin@gnani.ai', :admin_hash, 'ADMIN', 'Gnani Administrator', 1, '2026-11-10T00:00:00Z'),
                    ('usr-lead-01', 'org-default', 'qalead', 'qalead@gnani.ai', :lead_hash, 'QA_LEAD', 'QA Lead Hindi', 1, '2026-11-10T00:00:00Z'),
                    ('usr-reviewer-01', 'org-default', 'reviewer', 'reviewer@gnani.ai', :reviewer_hash, 'QA_REVIEWER', 'QA Reviewer', 1, '2026-11-10T00:00:00Z'),
                    ('usr-auditor-01', 'org-default', 'auditor', 'auditor@gnani.ai', :auditor_hash, 'AUDITOR', 'Security Auditor', 1, '2026-11-10T00:00:00Z')
                """), {
                    "admin_hash": admin_hash,
                    "lead_hash": lead_hash,
                    "reviewer_hash": reviewer_hash,
                    "auditor_hash": auditor_hash
                })

            conn.commit()
    except Exception as e:
        print(f"Schema check error: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
