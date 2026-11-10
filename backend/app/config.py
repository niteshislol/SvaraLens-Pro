import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    PROJECT_NAME: str = "SvaraLens"
    TAGLINE: str = "Indic Voice QA Evidence & Regression Workbench"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"

    BASE_DIR: Path = BASE_DIR

    # Environment & Security Configuration
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_secret_key_change_in_production_998877665544332211")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    ALLOW_CREDENTIALS: bool = True

    # Gnani API settings [CONFIRM]
    GNANI_API_KEY: str = os.getenv("GNANI_API_KEY", "")
    GNANI_API_BASE: str = os.getenv("GNANI_API_BASE", "https://api.gnani.ai")
    TIMBRE_MODEL: str = os.getenv("TIMBRE_MODEL", "timbre-v2.5")
    PRISMA_MODEL: str = os.getenv("PRISMA_MODEL", "prisma-v2.5")
    
    # Mock fallback flag
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "true").lower() in ("true", "1", "yes")

    # Storage paths
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/data/svaralens.db")
    AUDIO_STORE_PATH: Path = BASE_DIR / "storage" / "audio"
    FIXTURES_PATH: Path = BASE_DIR / "fixtures"

    # CORS
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if origin.strip()
    ]

    def validate_configuration(self):
        """Validates configuration at startup. Raises ValueError on security violations."""
        if self.ALLOW_CREDENTIALS:
            for origin in self.CORS_ORIGINS:
                if origin == "*" or origin.strip() == "*":
                    raise ValueError(
                        "CORS configuration invalid: wildcard origin '*' is prohibited when allow_credentials=True."
                    )
            if not self.CORS_ORIGINS and self.ENVIRONMENT in ("production", "staging"):
                raise ValueError("CORS configuration invalid: explicit origins required in production/staging.")

        if self.ENVIRONMENT in ("production", "staging"):
            if not self.SECRET_KEY or self.SECRET_KEY.startswith("dev_") or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    f"Insecure SECRET_KEY configured for {self.ENVIRONMENT} environment. A 32+ character random secret is required."
                )
            if not self.GNANI_API_KEY and not self.MOCK_MODE:
                raise ValueError("GNANI_API_KEY is required in production when MOCK_MODE=false.")

    # Audio limits
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "10"))
    MAX_UPLOAD_SECONDS: float = float(os.getenv("MAX_UPLOAD_SECONDS", "60.0"))

    # Pure check thresholds (Section 2.6 of Master Build Document)
    # 1. Critical phrase matching
    PHRASE_RAPIDFUZZ_MIN_RATIO: float = 85.0

    # 2. End truncation check
    TRUNCATION_LAST_SENTENCE_SCORE_THRESHOLD: float = 60.0
    TRUNCATION_TRANSCRIPT_LENGTH_RATIO_THRESHOLD: float = 0.85
    TRUNCATION_TAIL_RMS_DBFS_THRESHOLD: float = -40.0
    TRUNCATION_TAIL_ENERGY_RATIO_THRESHOLD: float = 0.50  # 50% of median energy

    # 3. Audio clipping
    CLIPPING_WARN_FRACTION: float = 0.001   # 0.1% of samples >= 0.99
    CLIPPING_FAIL_FRACTION: float = 0.010   # 1.0% of samples >= 0.99
    CLIPPING_AMPLITUDE_THRESHOLD: float = 0.99

    # 4. Silence gaps
    SILENCE_TOP_DB: float = 35.0
    SILENCE_INTERNAL_GAP_SECONDS: float = 1.2
    SILENCE_LEADING_SECONDS: float = 1.5

    # 5. Speaking pace (words per second)
    PACE_MIN_DEFAULT: float = 1.8
    PACE_MAX_DEFAULT: float = 4.0

    # 6. Transcript divergence warning
    WER_WARN_THRESHOLD: float = 0.35

settings = Settings()
settings.AUDIO_STORE_PATH.mkdir(parents=True, exist_ok=True)
Path(BASE_DIR / "data").mkdir(parents=True, exist_ok=True)
