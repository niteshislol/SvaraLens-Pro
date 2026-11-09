import React, { useEffect, useState } from 'react';
import { Run, TestCase } from '../types';
import { fetchRun, fetchTestCase, updateFinding, compileCapsule, getAudioUrl } from '../api/client';
import { WaveformPlayer } from '../components/WaveformPlayer';
import { TranscriptDiff } from '../components/TranscriptDiff';
import { EvidenceCard } from '../components/EvidenceCard';
import { StatusPill } from '../components/StatusPill';
import {
  ShieldAlert, Headphones, FileBox, RefreshCw, AlertTriangle, ArrowLeft,
  Volume2, CheckCircle2, Gauge, Activity
} from 'lucide-react';

interface RunAnalysisProps {
  runId: string;
  onNavigateToReview: (runId: string) => void;
  onNavigateToCapsule: (capsuleId: string) => void;
  onBack: () => void;
}

export const RunAnalysis: React.FC<RunAnalysisProps> = ({
  runId,
  onNavigateToReview,
  onNavigateToCapsule,
  onBack
}) => {
  const [run, setRun] = useState<Run | null>(null);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState<{ start: number; end: number } | undefined>();

  const loadRun = async () => {
    try {
      setLoading(true);
      const r = await fetchRun(runId);
      setRun(r);
      if (r.case_id) {
        const c = await fetchTestCase(r.case_id);
        setTestCase(c);
      }
      // If there is an automatic finding with region, highlight it
      const regionFinding = r.findings.find(f => f.region_start_s !== undefined && f.region_end_s !== undefined);
      if (regionFinding && regionFinding.region_start_s !== undefined && regionFinding.region_end_s !== undefined) {
        setActiveRegion({ start: regionFinding.region_start_s, end: regionFinding.region_end_s });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRun();
  }, [runId]);

  const handleConfirmFinding = async (findingId: string) => {
    try {
      await updateFinding(findingId, {
        review_state: 'HUMAN_CONFIRMED',
        reviewed_by: 'QA Consultant'
      });
      await loadRun();
    } catch (e) {
      alert(`Could not confirm defect: ${e}`);
    }
  };

  const handleRejectFinding = async (findingId: string) => {
    try {
      await updateFinding(findingId, {
        review_state: 'FALSE_POSITIVE',
        reviewer_note: 'Marked as false alarm upon audio review.'
      });
      await loadRun();
    } catch (e) {
      alert(`Could not reject finding: ${e}`);
    }
  };

  const handleCompileCapsule = async (findingId: string) => {
    try {
      const capsule = await compileCapsule(findingId);
      onNavigateToCapsule(capsule.id);
    } catch (e) {
      alert(`Capsule compilation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (loading || !run) {
    return (
      <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-12 text-center text-[#9AA3B2] font-mono">
        Loading run analysis {runId}...
      </div>
    );
  }

  const m = run.metrics || {};
  const audioUrl = getAudioUrl(run.id);

  return (
    <div className="space-y-6">
      {/* Run Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262B36]">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-mono text-[#9AA3B2] hover:text-[#E6E8EE] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Case Studio</span>
          </button>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold font-mono text-[#E6E8EE]">{run.id}</h1>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#0F1115] border border-[#262B36] text-[#9AA3B2]">
              Source: {run.source}
            </span>
            {run.injected_fault && (
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#F5A524]/10 text-[#F5A524] border border-[#F5A524]/30">
                Injected test fault: {run.injected_fault}
              </span>
            )}
          </div>
          <p className="text-xs text-[#9AA3B2]">
            Case: <span className="text-[#4F8CFF] font-semibold">{run.case_id}</span> ({testCase?.scenario})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToReview(run.id)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#A78BFA] hover:bg-[#906FE2] text-white transition-colors shadow-sm"
          >
            <Headphones className="w-4 h-4" />
            <span>Open in Review Studio</span>
          </button>
        </div>
      </div>

      {/* Audio Waveform Player */}
      <WaveformPlayer
        src={audioUrl}
        regionStart={activeRegion?.start}
        regionEnd={activeRegion?.end}
        onSelectRegion={(start, end) => setActiveRegion({ start, end })}
      />

      {/* Acoustic Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#171A21] border border-[#262B36] rounded p-3">
          <div className="text-[11px] font-mono uppercase text-[#9AA3B2]">Duration</div>
          <div className="text-base font-bold font-mono text-[#E6E8EE] mt-0.5">{run.duration_s?.toFixed(2) || '0.00'}s</div>
        </div>
        <div className="bg-[#171A21] border border-[#262B36] rounded p-3">
          <div className="text-[11px] font-mono uppercase text-[#9AA3B2]">Peak Level</div>
          <div className="text-base font-bold font-mono text-[#E6E8EE] mt-0.5">{m.peak_db?.toFixed(1) || '—'} dBFS</div>
        </div>
        <div className="bg-[#171A21] border border-[#262B36] rounded p-3">
          <div className="text-[11px] font-mono uppercase text-[#9AA3B2]">Clipping Ratio</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${
            (m.clip_ratio || 0) > 0.001 ? 'text-[#F04D4D]' : 'text-[#2FBF71]'
          }`}>
            {((m.clip_ratio || 0) * 100).toFixed(2)}%
          </div>
        </div>
        <div className="bg-[#171A21] border border-[#262B36] rounded p-3">
          <div className="text-[11px] font-mono uppercase text-[#9AA3B2]">Speaking Pace</div>
          <div className="text-base font-bold font-mono text-[#E6E8EE] mt-0.5">{m.pace_wps || '—'} words/s</div>
        </div>
        <div className="bg-[#171A21] border border-[#262B36] rounded p-3">
          <div className="text-[11px] font-mono uppercase text-[#9AA3B2]">Silence Gaps</div>
          <div className="text-base font-bold font-mono text-[#E6E8EE] mt-0.5">{m.silence_regions_count ?? 0}</div>
        </div>
      </div>

      {/* Content Fidelity Diff */}
      {testCase && (
        <TranscriptDiff
          referenceText={testCase.reference_text}
          transcriptText={run.transcript_text || ''}
          criticalPhrases={testCase.critical_phrases}
          wer={m.wer}
          cer={m.cer}
        />
      )}

      {/* Auto-Findings List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E6E8EE] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#F5A524]" />
            <span>Automated Check Findings ({run.findings.length})</span>
          </h2>
          <span className="text-xs text-[#9AA3B2] italic">
            *Transcript warnings are marked possible until confirmed by a human reviewer.
          </span>
        </div>

        {run.findings.length === 0 ? (
          <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-6 text-center text-[#2FBF71] font-mono text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>All automated fidelity and acoustic checks passed cleanly.</span>
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
    </div>
  );
};
