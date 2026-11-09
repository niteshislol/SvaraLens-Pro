import React, { useState } from 'react';
import { Capsule } from '../types';
import { StatusPill } from './StatusPill';
import { Download, Copy, Check, ArrowRight } from 'lucide-react';

interface CapsuleCardProps {
  capsule: Capsule;
  onOpenRegression?: (capsuleId: string) => void;
}

export const CapsuleCard: React.FC<CapsuleCardProps> = ({ capsule, onOpenRegression }) => {
  const [copied, setCopied] = useState(false);
  const spec = (capsule.spec as any) || {};
  const assertions = spec.assertions || [];

  const copyHash = () => {
    navigator.clipboard.writeText(capsule.failing_audio_sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const jsonStr = JSON.stringify(spec, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${capsule.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-base font-bold text-[#4F8CFF]">{capsule.id}</span>
            <StatusPill status={capsule.state} size="sm" />
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#F04D4D]/10 text-[#F04D4D] border border-[#F04D4D]/30">
              {capsule.defect_type}
            </span>
            <span className="text-xs font-mono text-[#9AA3B2]">
              Case: {capsule.case_id}
            </span>
          </div>

          <div className="text-xs text-[#9AA3B2] flex items-center gap-2 mt-1">
            <span>Audio Evidence:</span>
            <span className="font-mono text-[#E6E8EE]" title={capsule.failing_audio_sha256}>
              {capsule.failing_audio_sha256.slice(0, 24)}...
            </span>
            <button
              onClick={copyHash}
              className="text-[#9AA3B2] hover:text-[#E6E8EE] p-0.5 rounded"
              title="Copy full SHA-256"
            >
              {copied ? <Check className="w-3 h-3 text-[#2FBF71]" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[#0F1115] hover:bg-[#262B36] text-[#E6E8EE] border border-[#262B36] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#9AA3B2]" />
            <span>Download JSON</span>
          </button>

          {onOpenRegression && (
            <button
              onClick={() => onOpenRegression(capsule.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] text-white transition-colors"
            >
              <span>Rerun Regression</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Regression Assertions List */}
      <div className="mt-4 pt-3 border-t border-[#262B36]">
        <div className="text-xs uppercase font-mono tracking-wider text-[#9AA3B2] mb-2">
          Immutable Regression Test Suite ({assertions.length} Assertions)
        </div>
        <div className="space-y-1.5">
          {assertions.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between text-xs bg-[#0F1115]/50 border border-[#262B36]/60 rounded px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#A78BFA]">{a.id}</span>
                <span className="text-[#E6E8EE]">{a.description || a.type}</span>
              </div>
              <span className="font-mono text-[11px] text-[#9AA3B2] uppercase">
                {a.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
