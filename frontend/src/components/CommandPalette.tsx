import React, { useState, useEffect } from 'react';
import { TestCase } from '../types';
import { Search, Command, ArrowRight, Play, FileText, Download, Sparkles, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  cases: TestCase[];
  onSelectCase: (caseId: string) => void;
  onExportReport: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  cases,
  onSelectCase,
  onExportReport
}) => {
  const [query, setQuery] = useState('');

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

  const filteredCases = cases.filter(c =>
    c.id.toLowerCase().includes(query.toLowerCase()) ||
    c.scenario.toLowerCase().includes(query.toLowerCase()) ||
    c.reference_text.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-[#11141B] border border-[#1D2230] rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1D2230]">
          <Search className="w-5 h-5 text-[#4F8CFF] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search test cases, scripts, actions... (ESC to close)"
            className="w-full bg-transparent text-sm text-[#F3F4F6] placeholder-[#64748B] outline-none"
          />
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F3F4F6]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
          {/* Quick Actions */}
          <div className="px-3 py-1 text-[10px] font-mono text-[#64748B] uppercase tracking-wider">
            Quick Actions
          </div>

          <div
            onClick={() => {
              onExportReport();
              onClose();
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#171C26] cursor-pointer text-xs text-[#F3F4F6] group transition-colors"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#10B981]" />
              <span>Export Release Readiness HTML Report</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#4F8CFF] transition-opacity" />
          </div>

          {/* Test Cases Results */}
          <div className="px-3 py-1 text-[10px] font-mono text-[#64748B] uppercase tracking-wider pt-2">
            Test Scenarios ({filteredCases.length})
          </div>

          {filteredCases.map(c => (
            <div
              key={c.id}
              onClick={() => {
                onSelectCase(c.id);
                onClose();
              }}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#171C26] cursor-pointer group transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#4F8CFF]">{c.id}</span>
                  <span className="text-xs font-medium text-[#F3F4F6]">{c.scenario}</span>
                  <span className="text-[10px] font-mono uppercase px-1 rounded bg-[#080A0E] text-[#94A3B8]">
                    {c.language}
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] font-devanagari line-clamp-1">
                  {c.reference_text}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-[#4F8CFF] shrink-0 transition-opacity ml-2" />
            </div>
          ))}

          {filteredCases.length === 0 && (
            <div className="py-6 text-center text-xs text-[#64748B]">
              No matching scenarios found.
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="bg-[#080A0E] px-4 py-2 border-t border-[#1D2230] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
          <span>Tip: Press Space to Play/Pause, J/L to scrub</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-[#171C26] text-[#94A3B8] border border-[#222938]">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
