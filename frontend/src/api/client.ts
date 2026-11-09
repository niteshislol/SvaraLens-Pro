import {
  TestCase, Run, Finding, Review, Capsule, RegressionRun, SuiteSummary, Health
} from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchSuiteSummary(suiteId: string = 'suite-insurance-hi'): Promise<SuiteSummary> {
  const res = await fetch(`${API_BASE}/suites/${suiteId}/summary`);
  if (!res.ok) throw new Error('Failed to fetch suite summary');
  return res.json();
}

export async function fetchTestCases(suiteId?: string): Promise<TestCase[]> {
  const url = suiteId ? `${API_BASE}/cases?suite_id=${suiteId}` : `${API_BASE}/cases`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch test cases');
  return res.json();
}

export async function fetchTestCase(id: string): Promise<TestCase> {
  const res = await fetch(`${API_BASE}/cases/${id}`);
  if (!res.ok) throw new Error('Failed to fetch test case');
  return res.json();
}

export async function createTestCase(data: Partial<TestCase>): Promise<TestCase> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create test case');
  return res.json();
}

export async function importCasesCsv(file: File, suiteId: string = 'suite-insurance-hi'): Promise<{ imported: number; errors: string[] }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('suite_id', suiteId);
  const res = await fetch(`${API_BASE}/cases/import-csv`, {
    method: 'POST',
    body: fd
  });
  if (!res.ok) throw new Error('Failed to import CSV');
  return res.json();
}

export async function triggerGenerateRun(
  caseId: string,
  injectedFault?: string,
  ttsModel?: string,
  ttsVoice?: string
): Promise<{ run_id: string; status: string; findings_count: number }> {
  const params = new URLSearchParams();
  if (injectedFault) params.append('injected_fault', injectedFault);
  if (ttsModel) params.append('tts_model', ttsModel);
  if (ttsVoice) params.append('tts_voice', ttsVoice);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const url = `${API_BASE}/cases/${caseId}/runs/generate${qs}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate Timbre run');
  return res.json();
}

export async function addDefectPin(
  runId: string,
  pin: {
    timestamp_start_s: number;
    timestamp_end_s: number;
    category: string;
    severity?: string;
    note: string;
  }
): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs/${runId}/pins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pin)
  });
  if (!res.ok) throw new Error('Failed to add defect pin');
  return res.json();
}

export async function removeDefectPin(runId: string, pinId: string): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs/${runId}/pins/${pinId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to remove defect pin');
  return res.json();
}

export async function uploadAudioRun(caseId: string, file: File, injectedFault?: string): Promise<{ run_id: string }> {
  const fd = new FormData();
  fd.append('file', file);
  if (injectedFault) fd.append('injected_fault', injectedFault);
  const res = await fetch(`${API_BASE}/cases/${caseId}/runs/upload`, {
    method: 'POST',
    body: fd
  });
  if (!res.ok) throw new Error('Failed to upload audio run');
  return res.json();
}

export async function fetchRun(id: string): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch run detail');
  return res.json();
}

export function getAudioUrl(runId: string): string {
  return `${API_BASE}/runs/${runId}/audio`;
}

export async function updateFinding(
  findingId: string,
  update: {
    review_state: string;
    severity?: string;
    reviewer_note?: string;
    reviewed_by?: string;
    region_start_s?: number;
    region_end_s?: number;
  }
): Promise<Finding> {
  const res = await fetch(`${API_BASE}/findings/${findingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update finding');
  return res.json();
}

export async function compileCapsule(findingId: string): Promise<Capsule> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/capsule`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || err.detail || 'Failed to compile capsule');
  }
  return res.json();
}

export async function fetchCapsules(): Promise<Capsule[]> {
  const res = await fetch(`${API_BASE}/capsules`);
  if (!res.ok) throw new Error('Failed to fetch capsules');
  return res.json();
}

export async function fetchCapsule(id: string): Promise<Capsule> {
  const res = await fetch(`${API_BASE}/capsules/${id}`);
  if (!res.ok) throw new Error('Failed to fetch capsule');
  return res.json();
}

export async function rerunRegression(capsuleId: string, generate: boolean = true, file?: File): Promise<RegressionRun> {
  const fd = new FormData();
  if (file) fd.append('file', file);
  fd.append('generate', generate ? 'true' : 'false');

  const res = await fetch(`${API_BASE}/capsules/${capsuleId}/rerun`, {
    method: 'POST',
    body: fd
  });
  if (!res.ok) throw new Error('Failed to run regression');
  return res.json();
}

export async function approveRegression(capsuleId: string, regressionRunId: string, approvedBy: string = 'QA Lead'): Promise<RegressionRun> {
  const res = await fetch(`${API_BASE}/capsules/${capsuleId}/rerun/${regressionRunId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved_by: approvedBy })
  });
  if (!res.ok) throw new Error('Failed to approve regression');
  return res.json();
}

export async function addReview(runId: string, reviewData: any): Promise<Review> {
  const res = await fetch(`${API_BASE}/runs/${runId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData)
  });
  if (!res.ok) throw new Error('Failed to add review');
  return res.json();
}
