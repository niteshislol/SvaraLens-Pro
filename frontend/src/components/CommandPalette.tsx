import React, { useState, useEffect } from 'react';
import { TestCase } from '../types';
import { Search, ArrowRight, Download, X } from 'lucide-react';
import { fetchTestCases } from '../api/client';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  cases?: TestCase[];
  onSelectCase: (caseId: string) => void;
  onSelectCapsule?: (capsuleId: string) => void;
  onExportReport?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  cases = [],
  onSelectCase,
  onSelectCapsule,
  onExportReport
}) => {
  const [query, setQuery] = useState('');
  const [localCases, setLocalCases] = useState<TestCase[]>(cases);

  useEffect(() => {
    if (cases.length === 0 && isOpen) {
      fetchTestCases('suite-insurance-hi')
        .then(setLocalCases)
        .catch(() => {});
    } else {
      setLocalCases(cases);
    }
  }, [isOpen, cases]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCases = localCases.filter(c =>
    c.id.toLowerCase().includes(query.toLowerCase()) ||
    c.scenario.toLowerCase().includes(query.toLowerCase()) ||
    c.reference_text.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-white border border-[#E7ECF3] rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E7ECF3]">
          <Search className="w-5 h-5 text-[#3867E8] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scenarios, scripts, actions... (ESC to close)"
            className="w-full bg-transparent text-sm text-[#172033] placeholder-[#94A3B8] outline-none"
          />
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#172033]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
          {/* Quick Actions */}
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            Quick Actions
          </div>

          <div
            onClick={() => {
              if (onExportReport) onExportReport();
              else window.open('/api/exports/report/suite-insurance-hi.html', '_blank');
              onClose();
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer text-xs text-[#172033] group transition-colors"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#16A36A]" />
              <span>Export Release Readiness HTML Report</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#3867E8] transition-opacity" />
          </div>

          {/* Test Cases Results */}
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B] pt-2">
            Test Scenarios ({filteredCases.length})
          </div>

          {filteredCases.map(c => (
            <div
              key={c.id}
              onClick={() => {
                onSelectCase(c.id);
                onClose();
              }}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer group transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#3867E8]">{c.id}</span>
                  <span className="text-xs font-medium text-[#172033]">{c.scenario}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#F4F7FB] text-[#64748B]">
                    {c.language}
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] font-devanagari line-clamp-1">
                  {c.reference_text}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-[#3867E8] shrink-0 transition-opacity ml-2" />
            </div>
          ))}

          {filteredCases.length === 0 && (
            <div className="py-6 text-center text-xs text-[#94A3B8]">
              No matching scenarios found.
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="bg-[#FAFBFD] px-4 py-2 border-t border-[#E7ECF3] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
          <span>Tip: Press Space to Play/Pause in Audio Inspection</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white text-[#64748B] border border-[#E7ECF3]">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
