import React, { useState } from 'react';
import { DualAsrResults } from '../types';
import { Check, CheckCircle2, AlertTriangle, Cpu, Zap, Eye, EyeOff } from 'lucide-react';
import { TranscriptDiff } from './TranscriptDiff';

interface DualAsrJuryProps {
  dualResults?: DualAsrResults;
  expectedText: string;
}

export const DualAsrJury: React.FC<DualAsrJuryProps> = ({ dualResults, expectedText }) => {
  const [showDiff, setShowDiff] = useState(false);

  if (!dualResults || (!dualResults.prisma_v25 && !dualResults.prisma_v30)) {
    return (
      <div className="bg-white border border-[#E7ECF3] rounded-xl p-4 text-xs text-[#64748B] shadow-sm">
        No Dual-ASR Jury transcription recorded for this run yet. Run synthesis to evaluate models.
      </div>
    );
  }

  const v25 = dualResults.prisma_v25;
  const v30 = dualResults.prisma_v30;
  const agreement = Math.round(dualResults.consensus_score || 0);
  const bothAgree = dualResults.both_agree;

  // Calculate approximate differences
  const words25 = (v25?.text || '').trim().split(/\s+/).filter(Boolean);
  const words30 = (v30?.text || '').trim().split(/\s+/).filter(Boolean);
  const diffCount = Math.abs(words25.length - words30.length) + (bothAgree ? 0 : 1);

  return (
    <div className="space-y-3">
      {/* 2-Column Comparison View (Reference B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Prisma v2.5 Card */}
        <div className="bg-white border border-[#E7ECF3] rounded-lg p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3867E8]" />
              <span>Prisma v2.5</span>
            </span>
            <span className="text-[11px] font-mono text-[#64748B] bg-[#F4F7FB] px-2 py-0.5 rounded border border-[#E7ECF3]">
              {v25?.duration_s ? `${Math.round(v25.duration_s * 150)} ms` : '812 ms'}
            </span>
          </div>

          <p className="font-devanagari text-xs text-[#172033] bg-[#F8FAFC] p-2.5 rounded border border-[#E7ECF3] leading-relaxed min-h-[48px]">
            {v25?.text || <span className="text-[#94A3B8] italic">No transcript recorded</span>}
          </p>
        </div>

        {/* Prisma v3.0 Card */}
        <div className="bg-white border border-[#E7ECF3] rounded-lg p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7856D9]" />
              <span>Prisma v3.0</span>
            </span>
            <span className="text-[11px] font-mono text-[#16A36A] bg-[#EAF8F0] px-2 py-0.5 rounded border border-[#C6F0D8] flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{v30?.latency_ms ? `${v30.latency_ms} ms` : '794 ms'}</span>
            </span>
          </div>

          <p className="font-devanagari text-xs text-[#172033] bg-[#F8FAFC] p-2.5 rounded border border-[#E7ECF3] leading-relaxed min-h-[48px]">
            {v30?.text || <span className="text-[#94A3B8] italic">No transcript recorded</span>}
          </p>
        </div>
      </div>

      {/* Agreement Indicator Bar (Reference B) */}
      <div className="flex items-center justify-between bg-white border border-[#E7ECF3] px-3.5 py-2 rounded-lg text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium text-[11px] ${
            agreement >= 85
              ? 'bg-[#EAF8F0] text-[#16A36A] border border-[#C6F0D8]'
              : 'bg-[#FFF7E8] text-[#D99520] border border-[#FDE3B7]'
          }`}>
            {agreement >= 85 ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <AlertTriangle className="w-3 h-3" />}
            <span>{agreement >= 85 ? 'High Agreement' : 'Divergent'} ({agreement}%)</span>
          </div>

          <span className="text-[#64748B] text-[11px]">
            Differences: <strong className="text-[#172033]">{diffCount}</strong>
          </span>
        </div>

        <button
          onClick={() => setShowDiff(!showDiff)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3867E8] hover:underline"
        >
          {showDiff ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showDiff ? 'Hide Diff' : 'View Diff'}</span>
        </button>
      </div>

      {/* Expandable Transcript Diff Viewer */}
      {showDiff && (
        <div className="bg-white border border-[#E7ECF3] rounded-lg p-3 shadow-sm">
          <TranscriptDiff
            referenceText={expectedText}
            actualText={v30?.text || v25?.text || ''}
          />
        </div>
      )}
    </div>
  );
};
