import React, { useEffect, useState } from 'react';
import { fetchHealth } from './api/client';
import { Health } from './types';
import { SuiteDashboard } from './pages/SuiteDashboard';
import { TestCaseStudio } from './pages/TestCaseStudio';
import { RunAnalysis } from './pages/RunAnalysis';
import { ReviewStudio } from './pages/ReviewStudio';
import { CapsuleView } from './pages/CapsuleView';
import {
  Layers, Headphones, FileBox, LayoutDashboard, ShieldCheck,
  AlertTriangle, Volume2, Sparkles, Activity
} from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'cases' | 'run' | 'review' | 'capsules'>('dashboard');
  const [activeCaseId, setActiveCaseId] = useState<string | undefined>('TC-014');
  const [activeRunId, setActiveRunId] = useState<string | undefined>();
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | undefined>();
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Backend offline or health check failed', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E6E8EE] flex flex-col font-sans">
      {/* Persistent Mock Mode Banner per Master Build Document FR-12 */}
      {health?.mock_mode && (
        <div className="bg-[#F5A524]/10 border-b border-[#F5A524]/30 px-4 py-1.5 text-xs font-mono text-[#F5A524] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>MOCK MODE ACTIVE:</strong> Using deterministic Indic test fixtures (Gnani Timbre v2.5 / Prisma v2.5 models). Set GNANI_API_KEY in .env to engage live platform endpoints.
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] opacity-80">v0.1.0 • Challenge Harvester</span>
        </div>
      )}

      {/* Primary Top Header */}
      <header className="bg-[#171A21] border-b border-[#262B36] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-md bg-[#4F8CFF] flex items-center justify-center font-bold text-white shadow-sm group-hover:bg-[#3D78E6] transition-colors">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-[#E6E8EE] group-hover:text-white transition-colors">
                  Svara<span className="text-[#4F8CFF]">Lens</span>
                </span>
                <span className="hidden md:inline ml-2 text-[11px] font-mono text-[#9AA3B2] border-l border-[#262B36] pl-2">
                  Indic Voice QA Evidence & Regression Workbench
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-[#0F1115] text-[#4F8CFF] border border-[#262B36] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#262B36]/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Suite Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentView('cases')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                currentView === 'cases'
                  ? 'bg-[#0F1115] text-[#4F8CFF] border border-[#262B36] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#262B36]/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Case Studio</span>
            </button>

            {activeRunId && (
              <button
                onClick={() => setCurrentView('run')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  currentView === 'run'
                    ? 'bg-[#0F1115] text-[#4F8CFF] border border-[#262B36] font-semibold'
                    : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#262B36]/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Run Analysis</span>
              </button>
            )}

            {activeRunId && (
              <button
                onClick={() => setCurrentView('review')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  currentView === 'review'
                    ? 'bg-[#0F1115] text-[#A78BFA] border border-[#262B36] font-semibold'
                    : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#262B36]/50'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Review Studio</span>
              </button>
            )}

            <button
              onClick={() => setCurrentView('capsules')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                currentView === 'capsules'
                  ? 'bg-[#0F1115] text-[#4F8CFF] border border-[#262B36] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#262B36]/50'
              }`}
            >
              <FileBox className="w-3.5 h-3.5" />
              <span>Defect Capsules</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentView === 'dashboard' && (
          <SuiteDashboard
            onNavigate={(view, id) => {
              if (view === 'cases') {
                if (id) setActiveCaseId(id);
                setCurrentView('cases');
              } else if (view === 'capsules') {
                if (id) setActiveCapsuleId(id);
                setCurrentView('capsules');
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

      {/* Developer Tool Footer */}
      <footer className="border-t border-[#262B36] bg-[#171A21] py-3 text-center text-xs font-mono text-[#9AA3B2]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>SvaraLens Indic Voice QA & Regression Workbench</span>
          <span className="text-[#4F8CFF]">Models: Timbre v2.5 (TTS) • Prisma v2.5 (ASR)</span>
          <span>Target Deadline: 10 Nov 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
