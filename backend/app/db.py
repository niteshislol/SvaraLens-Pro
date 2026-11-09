from sqlalchemy import create_engine
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
    try:
        from sqlalchemy import text
        with bind_engine.connect() as conn:
            # Check test_cases columns
            res = conn.execute(text("PRAGMA table_info(test_cases)"))
            tc_cols = {row[1] for row in res.fetchall()}
            if "tts_model" not in tc_cols and len(tc_cols) > 0:
                conn.execute(text("ALTER TABLE test_cases ADD COLUMN tts_model TEXT DEFAULT 'timbre-v3.0'"))
            if "title" not in tc_cols and len(tc_cols) > 0:
                conn.execute(text("ALTER TABLE test_cases ADD COLUMN title TEXT"))
            if "description" not in tc_cols and len(tc_cols) > 0:
                conn.execute(text("ALTER TABLE test_cases ADD COLUMN description TEXT"))
            if "dialect" not in tc_cols and len(tc_cols) > 0:
                conn.execute(text("ALTER TABLE test_cases ADD COLUMN dialect TEXT DEFAULT 'standard'"))
            if "critical_entities_json" not in tc_cols and len(tc_cols) > 0:
                conn.execute(text("ALTER TABLE test_cases ADD COLUMN critical_entities_json TEXT"))
            if "sample_rate" not in tc_cols and len(tc_cols) > 0:
                conn.execute(text("ALTER TABLE test_cases ADD COLUMN sample_rate INTEGER DEFAULT 16000"))
                
            # Check runs columns
            res = conn.execute(text("PRAGMA table_info(runs)"))
            run_cols = {row[1] for row in res.fetchall()}
            if "tts_model" not in run_cols and len(run_cols) > 0:
                conn.execute(text("ALTER TABLE runs ADD COLUMN tts_model TEXT DEFAULT 'timbre-v3.0'"))
            if "tts_voice" not in run_cols and len(run_cols) > 0:
                conn.execute(text("ALTER TABLE runs ADD COLUMN tts_voice TEXT DEFAULT 'Shivani'"))
            if "stt_dual_results_json" not in run_cols and len(run_cols) > 0:
                conn.execute(text("ALTER TABLE runs ADD COLUMN stt_dual_results_json TEXT"))
            if "defect_pins_json" not in run_cols and len(run_cols) > 0:
                conn.execute(text("ALTER TABLE runs ADD COLUMN defect_pins_json TEXT"))

            # Check reviews columns
            res = conn.execute(text("PRAGMA table_info(reviews)"))
            rev_cols = {row[1] for row in res.fetchall()}
            if "reviewer_role" not in rev_cols and len(rev_cols) > 0:
                conn.execute(text("ALTER TABLE reviews ADD COLUMN reviewer_role TEXT DEFAULT 'PRIMARY'"))
            if "consensus_status" not in rev_cols and len(rev_cols) > 0:
                conn.execute(text("ALTER TABLE reviews ADD COLUMN consensus_status TEXT DEFAULT 'AGREED'"))
            if "review_status" not in rev_cols and len(rev_cols) > 0:
                conn.execute(text("ALTER TABLE reviews ADD COLUMN review_status TEXT DEFAULT 'CONFIRMED'"))

            # Check capsules columns
            res = conn.execute(text("PRAGMA table_info(capsules)"))
            cap_cols = {row[1] for row in res.fetchall()}
            if "defect_pins_json" not in cap_cols and len(cap_cols) > 0:
                conn.execute(text("ALTER TABLE capsules ADD COLUMN defect_pins_json TEXT"))

            # Ensure audit_events table exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_events (
                    id TEXT PRIMARY KEY,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL DEFAULT 'System',
                    details_json TEXT,
                    created_at TEXT NOT NULL
                )
            """))
                
            conn.commit()
    except Exception as e:
        print(f"Schema check error (safe to ignore if init): {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
