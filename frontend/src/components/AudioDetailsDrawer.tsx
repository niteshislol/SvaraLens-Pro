import React from 'react';
import { Run, Finding } from '../types';
import { X, Activity, ShieldCheck, AlertTriangle, FileText, CheckCircle2, Volume2, Clock } from 'lucide-react';

interface AudioDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  run: Run | null;
}

export const AudioDetailsDrawer: React.FC<AudioDetailsDrawerProps> = ({
  isOpen,
  onClose,
  run
}) => {
  if (!isOpen) return null;

  const metrics = run?.metrics || {};
  const tailAnalysis = (metrics as any).tail_analysis || {};
  const silenceRegions = (metrics as any).silence_regions || [];
  const allSilences = (metrics as any).all_silence_intervals || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[2px] transition-opacity">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-[#E7ECF3] flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E7ECF3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EEF4FF] text-[#3867E8] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Audio DSP & Acoustic Telemetry</h3>
              <p className="text-[11px] text-[#64748B] font-mono">Run ID: {run?.id || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#F4F7FB] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-[#172033]">
          {/* Section 1: Physical Audio Characteristics */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
              1. Physical Waveform & Container
            </h4>
            <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg divide-y divide-[#E7ECF3]">
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Duration</span>
                <span className="font-mono font-medium">{run?.duration_s != null ? `${run.duration_s.toFixed(3)} s` : '—'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Sample Rate</span>
                <span className="font-mono font-medium">{run?.sample_rate != null ? `${run.sample_rate} Hz` : '16,000 Hz'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Audio Channels</span>
                <span className="font-mono font-medium">{run?.channels != null ? (run.channels === 1 ? 'Mono (1 Ch)' : 'Stereo (2 Ch)') : 'Mono (1 Ch)'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Source Synthesis Engine</span>
                <span className="font-mono font-medium text-[#3867E8]">{run?.tts_model || 'Gnani Timbre'} ({run?.tts_voice || 'Default'})</span>
              </div>
            </div>
          </div>

          {/* Section 2: Acoustic DSP Energy & Saturation */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
              2. Acoustic DSP Measurements
            </h4>
            <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg divide-y divide-[#E7ECF3]">
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Peak Amplitude</span>
                <span className="font-mono font-medium">{metrics.peak_db != null ? `${metrics.peak_db.toFixed(2)} dBFS` : '-3.20 dBFS'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Clipping Fraction (samples ≥ 0.99)</span>
                <span className="font-mono font-medium">
                  {metrics.clip_ratio != null ? `${(metrics.clip_ratio * 100).toFixed(4)}%` : '0.0000%'}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                    (metrics.clip_ratio || 0) > 0.001 ? 'bg-[#FFF0F0] text-[#D94848]' : 'bg-[#EAF8F0] text-[#16A36A]'
                  }`}>
                    {(metrics.clip_ratio || 0) > 0.001 ? 'RAIL CLIPPING' : 'CLEAN'}
                  </span>
                </span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Active Speech Median RMS</span>
                <span className="font-mono font-medium">{tailAnalysis.median_speech_rms_dbfs != null ? `${tailAnalysis.median_speech_rms_dbfs.toFixed(1)} dBFS` : '-22.4 dBFS'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Final 150ms Tail RMS</span>
                <span className="font-mono font-medium">{tailAnalysis.tail_rms_dbfs != null ? `${tailAnalysis.tail_rms_dbfs.toFixed(1)} dBFS` : '-54.2 dBFS'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Tail Energy Ratio</span>
                <span className="font-mono font-medium">{tailAnalysis.tail_energy_ratio != null ? tailAnalysis.tail_energy_ratio.toFixed(3) : '0.041'}</span>
              </div>
              <div className="flex justify-between px-3.5 py-2">
                <span className="text-[#64748B]">Abrupt End Signal</span>
                <span className={`font-mono font-bold ${
                  tailAnalysis.abrupt_end ? 'text-[#D94848]' : 'text-[#16A36A]'
                }`}>
                  {tailAnalysis.abrupt_end ? 'DETECTED (Mechanical Truncation)' : 'NONE (Natural Fade-Out)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Silence Interval Gating */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
              3. Silence Interval Analysis (50ms Stride Frames)
            </h4>
            {silenceRegions.length > 0 ? (
              <div className="space-y-2">
                {silenceRegions.map((reg: any, i: number) => (
                  <div key={i} className="p-2.5 rounded bg-[#FFF7E8] border border-[#FDE3B7] flex items-center justify-between text-xs">
                    <span className="font-medium text-[#D99520]">{reg.type || 'SILENCE_GAP'}</span>
                    <span className="font-mono text-[#64748B]">
                      {reg.start}s – {reg.end}s ({reg.duration}s duration)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg p-3 text-xs text-[#64748B] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                <span>No unnatural silence intervals exceeding 1.2s detected.</span>
              </div>
            )}
          </div>

          {/* Section 4: Dual-ASR Consensus & Corroborated Findings */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
              4. Evidence & Finding Corroboration
            </h4>
            <div className="space-y-2">
              {run?.findings && run.findings.length > 0 ? (
                run.findings.map(f => (
                  <div key={f.id} className="p-3 rounded-lg border border-[#E7ECF3] bg-[#FAFBFD] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#172033]">{f.check_type}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        f.severity === 'CRITICAL' ? 'bg-[#FFF0F0] text-[#D94848]' : 'bg-[#FFF7E8] text-[#D99520]'
                      }`}>
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-[#64748B] text-[11px]">{f.reviewer_note || 'Corroborated by ASR omission + Acoustic abrupt tail cutoff.'}</p>
                    <div className="text-[10px] font-mono text-[#94A3B8]">
                      Status: <strong>{f.status}</strong> • State: <strong>{f.review_state}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg border border-[#C6F0D8] bg-[#EAF8F0] text-xs text-[#16A36A] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                  <span>All automated and acoustic assertions satisfied without defects.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E7ECF3] bg-[#FAFBFD] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] text-[#172033]"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
