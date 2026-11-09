import React from 'react';
import { CriticalPhrase } from '../types';

interface TranscriptDiffProps {
  referenceText: string;
  transcriptText: string;
  criticalPhrases: CriticalPhrase[];
  wer?: number;
  cer?: number;
}

export const TranscriptDiff: React.FC<TranscriptDiffProps> = ({
  referenceText,
  transcriptText,
  criticalPhrases,
  wer,
  cer
}) => {
  // Simple word comparison to detect missing tokens
  const refWords = referenceText.split(/\s+/);
  const hypWordsLower = new Set(transcriptText.toLowerCase().replace(/[।,\.?!;]/g, '').split(/\s+/));

  return (
    <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262B36]">
        <h3 className="text-sm font-semibold text-[#E6E8EE]">Content Fidelity & Recognition Diff</h3>
        <div className="flex items-center gap-2">
          {wer !== undefined && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0F1115] border border-[#262B36] text-[#9AA3B2]">
              WER: <span className={wer > 0.35 ? 'text-[#F5A524] font-bold' : 'text-[#2FBF71]'}>{(wer * 100).toFixed(1)}%</span>
            </span>
          )}
          {cer !== undefined && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0F1115] border border-[#262B36] text-[#9AA3B2]">
              CER: <span className="text-[#9AA3B2]">{(cer * 100).toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: Reference Script */}
        <div className="bg-[#0F1115]/60 border border-[#262B36]/60 rounded-md p-3">
          <div className="text-xs uppercase font-mono tracking-wider text-[#9AA3B2] mb-2 flex items-center justify-between">
            <span>Reference Script (Expected)</span>
            <span className="text-[10px] text-[#4F8CFF]">Ground Truth</span>
          </div>
          <div className="text-sm font-devanagari text-[#E6E8EE] leading-relaxed">
            {refWords.map((word, i) => {
              const cleanWord = word.toLowerCase().replace(/[।,\.?!;]/g, '');
              const isFound = hypWordsLower.has(cleanWord);
              return (
                <span
                  key={i}
                  className={`inline-block mr-1.5 ${
                    !isFound
                      ? 'underline decoration-[#F5A524] decoration-2 text-[#F5A524] font-medium'
                      : ''
                  }`}
                  title={!isFound ? 'Token not matched in recognized transcript' : undefined}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>

        {/* Column 2: Prisma STT Transcript */}
        <div className="bg-[#0F1115]/60 border border-[#262B36]/60 rounded-md p-3">
          <div className="text-xs uppercase font-mono tracking-wider text-[#9AA3B2] mb-2 flex items-center justify-between">
            <span>Prisma v2.5 Transcript</span>
            <span className="text-[10px] text-[#A78BFA]">Speech Recognized</span>
          </div>
          <div className="text-sm font-devanagari text-[#E6E8EE] leading-relaxed">
            {transcriptText || <span className="text-[#9AA3B2] italic">No transcript available</span>}
          </div>
        </div>
      </div>

      {/* Critical Phrases Checklist */}
      {criticalPhrases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#262B36]/60">
          <div className="text-xs font-mono text-[#9AA3B2] mb-1.5">Critical Mandatory Phrases:</div>
          <div className="flex flex-wrap gap-2">
            {criticalPhrases.map((cp, idx) => {
              const inHyp = transcriptText.toLowerCase().includes(cp.text.toLowerCase().replace(/[₹,]/g, ''));
              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border ${
                    inHyp
                      ? 'bg-[#2FBF71]/10 border-[#2FBF71]/30 text-[#2FBF71]'
                      : 'bg-[#F04D4D]/10 border-[#F04D4D]/30 text-[#F04D4D]'
                  }`}
                >
                  <span>{inHyp ? '✓' : '✗'}</span>
                  <span>{cp.text}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
