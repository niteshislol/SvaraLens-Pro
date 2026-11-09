import React from 'react';
import { Finding } from '../types';
import { StatusPill } from './StatusPill';
import { ShieldAlert, ExternalLink, Check, X, FileBox } from 'lucide-react';

interface EvidenceCardProps {
  finding: Finding;
  onConfirm?: (findingId: string) => void;
  onReject?: (findingId: string) => void;
  onCompileCapsule?: (findingId: string) => void;
  onSeekRegion?: (start: number) => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  finding,
  onConfirm,
  onReject,
  onCompileCapsule,
  onSeekRegion
}) => {
  const ev = finding.evidence || {};
  const isConfirmed = finding.review_state === 'HUMAN_CONFIRMED';
  const isRejected = finding.review_state === 'FALSE_POSITIVE';

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isConfirmed
        ? 'bg-[#171A21] border-[#F04D4D]/50'
        : 'bg-[#171A21] border-[#262B36]'
    }`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#E6E8EE]">
            {finding.check_type}
          </span>
          <StatusPill status={finding.status} size="sm" />
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#0F1115] text-[#9AA3B2] border border-[#262B36]">
            {finding.severity}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#9AA3B2]">
            State: <span className={isConfirmed ? 'text-[#F04D4D] font-bold' : (isRejected ? 'text-[#9AA3B2]' : 'text-[#A78BFA]')}>{finding.review_state}</span>
          </span>
        </div>
      </div>

      {/* Explanation Line */}
      <div className="text-xs text-[#E6E8EE] mb-3 leading-relaxed">
        {ev.explanation || 'No detailed description available.'}
      </div>

      {/* Raw Metrics & Evidence Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 bg-[#0F1115]/50 border border-[#262B36]/60 rounded p-2 text-xs font-mono">
        {ev.confidence && (
          <div>
            <span className="text-[#9AA3B2]">Confidence: </span>
            <span className="text-[#E6E8EE]">{ev.confidence}</span>
          </div>
        )}
        {ev.last_sentence_match_score !== undefined && (
          <div>
            <span className="text-[#9AA3B2]">Match Score: </span>
            <span className="text-[#E6E8EE]">{ev.last_sentence_match_score}%</span>
          </div>
        )}
        {ev.tail_rms_dbfs !== undefined && (
          <div>
            <span className="text-[#9AA3B2]">Tail RMS: </span>
            <span className="text-[#E6E8EE]">{ev.tail_rms_dbfs} dBFS</span>
          </div>
        )}
        {finding.region_start_s !== undefined && finding.region_end_s !== undefined && (
          <div>
            <span className="text-[#9AA3B2]">Time: </span>
            <button
              onClick={() => onSeekRegion?.(finding.region_start_s!)}
              className="text-[#4F8CFF] hover:underline"
            >
              {finding.region_start_s}s–{finding.region_end_s}s
            </button>
          </div>
        )}
      </div>

      {/* Reviewer Note if present */}
      {finding.reviewer_note && (
        <div className="mb-3 text-xs bg-[#262B36]/30 border-l-2 border-[#A78BFA] p-2 text-[#E6E8EE] italic">
          "{finding.reviewer_note}" — <span className="text-[#9AA3B2] not-italic">{finding.reviewed_by || 'QA Reviewer'}</span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#262B36]/60">
        <div className="flex items-center gap-2">
          {!isConfirmed && (
            <button
              onClick={() => onConfirm?.(finding.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-[#F04D4D]/10 hover:bg-[#F04D4D]/20 text-[#F04D4D] border border-[#F04D4D]/30 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Defect</span>
            </button>
          )}

          {!isRejected && (
            <button
              onClick={() => onReject?.(finding.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-[#262B36]/40 hover:bg-[#262B36] text-[#9AA3B2] hover:text-[#E6E8EE] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>False Positive</span>
            </button>
          )}
        </div>

        {isConfirmed && (
          <button
            onClick={() => onCompileCapsule?.(finding.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] text-white transition-colors shadow-sm"
          >
            <FileBox className="w-3.5 h-3.5" />
            <span>Compile Defect Capsule</span>
          </button>
        )}
      </div>
    </div>
  );
};
