import React from 'react';
import { DualAsrResults } from '../types';
import { CheckCircle2, AlertTriangle, Cpu, Globe, Zap, ShieldCheck } from 'lucide-react';

interface DualAsrJuryProps {
  dualResults?: DualAsrResults;
  expectedText: string;
}

export const DualAsrJury: React.FC<DualAsrJuryProps> = ({ dualResults, expectedText }) => {
  if (!dualResults || (!dualResults.prisma_v25 && !dualResults.prisma_v30)) {
    return (
      <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-4 text-xs font-mono text-[#94A3B8]">
        No Dual-ASR Jury consensus data recorded for this run.
      </div>
    );
  }

  const v25 = dualResults.prisma_v25;
  const v30 = dualResults.prisma_v30;
  const score = dualResults.consensus_score;
  const bothAgree = dualResults.both_agree;

  return (
    <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-4 shadow-lg space-y-4">
      {/* Header with Consensus Gauge */}
      <div className="flex items-center justify-between border-b border-[#1D2230] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
              Dual-ASR Jury Consensus
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30">
                Gnani Sovereignty Stack
              </span>
            </h3>
            <p className="text-[11px] text-[#94A3B8]">Prisma v2.5 (Telephony) & Prisma v3.0 (Indic-Auto) Cross-Validation</p>
          </div>
        </div>

        {/* Consensus Metric Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-xs font-mono font-bold ${
            bothAgree
              ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
              : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
          }`}>
            {bothAgree ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{score.toFixed(1)}% Agreement</span>
          </div>
        </div>
      </div>

      {/* 2-Column Comparison View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Prisma v2.5 Box */}
        <div className="bg-[#171C26] border border-[#222938] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-[#4F8CFF] flex items-center gap-1">
              <span>Prisma v2.5</span>
              <span className="text-[10px] text-[#64748B] font-normal">• Telephony Baseline</span>
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">
              {v25?.duration_s?.toFixed(2)}s audio
            </span>
          </div>

          <p className="font-devanagari text-sm text-[#F3F4F6] bg-[#080A0E] p-2.5 rounded border border-[#222938] leading-relaxed">
            {v25?.text || <span className="text-[#64748B] italic">No transcript produced</span>}
          </p>

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B]">
            <span>Locale: hi-IN</span>
            <span>•</span>
            <span className="text-emerald-400">PSTN Optimized</span>
          </div>
        </div>

        {/* Prisma v3.0 Box */}
        <div className="bg-[#171C26] border border-[#222938] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-[#8B5CF6] flex items-center gap-1">
              <span>Prisma v3.0</span>
              <span className="text-[10px] text-[#64748B] font-normal">• Next-Gen Multilingual</span>
            </span>
            {v30?.latency_ms && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded border border-[#10B981]/20">
                <Zap className="w-3 h-3" />
                <span>{v30.latency_ms}ms</span>
              </span>
            )}
          </div>

          <p className="font-devanagari text-sm text-[#F3F4F6] bg-[#080A0E] p-2.5 rounded border border-[#222938] leading-relaxed">
            {v30?.text || <span className="text-[#64748B] italic">No transcript produced</span>}
          </p>

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B]">
            <span className="flex items-center gap-1 text-[#8B5CF6]">
              <Globe className="w-3 h-3" />
              <span>Detected: {v30?.detected_language || 'indic-auto'}</span>
            </span>
            <span>•</span>
            <span>Low-Latency STT</span>
          </div>
        </div>
      </div>

      {/* Epistemic Jury Verdict Note */}
      <div className={`p-2.5 rounded-lg border text-xs font-mono leading-relaxed flex items-start gap-2 ${
        bothAgree
          ? 'bg-[#10B981]/10 border-[#10B981]/25 text-[#A7F3D0]'
          : 'bg-[#F59E0B]/10 border-[#F59E0B]/25 text-[#FDE68A]'
      }`}>
        {bothAgree ? (
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
        )}
        <div>
          {bothAgree ? (
            <span>
              <strong>Consensus Alignment:</strong> Both Prisma v2.5 and Prisma v3.0 generated coherent transcripts. Mismatches against expected script are high-confidence speech defects.
            </span>
          ) : (
            <span>
              <strong>Model Divergence ({score.toFixed(1)}% match):</strong> Prisma v2.5 and Prisma v3.0 recognized different phrasings. Flagged as an ASR transcription variation per Epistemic Rule.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
