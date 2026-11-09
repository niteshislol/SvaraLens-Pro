import React, { useEffect, useState } from 'react';
import { fetchHealth, fetchTestCases, fetchCapsules } from './api/client';
import { Health, TestCase, Capsule } from './types';
import { Sidebar, NavView } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { CommandPalette } from './components/CommandPalette';
import { SuiteDashboard } from './pages/SuiteDashboard';
import { TestCaseStudio } from './pages/TestCaseStudio';
import { RunAnalysis } from './pages/RunAnalysis';
import { ReviewStudio } from './pages/ReviewStudio';
import { CapsuleView } from './pages/CapsuleView';
import { MultiModelArena } from './pages/MultiModelArena';
import { BenchmarkMatrix } from './pages/BenchmarkMatrix';
import { AlertTriangle } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<NavView>('arena');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global settings state
  const [channel, setChannel] = useState<string>('pstn_8k');
  const [selectedModel, setSelectedModel] = useState<string>('prisma-v2.5');

  // Active items
  const [activeCaseId, setActiveCaseId] = useState<string | undefined>('TC-014');
  const [activeRunId, setActiveRunId] = useState<string | undefined>();
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | undefined>();

  // Global data caches
  const [health, setHealth] = useState<Health | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Backend offline or health check failed', err));

    fetchTestCases('suite-insurance-hi')
      .then(setCases)
      .catch(console.error);

    fetchCapsules()
      .then(setCapsules)
      .catch(console.error);
  }, []);

  const openCapsulesCount = capsules.filter(c => c.state === 'OPEN').length;

  return (
    <div className="h-screen w-screen bg-[#0A0C10] text-[#E6E8EE] flex overflow-hidden font-sans selection:bg-[#4F8CFF] selection:text-white">
      {/* Universal Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(view, id) => {
          setCurrentView(view);
          if (view === 'cases' && id) setActiveCaseId(id);
          if (view === 'capsules' && id) setActiveCapsuleId(id);
        }}
        cases={cases}
        capsules={capsules}
      />

      {/* Left Sidebar Rail */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeRunId={activeRunId}
        openCapsulesCount={openCapsulesCount}
        totalCasesCount={cases.length}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0A0C10]">
        {/* Top Navbar */}
        <TopNavbar
          currentView={currentView}
          activeCaseId={activeCaseId}
          channel={channel}
          onChangeChannel={setChannel}
          selectedModel={selectedModel}
          onChangeModel={setSelectedModel}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          health={health}
        />

        {/* Mock Mode Banner if Active */}
        {health?.mock_mode && (
          <div className="bg-[#F5A524]/10 border-b border-[#F5A524]/30 px-4 py-1 text-xs font-mono text-[#F5A524] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>MOCK FIXTURES MODE:</strong> Using deterministic Indic test audio. Set GNANI_API_KEY in .env for live platform endpoints.
              </span>
            </div>
            <span className="text-[10px] opacity-75 hidden sm:inline">v2.0 • Workbench Active</span>
          </div>
        )}

        {/* Scrollable Main Workspace View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          {currentView === 'arena' && (
            <MultiModelArena
              onNavigateToReview={(runId) => {
                setActiveRunId(runId);
                setCurrentView('review');
              }}
              onNavigateToCapsule={(capId) => {
                setActiveCapsuleId(capId);
                setCurrentView('capsules');
              }}
            />
          )}

          {currentView === 'benchmarks' && (
            <BenchmarkMatrix />
          )}

          {currentView === 'dashboard' && (
            <SuiteDashboard
              onNavigate={(view, id) => {
                if (view === 'cases') {
                  if (id) setActiveCaseId(id);
                  setCurrentView('cases');
                } else if (view === 'capsules') {
                  if (id) setActiveCapsuleId(id);
                  setCurrentView('capsules');
                } else if (view === 'arena') {
                  setCurrentView('arena');
                } else if (view === 'benchmarks') {
                  setCurrentView('benchmarks');
                }
              }}
            />
          )}

          {currentView === 'cases' && (
            <TestCaseStudio
              initialCaseId={activeCaseId}
              onNavigateToRun={(runId) => {
                setActiveRunId(runId);
                setCurrentView('run');
              }}
            />
          )}

          {currentView === 'run' && activeRunId && (
            <RunAnalysis
              runId={activeRunId}
              onNavigateToReview={(runId) => {
                setActiveRunId(runId);
                setCurrentView('review');
              }}
              onNavigateToCapsule={(capsuleId) => {
                setActiveCapsuleId(capsuleId);
                setCurrentView('capsules');
              }}
              onBack={() => setCurrentView('cases')}
            />
          )}

          {currentView === 'review' && activeRunId && (
            <ReviewStudio
              runId={activeRunId}
              onNavigateToRun={(runId) => {
                setActiveRunId(runId);
                setCurrentView('run');
              }}
              onNavigateToCapsule={(capsuleId) => {
                setActiveCapsuleId(capsuleId);
                setCurrentView('capsules');
              }}
            />
          )}

          {currentView === 'capsules' && (
            <CapsuleView
              initialCapsuleId={activeCapsuleId}
              onBack={() => setCurrentView('dashboard')}
            />
          )}
        </main>

        {/* Global Workbench Status Footer */}
        <footer className="h-8 border-t border-[#262B36] bg-[#12151C] px-4 flex items-center justify-between text-[11px] font-mono text-[#9AA3B2] shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#E6E8EE]">SvaraLens v2.0 Workbench</span>
            <span className="hidden sm:inline text-[#262B36]">|</span>
            <span className="hidden sm:inline">NIST Aggregate WER Metric</span>
            <span className="hidden sm:inline text-[#262B36]">|</span>
            <span className="hidden sm:inline">G.711 Telephony DSP Active</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#4F8CFF]">Press ⌘K for search</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
