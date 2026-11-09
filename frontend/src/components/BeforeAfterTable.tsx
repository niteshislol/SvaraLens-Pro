import React from 'react';
import { AssertionComparison } from '../types';
import { StatusPill } from './StatusPill';
import { CheckCircle2, Clock } from 'lucide-react';

interface BeforeAfterTableProps {
  assertions: AssertionComparison[];
  verdict: string;
  onApprove?: () => void;
}

export const BeforeAfterTable: React.FC<BeforeAfterTableProps> = ({
  assertions,
  verdict,
  onApprove
}) => {
  return (
    <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-5">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#262B36]">
        <div>
          <h3 className="text-sm font-semibold text-[#E6E8EE]">Regression Assertion Verification Matrix</h3>
          <p className="text-xs text-[#9AA3B2] mt-0.5">Evaluating replacement audio output against the locked failure capsule.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#9AA3B2]">Overall Verdict:</span>
          <StatusPill status={verdict} />

          {verdict === 'NEEDS_REVIEW' && onApprove && (
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[#2FBF71] hover:bg-[#28A762] text-white transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Fix (RESOLVE)</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#262B36] text-[#9AA3B2] font-mono uppercase text-[11px]">
              <th className="py-2.5 px-3">ID</th>
              <th className="py-2.5 px-3">Assertion Specification</th>
              <th className="py-2.5 px-3 text-center">Defect Baseline</th>
              <th className="py-2.5 px-3 text-center">New Audio Run</th>
              <th className="py-2.5 px-3">Resolution Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262B36]/60 font-mono">
            {assertions.map((a) => (
              <tr key={a.id} className="hover:bg-[#0F1115]/40 transition-colors">
                <td className="py-3 px-3 font-bold text-[#A78BFA]">{a.id}</td>
                <td className="py-3 px-3 font-sans text-[#E6E8EE] max-w-xs">{a.description || a.type}</td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-[#F04D4D]/10 text-[#F04D4D] border border-[#F04D4D]/30 font-bold">
                    {a.before}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  {a.after === 'PASS' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#2FBF71]/10 text-[#2FBF71] border border-[#2FBF71]/30 font-bold">
                      PASS
                    </span>
                  ) : a.after === 'PENDING' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/30 font-bold flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> PENDING
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#F04D4D]/10 text-[#F04D4D] border border-[#F04D4D]/30 font-bold">
                      FAIL
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 font-sans text-xs text-[#9AA3B2] leading-relaxed">
                  {a.detail || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
