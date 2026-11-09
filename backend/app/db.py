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

            # Check capsules columns
            res = conn.execute(text("PRAGMA table_info(capsules)"))
            cap_cols = {row[1] for row in res.fetchall()}
            if "defect_pins_json" not in cap_cols and len(cap_cols) > 0:
                conn.execute(text("ALTER TABLE capsules ADD COLUMN defect_pins_json TEXT"))
                
            conn.commit()
    except Exception as e:
        print(f"Schema check error (safe to ignore if init): {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
