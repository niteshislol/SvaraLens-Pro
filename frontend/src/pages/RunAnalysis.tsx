import React, { useEffect, useState } from 'react';
import { Run, TestCase } from '../types';
import { fetchRun, fetchRuns, fetchTestCase, updateFinding, compileCapsule, getAudioUrl } from '../api/client';
import { WaveformPlayer } from '../components/WaveformPlayer';
import { TranscriptDiff } from '../components/TranscriptDiff';
import { EvidenceCard } from '../components/EvidenceCard';
import {
  ShieldAlert, Headphones, RefreshCw, ArrowLeft,
  Volume2, CheckCircle2, Search, Filter, List, Eye,
  Play, Check, X, FileText, ChevronRight, Layers, Sparkles
} from 'lucide-react';

interface RunAnalysisProps {
  runId?: string;
  onNavigateToReview?: (runId: string) => void;
  onNavigateToCapsule?: (capsuleId: string) => void;
  onBack?: () => void;
}

export const RunAnalysis: React.FC<RunAnalysisProps> = ({
  runId: initialRunId,
  onNavigateToReview,
  onNavigateToCapsule,
  onBack
}) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId || '');
  const [run, setRun] = useState<Run | null>(null);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'detail'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEFECTS' | 'CLEAN'>('ALL');
  const [activeRegion, setActiveRegion] = useState<{ start: number; end: number } | undefined>();

  // Fetch all runs directory
  const loadAllRuns = async () => {
    try {
      setLoadingRuns(true);
      const allRuns = await fetchRuns(undefined, 100);
      setRuns(allRuns);
      if (!selectedRunId && allRuns.length > 0) {
        setSelectedRunId(allRuns[0].id);
      }
    } catch (err) {
      console.error('Failed to load runs directory', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    loadAllRuns();
  }, []);

  // Update selectedRunId if initialRunId changes
  useEffect(() => {
    if (initialRunId) {
      setSelectedRunId(initialRunId);
      setViewMode('detail');
    }
  }, [initialRunId]);

  // Load detail for selected run
  const loadSelectedRun = async (targetId: string) => {
    if (!targetId) return;
    try {
      setLoadingRunDetail(true);
      const r = await fetchRun(targetId);
      setRun(r);
      if (r.case_id) {
        try {
          const c = await fetchTestCase(r.case_id);
          setTestCase(c);
        } catch {
          setTestCase(null);
        }
      }
      const regionFinding = r.findings?.find(f => f.region_start_s !== undefined && f.region_end_s !== undefined);
      if (regionFinding && regionFinding.region_start_s !== undefined && regionFinding.region_end_s !== undefined) {
        setActiveRegion({ start: regionFinding.region_start_s, end: regionFinding.region_end_s });
      } else {
        setActiveRegion(undefined);
      }
    } catch (e) {
      console.error('Failed to load run detail', e);
    } finally {
      setLoadingRunDetail(false);
    }
  };

  useEffect(() => {
    if (selectedRunId) {
      loadSelectedRun(selectedRunId);
    }
  }, [selectedRunId]);

  const handleSelectRun = (id: string, switchToDetail = true) => {
    setSelectedRunId(id);
    if (switchToDetail) {
      setViewMode('detail');
    }
  };

  const handleConfirmFinding = async (findingId: string) => {
    const note = window.prompt(
      'Enter human reviewer confirmation note (e.g. Verified speech defect on audio playback):',
      'Audited audio playback; confirmed speech defect matches automated finding.'
    );
    if (note === null) return;
    try {
      await updateFinding(findingId, {
        review_state: 'HUMAN_CONFIRMED',
        reviewer_note: note
      });
      if (selectedRunId) await loadSelectedRun(selectedRunId);
      await loadAllRuns();
    } catch (e) {
      alert(`Could not confirm defect: ${e}`);
    }
  };

  const handleRejectFinding = async (findingId: string) => {
    const note = window.prompt(
      'Enter reviewer note for marking finding as false alarm:',
      'Marked as false alarm upon listener audio review.'
    );
    if (note === null) return;
    try {
      await updateFinding(findingId, {
        review_state: 'FALSE_POSITIVE',
        reviewer_note: note
      });
      if (selectedRunId) await loadSelectedRun(selectedRunId);
      await loadAllRuns();
    } catch (e) {
      alert(`Could not reject finding: ${e}`);
    }
  };

  const handleCompileCapsule = async (findingId: string) => {
    try {
      const capsule = await compileCapsule(findingId);
      if (onNavigateToCapsule) {
        onNavigateToCapsule(capsule.id);
      } else {
        alert(`Capsule compiled successfully: ${capsule.id}`);
      }
    } catch (e) {
      alert(`Capsule compilation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Filtered runs list
  const filteredRuns = runs.filter(r => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.injected_fault && r.injected_fault.toLowerCase().includes(searchQuery.toLowerCase()));
    const fCount = r.findings ? r.findings.length : 0;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DEFECTS' && fCount > 0) ||
      (statusFilter === 'CLEAN' && fCount === 0);
    return matchesSearch && matchesStatus;
  });

  const m = run?.metrics || {};
  const audioUrl = run ? getAudioUrl(run.id) : '';

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7ECF3]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] transition-colors shadow-xs"
              title="Back to Workbench"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#172033]">Run Analysis Studio</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EEF4FF] text-[#3867E8] font-semibold">
                {runs.length} Runs Recorded
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Inspect automated check findings, acoustic telemetry, and Dual-ASR Jury results across all synthesis runs.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#3867E8] shadow-xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>All Results Table</span>
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'detail'
                  ? 'bg-white text-[#3867E8] shadow-xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Detailed Inspection</span>
            </button>
          </div>

          <button
            onClick={() => {
              loadAllRuns();
              if (selectedRunId) loadSelectedRun(selectedRunId);
            }}
            className="p-2 rounded-lg border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] transition-colors shadow-xs"
            title="Refresh Runs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRuns ? 'animate-spin text-[#3867E8]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW A: ALL RUNS DIRECTORY TABLE                               */}
      {/* ============================================================== */}
      {viewMode === 'table' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search & Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E7ECF3] shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search run ID, case, or fault..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E7ECF3] rounded-lg focus:outline-none focus:border-[#3867E8]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-[#64748B] font-medium">Verdict:</span>
              <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] text-xs">
                {(['ALL', 'DEFECTS', 'CLEAN'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setStatusFilter(mode)}
                    className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                      statusFilter === mode
                        ? 'bg-white text-[#172033] font-semibold shadow-xs'
                        : 'text-[#64748B] hover:text-[#172033]'
                    }`}
                  >
                    {mode === 'ALL' ? 'All' : mode === 'DEFECTS' ? 'Defects (Fail/Suspected)' : 'Clean (Pass)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-[#E7ECF3] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAFBFD] border-b border-[#E7ECF3] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
                    <th className="py-3 px-4">Run Identifier</th>
                    <th className="py-3 px-4">Scenario / Case</th>
                    <th className="py-3 px-4">Source & Model</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Check Verdict</th>
                    <th className="py-3 px-4">Dual-ASR Consensus</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loadingRuns ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#94A3B8]">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#3867E8]" />
                        <span>Loading runs directory...</span>
                      </td>
                    </tr>
                  ) : filteredRuns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#94A3B8]">
                        No runs match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRuns.map((r) => {
                      const fCount = r.findings ? r.findings.length : 0;
                      const hasFail = r.findings?.some(f => f.status === 'FAIL' || f.status === 'SUSPECTED');
                      const consensus = r.stt_dual_results?.consensus_score != null ? `${r.stt_dual_results.consensus_score}%` : '100%';
                      const isSelected = r.id === selectedRunId;

                      return (
                        <tr
                          key={r.id}
                          onClick={() => handleSelectRun(r.id, true)}
                          className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#EEF4FF]/50' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#3867E8] whitespace-nowrap">
                            {r.id}
                            {r.injected_fault && (
                              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFF0F0] text-[#D94848] border border-[#FCDADA]">
                                FAULT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#172033]">{r.case_id}</span>
                          </td>
                          <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              r.source === 'TIMBRE_LIVE'
                                ? 'bg-[#F0FDF4] text-[#16A36A] border border-[#DCFCE7]'
                                : 'bg-[#FFF7E8] text-[#D99520] border border-[#FDE3B7]'
                            }`}>
                              {r.source}
                            </span>
                            <span className="ml-1.5 text-[11px] text-[#94A3B8]">
                              {r.tts_model || 'timbre-v3.0'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                            {r.duration_s?.toFixed(2) || '0.00'}s
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {hasFail ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF0F0] text-[#D94848] border border-[#FCDADA]">
                                <ShieldAlert className="w-3 h-3" />
                                {fCount} Defect{fCount > 1 ? 's' : ''} Detected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] text-[#16A36A] border border-[#DCFCE7]">
                                <CheckCircle2 className="w-3 h-3" />
                                All Checks Passed
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[#172033] whitespace-nowrap">
                            {consensus}
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8] text-[11px] whitespace-nowrap">
                            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRun(r.id, true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-[#3867E8] hover:text-[#2C56CE] bg-[#EEF4FF] hover:bg-[#DCE7FD] rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW B: DETAILED DEEP-DIVE INSPECTION                          */}
      {/* ============================================================== */}
      {viewMode === 'detail' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Active Run Selector & Context Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-[#E7ECF3] rounded-xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-[#64748B]">Active Run:</div>
              <select
                value={selectedRunId}
                onChange={(e) => handleSelectRun(e.target.value, true)}
                className="text-xs font-mono font-bold bg-[#F8FAFC] border border-[#E7ECF3] rounded-lg px-3 py-1.5 text-[#172033] focus:outline-none focus:border-[#3867E8]"
              >
                {runs.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.case_id} ({r.findings?.length || 0} defects, {r.source})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className="text-xs text-[#64748B] hover:text-[#172033] px-3 py-1.5 rounded-lg border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] transition-colors"
              >
                ← Back to All Runs
              </button>
              {onNavigateToReview && run && (
                <button
                  onClick={() => onNavigateToReview(run.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#3867E8] hover:bg-[#2C56CE] text-white transition-colors shadow-xs"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Open in Review Studio</span>
                </button>
              )}
            </div>
          </div>

          {loadingRunDetail || !run ? (
            <div className="bg-white border border-[#E7ECF3] rounded-xl p-12 text-center text-[#94A3B8]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3867E8]" />
              <span>Loading details for {selectedRunId}...</span>
            </div>
          ) : (
            <>
              {/* Run Metadata Card */}
              <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold font-mono text-[#172033]">{run.id}</h2>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-medium ${
                        run.source === 'TIMBRE_LIVE'
                          ? 'bg-[#F0FDF4] text-[#16A36A] border border-[#DCFCE7]'
                          : 'bg-[#FFF7E8] text-[#D99520] border border-[#FDE3B7]'
                      }`}>
                        Source: {run.source}
                      </span>
                      {run.injected_fault && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FFF0F0] text-[#D94848] border border-[#FCDADA] font-semibold">
                          Controlled Defect Injection: {run.injected_fault}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B]">
                      Scenario: <span className="text-[#3867E8] font-bold">{run.case_id}</span> ({testCase?.scenario || 'Scenario Title'})
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-[#94A3B8]">
                    Generated at: {new Date(run.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Audio Waveform Player */}
              <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                    Audio Inspection Waveform
                  </h3>
                  <span className="text-xs font-mono text-[#64748B]">
                    16 kHz • 16-bit Mono PCM
                  </span>
                </div>
                <WaveformPlayer
                  src={audioUrl}
                  regionStart={activeRegion?.start}
                  regionEnd={activeRegion?.end}
                  onSelectRegion={(start, end) => setActiveRegion({ start, end })}
                />
              </div>

              {/* Acoustic Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="bg-white border border-[#E7ECF3] rounded-xl p-3 shadow-xs">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Duration</div>
                  <div className="text-base font-bold font-mono text-[#172033] mt-0.5">{run.duration_s?.toFixed(2) || '0.00'}s</div>
                </div>
                <div className="bg-white border border-[#E7ECF3] rounded-xl p-3 shadow-xs">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Peak Level</div>
                  <div className="text-base font-bold font-mono text-[#172033] mt-0.5">{m.peak_db?.toFixed(1) || '—'} dBFS</div>
                </div>
                <div className="bg-white border border-[#E7ECF3] rounded-xl p-3 shadow-xs">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Clipping Ratio</div>
                  <div className={`text-base font-bold font-mono mt-0.5 ${
                    (m.clip_ratio || 0) > 0.001 ? 'text-[#D94848]' : 'text-[#16A36A]'
                  }`}>
                    {((m.clip_ratio || 0) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-white border border-[#E7ECF3] rounded-xl p-3 shadow-xs">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Speaking Pace</div>
                  <div className="text-base font-bold font-mono text-[#172033] mt-0.5">{m.pace_wps || '—'} words/s</div>
                </div>
                <div className="bg-white border border-[#E7ECF3] rounded-xl p-3 shadow-xs">
                  <div className="text-[10px] font-mono uppercase text-[#64748B]">Silence Gaps</div>
                  <div className="text-base font-bold font-mono text-[#172033] mt-0.5">{m.silence_regions_count ?? 0}</div>
                </div>
              </div>

              {/* Content Fidelity Diff */}
              {testCase && (
                <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-xs">
                  <TranscriptDiff
                    referenceText={testCase.reference_text}
                    transcriptText={run.transcript_text || ''}
                    criticalPhrases={testCase.critical_phrases}
                    wer={m.wer}
                    cer={m.cer}
                  />
                </div>
              )}

              {/* Automated Check Findings */}
              <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#3867E8]" />
                    <span>Automated Check Findings ({run.findings?.length || 0})</span>
                  </h3>
                  <span className="text-xs text-[#94A3B8] italic">
                    Human Reviewer verification required before capsule compilation.
                  </span>
                </div>

                {(!run.findings || run.findings.length === 0) ? (
                  <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-6 text-center text-[#16A36A] text-xs flex items-center justify-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                    <span>All automated fidelity and acoustic checks passed cleanly on this run.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {run.findings.map((f) => (
                      <EvidenceCard
                        key={f.id}
                        finding={f}
                        onConfirm={handleConfirmFinding}
                        onReject={handleRejectFinding}
                        onCompileCapsule={handleCompileCapsule}
                        onSeekRegion={(start) => {
                          if (f.region_start_s !== undefined && f.region_end_s !== undefined) {
                            setActiveRegion({ start: f.region_start_s, end: f.region_end_s });
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
