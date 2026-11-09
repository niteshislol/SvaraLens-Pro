import React, { useEffect, useState } from 'react';
import { fetchHealth, fetchTestCases } from './api/client';
import { Health, TestCase } from './types';
import { ProWorkbench } from './pages/ProWorkbench';
import { SuiteDashboard } from './pages/SuiteDashboard';
import { CapsuleView } from './pages/CapsuleView';
import { CommandPalette } from './components/CommandPalette';
import {
  Activity, Search, Download, AlertTriangle, Layers,
  BarChart3, User, Sparkles
} from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'workbench' | 'analytics' | 'capsules'>('workbench');
  const [activeCaseId, setActiveCaseId] = useState<string>('TC-007');
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | undefined>();
  const [health, setHealth] = useState<Health | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Backend health check failed', err));

    fetchTestCases('suite-insurance-hi')
      .then(setCases)
      .catch(() => {});

    // Global Cmd/Ctrl + K shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportHtml = () => {
    window.open('/api/exports/report/suite-insurance-hi.html', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033] flex flex-col font-sans selection:bg-[#EEF4FF] selection:text-[#3867E8]">
      {/* Persistent Mock Mode Warning Banner (if mock mode) */}
      {health?.mock_mode && (
        <div className="bg-[#FFF7E8] border-b border-[#FDE3B7] px-4 py-1.5 text-xs text-[#D99520] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>MOCK MODE:</strong> Running on deterministic Indic fixtures. Set GNANI_API_KEY in .env for live Vachana platform synthesis.
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">v0.2.0 • Pro Workbench</span>
        </div>
      )}

      {/* Global Top Navigation Bar (64px) — Exact Match to Reference Images A & B */}
      <header className="bg-white border-b border-[#E7ECF3] h-16 sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="w-full px-5 h-full flex items-center justify-between gap-4">
          {/* Left: SvaraLens Logo, Name, PRO Badge, Subtitle */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              onClick={() => setCurrentView('workbench')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              {/* Waveform Logo Icon (Reference Images) */}
              <div className="w-8 h-8 rounded-lg bg-[#3867E8] text-white flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M4 10a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1zm4-4a1 1 0 0 0-1 1v10a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1zm4-3a1 1 0 0 0-1 1v16a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1zm4 5a1 1 0 0 0-1 1v10a1 1 0 0 0 2 0V9a1 1 0 0 0-1-1zm4 3a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1z" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-[#172033]">
                    SvaraLens
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#7856D9] text-white tracking-wide">
                    PRO
                  </span>
                </div>
                <span className="text-[11px] text-[#64748B] block -mt-0.5">
                  Indic Voice QA
                </span>
              </div>
            </div>
          </div>

          {/* Center: Global Search Bar with ⌘K Badge (Reference Images) */}
          <div
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex-1 max-w-md mx-4 hidden md:flex items-center gap-2 bg-[#F8FAFC] hover:bg-white border border-[#E7ECF3] hover:border-[#3867E8]/40 px-3.5 py-1.5 rounded-lg text-xs text-[#64748B] cursor-pointer transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="flex-1 text-left">Search scenarios, runs or capsules...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono text-[#64748B] border border-[#E7ECF3] shadow-xs">
              ⌘ K
            </kbd>
          </div>

          {/* Right: Gnani Live Status, Nav Tabs, Export, Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Real Gnani Connectivity Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-[#E7ECF3] bg-[#FAFBFD]">
              <span className={`w-2 h-2 rounded-full ${
                health?.gnani_connected
                  ? 'bg-[#16A36A] animate-pulse'
                  : health?.mock_mode
                  ? 'bg-[#D99520]'
                  : 'bg-[#D94848]'
              }`} />
              <span className="text-[#172033] text-[11px]">
                {health?.gnani_connected ? 'Gnani Live' : health?.mock_mode ? 'Mock Mode' : 'Offline'}
              </span>
            </div>

            {/* Nav Tabs */}
            <nav className="flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => setCurrentView('workbench')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentView === 'workbench'
                    ? 'text-[#3867E8] bg-[#EEF4FF] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Workbench</span>
              </button>

              <button
                onClick={() => setCurrentView('analytics')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentView === 'analytics'
                    ? 'text-[#3867E8] bg-[#EEF4FF] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setCurrentView('capsules')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentView === 'capsules'
                    ? 'text-[#3867E8] bg-[#EEF4FF] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Capsules</span>
              </button>
            </nav>

            {/* Export Action */}
            <button
              onClick={handleExportHtml}
              title="Download Release Readiness Report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] text-[#172033] transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Export</span>
            </button>

            {/* User Profile Avatar */}
            <div className="w-8 h-8 rounded-full bg-[#EEF4FF] text-[#3867E8] border border-[#E7ECF3] flex items-center justify-center font-medium text-xs cursor-pointer">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Full-Width Application Area */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentView === 'workbench' && (
          <ProWorkbench
            initialCaseId={activeCaseId}
            onOpenReport={handleExportHtml}
          />
        )}

        {currentView === 'analytics' && (
          <div className="max-w-7xl w-full mx-auto p-6">
            <SuiteDashboard
              onNavigate={(view, id) => {
                if (id) setActiveCaseId(id);
                if (view === 'cases') setCurrentView('workbench');
                else if (view === 'capsules') setCurrentView('capsules');
              }}
            />
          </div>
        )}

        {currentView === 'capsules' && (
          <div className="max-w-7xl w-full mx-auto p-6">
            <CapsuleView
              initialCapsuleId={activeCapsuleId}
              onBack={() => setCurrentView('workbench')}
            />
          </div>
        )}
      </main>

      {/* Global Command Palette (Cmd + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectCase={(id) => {
          setActiveCaseId(id);
          setCurrentView('workbench');
        }}
        onSelectCapsule={(id) => {
          setActiveCapsuleId(id);
          setCurrentView('capsules');
        }}
      />
    </div>
  );
}

export default App;

