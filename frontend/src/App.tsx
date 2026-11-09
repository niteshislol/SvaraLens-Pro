import React, { useEffect, useState } from 'react';
import { fetchHealth, fetchTestCases } from './api/client';
import { Health, TestCase } from './types';
import { ProWorkbench } from './pages/ProWorkbench';
import { SuiteDashboard } from './pages/SuiteDashboard';
import { CapsuleView } from './pages/CapsuleView';
import { CommandPalette } from './components/CommandPalette';
import {
  Layers, Headphones, FileBox, LayoutDashboard, ShieldCheck,
  AlertTriangle, Volume2, Sparkles, Activity, Search, Download,
  Radio, Zap
} from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'workbench' | 'dashboard' | 'capsules'>('workbench');
  const [activeCaseId, setActiveCaseId] = useState<string>('TC-014');
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | undefined>();
  const [health, setHealth] = useState<Health | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Backend offline or health check failed', err));

    fetchTestCases('suite-insurance-hi')
      .then(setCases)
      .catch(() => {});
  }, []);

  const handleExportHtml = () => {
    window.open('/api/exports/report/suite-insurance-hi.html', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#080A0E] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#4F8CFF] selection:text-white">
      {/* Persistent Mock Mode Warning Banner */}
      {health?.mock_mode && (
        <div className="bg-[#F5A524]/10 border-b border-[#F5A524]/30 px-4 py-1.5 text-xs font-mono text-[#F5A524] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>MOCK MODE:</strong> Running on deterministic Indic fixtures. Set GNANI_API_KEY in .env for live Vachana platform synthesis.
            </span>
          </div>
          <span className="text-[11px] opacity-80">v0.2.0 • Pro Workbench</span>
        </div>
      )}

      {/* Top Navigation & Command Bar (56px) */}
      <header className="bg-[#10131B] border-b border-[#1D2230] sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo & Platform Tagline */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setCurrentView('workbench')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#8B5CF6] flex items-center justify-center font-bold text-white shadow-md group-hover:scale-105 transition-transform">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-[#F3F4F6]">
                    Svara<span className="text-[#4F8CFF]">Lens</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">
                    PRO
                  </span>
                </div>
                <span className="hidden xl:inline text-[10px] font-mono text-[#64748B]">
                  Indic Voice QA & Model Intelligence Workbench
                </span>
              </div>
            </div>
          </div>

          {/* Center Search / Command Trigger */}
          <div
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 bg-[#171C26] hover:bg-[#212836] border border-[#222938] hover:border-[#4F8CFF]/50 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#94A3B8] cursor-pointer transition-colors max-w-sm w-full"
          >
            <Search className="w-3.5 h-3.5 text-[#4F8CFF]" />
            <span className="flex-1 text-left">Search scenarios, models, or actions...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#080A0E] text-[10px] font-mono border border-[#222938]">
              ⌘K
            </kbd>
          </div>

          {/* Right Navigation & Actions */}
          <div className="flex items-center gap-2">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#171C26] border border-[#222938] px-2.5 py-1 rounded-lg text-[11px] font-mono text-[#94A3B8]">
              <span className={`w-2 h-2 rounded-full ${health?.mock_mode ? 'bg-[#F59E0B]' : 'bg-[#10B981] animate-pulse'}`} />
              <span>{health?.mock_mode ? 'Mock Mode' : 'Gnani Live'}</span>
            </div>

            {/* View Tabs */}
            <nav className="flex items-center bg-[#171C26] p-0.5 rounded-lg border border-[#222938] text-xs font-medium">
              <button
                onClick={() => setCurrentView('workbench')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  currentView === 'workbench'
                    ? 'bg-[#4F8CFF] text-white font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Workbench</span>
              </button>

              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-[#4F8CFF] text-white font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Suite</span>
              </button>

              <button
                onClick={() => setCurrentView('capsules')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  currentView === 'capsules'
                    ? 'bg-[#4F8CFF] text-white font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Capsules</span>
              </button>
            </nav>

            {/* Export HTML Report Pill */}
            <button
              onClick={handleExportHtml}
              title="Download Release Readiness Report"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5">
        {currentView === 'workbench' && (
          <ProWorkbench
            initialCaseId={activeCaseId}
            onOpenReport={handleExportHtml}
          />
        )}

        {currentView === 'dashboard' && (
          <SuiteDashboard
            onNavigate={(view, id) => {
              if (id) setActiveCaseId(id);
              if (view === 'cases') setCurrentView('workbench');
              else if (view === 'capsules') setCurrentView('capsules');
            }}
          />
        )}

        {currentView === 'capsules' && (
          <CapsuleView
            initialCapsuleId={activeCapsuleId}
            onBack={() => setCurrentView('workbench')}
          />
        )}
      </main>

      {/* Global Command Palette (Cmd + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        cases={cases}
        onSelectCase={(id) => {
          setActiveCaseId(id);
          setCurrentView('workbench');
        }}
        onExportReport={handleExportHtml}
      />

      {/* Subtle Pro Footer */}
      <footer className="border-t border-[#1D2230] bg-[#10131B] py-2.5 text-xs font-mono text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#F3F4F6] font-bold">SvaraLens Pro</span>
            <span>•</span>
            <span>Gnani Timbre v3.0 & Prisma v3.0</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1 rounded bg-[#171C26] text-[#94A3B8]">Space</kbd> to Play</span>
            <span>•</span>
            <span className="text-[#4F8CFF]">10 Nov 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
