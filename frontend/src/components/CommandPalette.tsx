import React, { useEffect, useState } from 'react';
import { Search, Layers, Swords, BarChart3, FileBox, LayoutDashboard, X, ArrowRight } from 'lucide-react';
import { TestCase, Capsule } from '../types';
import { NavView } from './Sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: NavView, id?: string) => void;
  cases: TestCase[];
  capsules: Capsule[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  cases,
  capsules
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
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
  ).slice(0, 5);

  const filteredCapsules = capsules.filter(cap =>
    cap.id.toLowerCase().includes(query.toLowerCase()) ||
    cap.case_id.toLowerCase().includes(query.toLowerCase()) ||
    cap.defect_type.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[#12151C] border border-[#262B36] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#262B36] flex items-center gap-3">
          <Search className="w-4 h-4 text-[#4F8CFF] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a case ID (e.g. TC-014), capsule (SL-004), or command..."
            className="w-full bg-transparent text-sm text-[#E6E8EE] outline-none placeholder-[#9AA3B2]"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-[#9AA3B2] hover:text-[#E6E8EE]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Navigation Commands */}
          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2]">
              Quick Workspaces
            </div>
            <div className="space-y-1">
              <div
                onClick={() => { onNavigate('arena'); onClose(); }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C202B] cursor-pointer text-xs transition-colors"
              >
                <div className="flex items-center gap-2 text-[#E6E8EE]">
                  <Swords className="w-4 h-4 text-[#4F8CFF]" />
                  <span className="font-medium">Multi-Model Arena</span>
                  <span className="text-[10px] text-[#9AA3B2]">Prisma vs Whisper vs Sarvam</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#9AA3B2]" />
              </div>

              <div
                onClick={() => { onNavigate('benchmarks'); onClose(); }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C202B] cursor-pointer text-xs transition-colors"
              >
                <div className="flex items-center gap-2 text-[#E6E8EE]">
                  <BarChart3 className="w-4 h-4 text-[#A78BFA]" />
                  <span className="font-medium">Indic Benchmark Matrix</span>
                  <span className="text-[10px] text-[#9AA3B2]">KathBath Noisy & GramVaani</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#9AA3B2]" />
              </div>

              <div
                onClick={() => { onNavigate('dashboard'); onClose(); }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C202B] cursor-pointer text-xs transition-colors"
              >
                <div className="flex items-center gap-2 text-[#E6E8EE]">
                  <LayoutDashboard className="w-4 h-4 text-[#2FBF71]" />
                  <span className="font-medium">Suite Overview</span>
                  <span className="text-[10px] text-[#9AA3B2]">Full QA statistics & ledger</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#9AA3B2]" />
              </div>
            </div>
          </div>

          {/* Matched Test Cases */}
          {filteredCases.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2]">
                Test Cases ({filteredCases.length})
              </div>
              <div className="space-y-1">
                {filteredCases.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { onNavigate('cases', c.id); onClose(); }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C202B] cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-mono font-bold text-[#4F8CFF] shrink-0">{c.id}</span>
                      <span className="text-[#E6E8EE] truncate font-medium">{c.scenario}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#9AA3B2] uppercase shrink-0 px-1.5 py-0.5 rounded bg-[#0F1115] border border-[#262B36]">
                      {c.language}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Defect Capsules */}
          {filteredCapsules.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2]">
                Voice Defect Capsules ({filteredCapsules.length})
              </div>
              <div className="space-y-1">
                {filteredCapsules.map(cap => (
                  <div
                    key={cap.id}
                    onClick={() => { onNavigate('capsules', cap.id); onClose(); }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C202B] cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileBox className="w-3.5 h-3.5 text-[#F04D4D] shrink-0" />
                      <span className="font-mono font-bold text-[#F04D4D]">{cap.id}</span>
                      <span className="text-[#E6E8EE] truncate font-mono text-[11px]">{cap.defect_type}</span>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      cap.state === 'RESOLVED'
                        ? 'bg-[#2FBF71]/10 text-[#2FBF71] border-[#2FBF71]/30'
                        : 'bg-[#F5A524]/10 text-[#F5A524] border-[#F5A524]/30'
                    }`}>
                      {cap.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 border-t border-[#262B36] bg-[#0E1015] text-[11px] font-mono text-[#9AA3B2] flex items-center justify-between">
          <span>Navigate with arrows • Select with Return</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
