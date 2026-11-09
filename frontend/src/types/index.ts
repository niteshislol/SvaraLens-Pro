export type Language = 'hi-IN' | 'hinglish';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Channel = 'standard' | 'tel_8k';

export interface CriticalPhrase {
  text: string;
  variants: string[];
  severity: Severity;
}

export interface TestCase {
  id: string;
  suite_id: string;
  scenario: string;
  language: Language;
  reference_text: string;
  critical_phrases: CriticalPhrase[];
  voice?: string;
  speed: number;
  channel: Channel;
  pace_min: number;
  pace_max: number;
  severity: Severity;
  is_synthetic: number;
  created_at: string;
  updated_at: string;
}

export type FindingStatus = 'WARN' | 'SUSPECTED' | 'FAIL';
export type ReviewState = 'AUTO_DETECTED' | 'HUMAN_CONFIRMED' | 'FALSE_POSITIVE' | 'NEEDS_SECOND_REVIEW';

export interface Finding {
  id: string;
  run_id: string;
  check_type: string;
  status: FindingStatus;
  review_state: ReviewState;
  severity: Severity;
  evidence: Record<string, any>;
  region_start_s?: number;
  region_end_s?: number;
  reviewer_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface ReviewAnnotation {
  id: string;
  review_id: string;
  start_s: number;
  end_s: number;
  tag: 'PRONUNCIATION' | 'MISSING_CONTENT' | 'CLARITY' | 'PROSODY' | 'CODE_SWITCH' | 'OTHER';
  comment?: string;
}

export interface Review {
  id: string;
  run_id: string;
  reviewer: string;
  ratings?: {
    pronunciation?: number;
    naturalness?: number;
    clarity?: number;
    prosody?: number;
    code_switching?: number;
    delivery?: number;
  };
  annotations: ReviewAnnotation[];
  created_at: string;
}

export interface Run {
  id: string;
  case_id: string;
  source: 'TIMBRE_LIVE' | 'UPLOAD' | 'MOCK_FIXTURE';
  status: string;
  audio_path?: string;
  audio_sha256?: string;
  duration_s?: number;
  sample_rate?: number;
  channels?: number;
  transcript_text?: string;
  transcript_words?: Array<{ word: string; start: number; end: number }>;
  metrics?: {
    wer?: number;
    cer?: number;
    insertions?: number;
    deletions?: number;
    substitutions?: number;
    duration_s?: number;
    sample_rate?: number;
    peak_db?: number;
    clip_ratio?: number;
    silence_regions_count?: number;
    pace_wps?: number;
  };
  injected_fault?: string;
  error?: string;
  created_at: string;
  findings: Finding[];
  reviews: Review[];
}

export interface CapsuleAssertion {
  id: string;
  type: string;
  phrase?: string;
  threshold?: number;
  description?: string;
}

export interface CapsuleSpec {
  capsule_id: string;
  case_id: string;
  language: string;
  defect_type: string;
  severity: string;
  review_status: string;
  reference_text: string;
  critical_phrases: Array<Record<string, any>>;
  gnani_models: { tts: string; stt: string };
  voice_configuration: { voice: string; speed: number; channel: string };
  failing_audio_sha256: string;
  transcript_at_failure?: string;
  evidence: Record<string, any>;
  assertions: CapsuleAssertion[];
  regression_required: boolean;
  created_at: string;
}

export interface Capsule {
  id: string;
  case_id: string;
  source_finding_id: string;
  defect_type: string;
  severity: Severity;
  review_status: string;
  failing_audio_sha256: string;
  spec: CapsuleSpec;
  state: 'OPEN' | 'RESOLVED' | 'REOPENED';
  created_at: string;
}

export interface AssertionComparison {
  id: string;
  type: string;
  description?: string;
  before: string;
  after: string;
  detail?: string;
}

export interface RegressionRun {
  id: string;
  capsule_id: string;
  run_id: string;
  verdict: 'RESOLVED' | 'STILL_FAILING' | 'REGRESSED' | 'NEEDS_REVIEW';
  assertion_results: AssertionComparison[];
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface SuiteSummary {
  suite_id: string;
  suite_name: string;
  total_cases: number;
  runs_count: number;
  auto_passed: number;
  needs_review: number;
  confirmed_failures: number;
  open_capsules: number;
  resolved_capsules: number;
  reopened_capsules: number;
  mock_mode: boolean;
}

export interface Health {
  status: string;
  mock_mode: boolean;
  version: string;
  timbre_model: string;
  prisma_model: string;
  database_connected: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  type: 'TTS' | 'ASR';
  badge: string;
  languages: string[];
  default_voice?: string;
  voices?: string[];
  avg_latency_ms?: number;
  telephony_native?: boolean;
  telephony_optimized?: boolean;
  features?: string[];
}

export interface ArenaModelResult {
  model_id: string;
  provider: string;
  transcript: string;
  latency_ms: number;
  metrics: {
    wer: number;
    cer: number;
    insertions: number;
    deletions: number;
    substitutions: number;
    duration_s: number;
    sample_rate: number;
    peak_db: number;
    clip_ratio: number;
    silence_regions_count: number;
    pace_wps: number;
  };
  findings: Finding[];
}

export interface ArenaComparisonResponse {
  session_id: string;
  reference_text: string;
  language: string;
  channel_meta: {
    channel_mode: string;
    sample_rate: number;
    codec: string;
    bandwidth_hz: string;
    noise_injected: boolean;
    snr_db?: number;
    duration_s?: number;
  };
  audio_url: string;
  duration_s: number;
  tts_result: {
    model: string;
    provider: string;
    voice: string;
    latency_ms: number;
  };
  model_a: ArenaModelResult;
  model_b: ArenaModelResult;
  delta: {
    wer_diff: number;
    cer_diff: number;
    latency_diff_ms: number;
    faster_model: string;
    more_accurate_model: string;
  };
}

export interface BenchmarkDataset {
  id: string;
  name: string;
  publisher: string;
  description: string;
  acoustic_profile: string;
  hours: string;
  relevance: string;
}

export interface BenchmarkModelScore {
  model_id: string;
  model_name: string;
  provider: string;
  architecture: string;
  scores: Record<string, { wer: number; cer: number; latency_ms: number }>;
  small_utterance_retention: string;
  dialect_preservation_score: string;
  hallucination_rate: string;
}

export interface BenchmarkMatrixResponse {
  datasets: BenchmarkDataset[];
  models: BenchmarkModelScore[];
  methodology: Record<string, string>;
}
