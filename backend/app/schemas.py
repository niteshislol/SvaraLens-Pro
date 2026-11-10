from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict

# --- Common / Primitives ---

class CriticalPhrase(BaseModel):
    text: str
    variants: List[str] = Field(default_factory=list)
    severity: str = "HIGH"

class DefectPin(BaseModel):
    id: str
    timestamp_start_s: float
    timestamp_end_s: float
    category: str  # 'END_TRUNCATION', 'PRONUNCIATION', 'CODE_SWITCH_GLITCH', 'PROSODY_PAUSE', 'CLIPPING', 'OTHER'
    severity: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    note: str
    created_at: str

class DefectPinCreate(BaseModel):
    timestamp_start_s: float
    timestamp_end_s: float
    category: str
    severity: str = "HIGH"
    note: str

# --- Suite ---

class SuiteBase(BaseModel):
    name: str
    description: Optional[str] = None

class SuiteCreate(SuiteBase):
    id: Optional[str] = None

class SuiteRead(SuiteBase):
    id: str
    created_at: str
    model_config = ConfigDict(from_attributes=True)

# --- TestCase ---

class TestCaseBase(BaseModel):
    scenario: str
    title: Optional[str] = None
    description: Optional[str] = None
    language: str  # 'hi-IN' | 'hinglish'
    dialect: Optional[str] = "standard"
    reference_text: str
    critical_phrases: List[CriticalPhrase]
    critical_entities: Optional[List[Dict[str, Any]]] = None
    voice: Optional[str] = "Shivani"
    tts_model: Optional[str] = "timbre-v3.0"
    speed: float = 1.0
    channel: str = "standard"  # 'standard' | 'tel_8k'
    sample_rate: Optional[int] = 16000
    pace_min: float = 1.8
    pace_max: float = 4.0
    severity: str = "HIGH"  # 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    is_synthetic: int = 1

class TestCaseCreate(TestCaseBase):
    id: Optional[str] = None
    suite_id: str

class TestCaseUpdate(BaseModel):
    scenario: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    dialect: Optional[str] = None
    reference_text: Optional[str] = None
    critical_phrases: Optional[List[CriticalPhrase]] = None
    critical_entities: Optional[List[Dict[str, Any]]] = None
    voice: Optional[str] = None
    tts_model: Optional[str] = None
    speed: Optional[float] = None
    channel: Optional[str] = None
    sample_rate: Optional[int] = None
    pace_min: Optional[float] = None
    pace_max: Optional[float] = None
    severity: Optional[str] = None

class TestCaseRead(TestCaseBase):
    id: str
    org_id: Optional[str] = None
    suite_id: str
    created_at: str
    updated_at: str
    model_config = ConfigDict(from_attributes=True)

# --- Finding ---

class FindingBase(BaseModel):
    check_type: str
    status: str  # 'WARN' | 'SUSPECTED' | 'FAIL'
    review_state: str = "AUTO_DETECTED"  # 'AUTO_DETECTED' | 'HUMAN_CONFIRMED' | 'FALSE_POSITIVE' | 'NEEDS_SECOND_REVIEW'
    severity: str
    evidence_json: Dict[str, Any]
    region_start_s: Optional[float] = None
    region_end_s: Optional[float] = None
    reviewer_note: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None

class FindingUpdate(BaseModel):
    review_state: str  # 'HUMAN_CONFIRMED' | 'FALSE_POSITIVE' | 'NEEDS_SECOND_REVIEW'
    severity: Optional[str] = None
    reviewer_note: Optional[str] = None
    reviewed_by: Optional[str] = "QA Reviewer"
    region_start_s: Optional[float] = None
    region_end_s: Optional[float] = None

class FindingRead(BaseModel):
    id: str
    run_id: str
    check_type: str
    status: str
    review_state: str
    severity: str
    evidence: Dict[str, Any]
    region_start_s: Optional[float] = None
    region_end_s: Optional[float] = None
    reviewer_note: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- Review & Annotation ---

class ReviewAnnotationCreate(BaseModel):
    start_s: float
    end_s: float
    tag: str  # PRONUNCIATION, MISSING_CONTENT, CLARITY, PROSODY, CODE_SWITCH, OTHER
    comment: Optional[str] = None

class ReviewAnnotationRead(ReviewAnnotationCreate):
    id: str
    review_id: str
    model_config = ConfigDict(from_attributes=True)

class ReviewRatings(BaseModel):
    pronunciation: Optional[int] = None
    naturalness: Optional[int] = None
    clarity: Optional[int] = None
    prosody: Optional[int] = None
    code_switching: Optional[int] = None
    delivery: Optional[int] = None

class ReviewCreate(BaseModel):
    reviewer: str = "QA Reviewer"
    reviewer_role: str = "PRIMARY"  # 'PRIMARY' or 'SECOND_REVIEWER'
    review_status: str = "CONFIRMED"  # 'CONFIRMED', 'REJECTED', 'NEEDS_SECOND_REVIEW'
    ratings: ReviewRatings
    annotations: List[ReviewAnnotationCreate] = Field(default_factory=list)

class ReviewRead(BaseModel):
    id: str
    run_id: str
    reviewer: str
    reviewer_role: str = "PRIMARY"
    consensus_status: str = "AGREED"
    review_status: str = "CONFIRMED"
    ratings: Optional[Dict[str, Optional[int]]] = None
    annotations: List[ReviewAnnotationRead] = Field(default_factory=list)
    created_at: str
    model_config = ConfigDict(from_attributes=True)

# --- Run ---

class RunRead(BaseModel):
    id: str
    case_id: str
    source: str  # 'TIMBRE_LIVE' | 'UPLOAD' | 'MOCK_FIXTURE'
    status: str
    audio_path: Optional[str] = None
    audio_sha256: Optional[str] = None
    duration_s: Optional[float] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    tts_model: Optional[str] = None
    tts_voice: Optional[str] = None
    transcript_text: Optional[str] = None
    transcript_words: Optional[List[Dict[str, Any]]] = None
    stt_dual_results: Optional[Dict[str, Any]] = None
    defect_pins: List[DefectPin] = Field(default_factory=list)
    metrics: Optional[Dict[str, Any]] = None
    injected_fault: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    findings: List[FindingRead] = Field(default_factory=list)
    reviews: List[ReviewRead] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

# --- Capsule ---

class CapsuleAssertion(BaseModel):
    id: str
    type: str  # e.g. 'critical_phrase_present', 'no_end_truncation', 'reviewer_approval_required', 'no_clipping'
    phrase: Optional[str] = None
    threshold: Optional[float] = None
    description: Optional[str] = None

class CapsuleSpec(BaseModel):
    capsule_id: str
    case_id: str
    language: str
    defect_type: str
    severity: str
    review_status: str
    reference_text: str
    critical_phrases: List[Dict[str, Any]]
    gnani_models: Dict[str, str]
    voice_configuration: Dict[str, Any]
    failing_audio_sha256: str
    transcript_at_failure: Optional[str] = None
    evidence: Dict[str, Any]
    assertions: List[CapsuleAssertion]
    regression_required: bool = True
    created_at: str

class CapsuleCreateFromFinding(BaseModel):
    finding_id: str

class CapsuleRead(BaseModel):
    id: str
    case_id: str
    source_finding_id: str
    defect_type: str
    severity: str
    review_status: str
    failing_audio_sha256: str
    spec: Dict[str, Any]
    state: str  # 'OPEN' | 'RESOLVED' | 'REOPENED'
    created_at: str
    model_config = ConfigDict(from_attributes=True)

# --- Regression ---

class AssertionComparison(BaseModel):
    id: str
    type: str
    before: str  # 'FAIL' | 'PASS'
    after: str   # 'FAIL' | 'PASS' | 'PENDING'
    detail: Optional[str] = None

class RegressionRunRead(BaseModel):
    id: str
    capsule_id: str
    run_id: str
    verdict: str  # 'RESOLVED' | 'STILL_FAILING' | 'REGRESSED' | 'NEEDS_REVIEW'
    assertion_results: List[AssertionComparison]
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str
    model_config = ConfigDict(from_attributes=True)

class RegressionApproveRequest(BaseModel):
    approved_by: str = "QA Lead"

# --- Dashboard Summary ---

class SuiteSummary(BaseModel):
    suite_id: str
    suite_name: str
    total_cases: int
    runs_count: int
    auto_passed: int
    needs_review: int
    confirmed_failures: int
    open_capsules: int
    resolved_capsules: int
    reopened_capsules: int
    mock_mode: bool

# --- Health ---

class HealthResponse(BaseModel):
    status: str
    mock_mode: bool
    version: str
    timbre_model: str
    prisma_model: str
    database_connected: bool
    gnani_connected: bool = False
    provider_verified: bool = False
    provider_detail: Optional[str] = None
    last_verified_at: Optional[str] = None
    execution_mode: str = "MOCK"
    scenarios_count: int = 0
    capsules_count: int = 0

class AuditEventRead(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    actor: str
    details: Optional[Dict[str, Any]] = None
    created_at: str
    model_config = ConfigDict(from_attributes=True)

class CapsuleIntegrityResponse(BaseModel):
    capsule_id: str
    valid: bool
    expected_sha256: str
    computed_sha256: str
    audio_path: Optional[str] = None
    verified_at: str

# --- Security, Identity & Authentication (Phase 1C) ---

class UserLoginRequest(BaseModel):
    username: str
    password: str

class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str  # 'ADMIN', 'QA_LEAD', 'QA_REVIEWER', 'AUDITOR'
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    org_id: str
    username: str
    email: str
    role: str
    full_name: Optional[str] = None
    is_active: bool
    created_at: str
    last_login_at: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse

class AdminResetPasswordRequest(BaseModel):
    user_id: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class AuditEventDetail(BaseModel):
    id: str
    org_id: str
    actor_id: str
    actor_username: str
    actor_role: str
    action: str
    resource_type: str
    resource_id: str
    timestamp: str
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

