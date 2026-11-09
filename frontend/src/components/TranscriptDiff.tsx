import React from 'react';
import { CriticalPhrase } from '../types';

interface TranscriptDiffProps {
  referenceText: string;
  actualText?: string;
  transcriptText?: string;
  criticalPhrases?: CriticalPhrase[];
  wer?: number;
  cer?: number;
}

export const TranscriptDiff: React.FC<TranscriptDiffProps> = ({
  referenceText,
  actualText,
  transcriptText,
  criticalPhrases = [],
  wer,
  cer
}) => {
  const resolvedActual = actualText || transcriptText || '';
  const refWords = referenceText.split(/\s+/).filter(Boolean);
  const hypWordsLower = new Set(resolvedActual.toLowerCase().replace(/[।,\.?!;]/g, '').split(/\s+/).filter(Boolean));

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#E7ECF3]">
        <h4 className="font-semibold text-[#172033]">Recognition Diff Analysis</h4>
        <div className="flex items-center gap-2">
          {wer !== undefined && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#F4F7FB] border border-[#E7ECF3] text-[#64748B]">
              WER: <strong className={wer > 0.35 ? 'text-[#D99520]' : 'text-[#16A36A]'}>{(wer * 100).toFixed(1)}%</strong>
            </span>
          )}
          {cer !== undefined && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#F4F7FB] border border-[#E7ECF3] text-[#64748B]">
              CER: <strong>{(cer * 100).toFixed(1)}%</strong>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Reference */}
        <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5 flex items-center justify-between">
            <span>Reference Ground Truth</span>
            <span className="text-[#3867E8]">Expected</span>
          </div>
          <div className="font-devanagari text-xs text-[#172033] leading-relaxed">
            {refWords.map((word, i) => {
              const cleanWord = word.toLowerCase().replace(/[।,\.?!;]/g, '');
              const isFound = hypWordsLower.has(cleanWord);
              return (
                <span
                  key={i}
                  className={`inline-block mr-1.5 ${
                    !isFound ? 'bg-[#FFF7E8] text-[#D99520] font-semibold px-1 rounded border border-[#FDE3B7]' : ''
                  }`}
                  title={!isFound ? 'Token not matched in recognized transcript' : undefined}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>

        {/* Recognized Transcript */}
        <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5 flex items-center justify-between">
            <span>Recognized Output</span>
            <span className="text-[#7856D9]">Actual</span>
          </div>
          <div className="font-devanagari text-xs text-[#172033] leading-relaxed">
            {resolvedActual || <span className="text-[#94A3B8] italic">Empty transcript</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
