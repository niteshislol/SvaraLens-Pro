import React, { useEffect, useState } from 'react';
import { fetchHealth, fetchTestCases, loginUser, logoutUser, getStoredUser } from './api/client';
import { Health, TestCase } from './types';
import { ProWorkbench } from './pages/ProWorkbench';
import { SuiteDashboard } from './pages/SuiteDashboard';
import { CapsuleView } from './pages/CapsuleView';
import { RunAnalysis } from './pages/RunAnalysis';
import { CommandPalette } from './components/CommandPalette';
import {
  Activity, Search, Download, AlertTriangle, Layers,
  BarChart3, User, Sparkles, Home, Headphones, Shield, LogOut
} from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'workbench' | 'run-analysis' | 'analytics' | 'capsules'>('workbench');
  const [activeCaseId, setActiveCaseId] = useState<string>('TC-014');
  const [activeRunId, setActiveRunId] = useState<string>('RUN-5FBC1D92');
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | undefined>();
  const [health, setHealth] = useState<Health | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(
    getStoredUser() || { username: 'admin', role: 'ADMIN' }
  );

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

  const handleSwitchRole = async (username: string, pass: string, roleName: string) => {
    try {
      await loginUser(username, pass);
      setCurrentUser({ username, role: roleName });
      setShowUserMenu(false);
    } catch (err) {
      alert(`Role switch notice: ${err}`);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#172033] flex flex-col font-sans selection:bg-[#EEF4FF] selection:text-[#3867E8]">
      {/* Mock Mode vs Live Provider Banner */}
      {health?.mock_mode ? (
        <div className="bg-[#FFF7E8] border-b border-[#FDE3B7] px-4 py-1.5 text-xs text-[#D99520] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>MOCK MODE (SYNTHETIC HARMONIC TONES):</strong> Audio generated with deterministic synthetic tones for offline tests. Real Gnani Timbre & Prisma models are NOT in use.
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">v0.2.0 • Pro Workbench</span>
        </div>
      ) : health?.provider_verified ? (
        <div className="bg-[#F0FDF4] border-b border-[#DCFCE7] px-4 py-1 text-xs text-[#16A36A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#16A36A]" />
            <span>
              <strong>GNANI LIVE VERIFIED:</strong> Live Timbre synthesis & Prisma Dual-ASR Jury active ({health.provider_detail}).
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#16A36A]/80">Timbre v3.0 • Prisma v3.0</span>
        </div>
      ) : null}

      {/* Global Top Navigation Bar (64px) — Exact Match to Reference Images A & B */}
      <header className="bg-white border-b border-[#E7ECF3] h-16 shrink-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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
                health?.provider_verified
                  ? 'bg-[#16A36A] animate-pulse'
                  : health?.gnani_connected
                  ? 'bg-[#3867E8]'
                  : health?.mock_mode
                  ? 'bg-[#D99520]'
                  : 'bg-[#D94848]'
              }`} />
              <span className="text-[#172033] text-[11px]">
                {health?.provider_verified
                  ? 'Gnani Live (Verified)'
                  : health?.gnani_connected
                  ? 'Gnani Connected'
                  : health?.mock_mode
                  ? 'Mock Mode (Synthetic)'
                  : 'Offline'}
              </span>
            </div>

            {/* Nav Tabs */}
            <nav className="flex items-center gap-1 text-xs font-medium">
              <a
                href="/"
                title="Go to SvaraLens Landing Page"
                className="px-2.5 py-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Landing</span>
              </a>

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
                onClick={() => setCurrentView('run-analysis')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentView === 'run-analysis'
                    ? 'text-[#3867E8] bg-[#EEF4FF] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Run Analysis</span>
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

            {/* User Profile Avatar & Session Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E7ECF3] bg-[#FAFBFD] hover:bg-white text-xs font-medium cursor-pointer transition-colors"
                title="Authenticated User Profile"
              >
                <div className="w-5 h-5 rounded-full bg-[#EEF4FF] text-[#3867E8] flex items-center justify-center font-bold text-[10px]">
                  {currentUser?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <span className="text-[#172033] text-[11px] font-semibold">
                  {currentUser?.username || 'admin'}
                </span>
                <span className="text-[10px] text-[#64748B] bg-[#EEF4FF] px-1 py-0.2 rounded font-mono">
                  {currentUser?.role || 'ADMIN'}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E7ECF3] rounded-xl shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-[#E7ECF3] text-[11px]">
                    <div className="font-semibold text-[#172033]">{currentUser?.username}</div>
                    <div className="text-[#64748B] text-[10px]">Org: org-default • Role: {currentUser?.role}</div>
                  </div>

                  <div className="px-3 py-1 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    Switch Role (Internal Pilot)
                  </div>

                  <button
                    onClick={() => handleSwitchRole('admin', 'AdminPassword@123!', 'ADMIN')}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-[#F8FAFC] text-[#172033] flex items-center justify-between"
                  >
                    <span>Administrator</span>
                    <span className="text-[10px] font-mono text-[#64748B]">ADMIN</span>
                  </button>

                  <button
                    onClick={() => handleSwitchRole('qalead', 'LeadPassword@123!', 'QA_LEAD')}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-[#F8FAFC] text-[#172033] flex items-center justify-between"
                  >
                    <span>QA Lead</span>
                    <span className="text-[10px] font-mono text-[#64748B]">QA_LEAD</span>
                  </button>

                  <button
                    onClick={() => handleSwitchRole('reviewer', 'ReviewerPassword@123!', 'QA_REVIEWER')}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-[#F8FAFC] text-[#172033] flex items-center justify-between"
                  >
                    <span>QA Reviewer</span>
                    <span className="text-[10px] font-mono text-[#64748B]">QA_REVIEWER</span>
                  </button>

                  <button
                    onClick={() => handleSwitchRole('auditor', 'AuditorPassword@123!', 'AUDITOR')}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-[#F8FAFC] text-[#172033] flex items-center justify-between"
                  >
                    <span>Auditor (Read-Only)</span>
                    <span className="text-[10px] font-mono text-[#64748B]">AUDITOR</span>
                  </button>

                  <div className="border-t border-[#E7ECF3] pt-1">
                    <button
                      onClick={() => {
                        logoutUser();
                        setCurrentUser(null);
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded hover:bg-[#FFF5F5] text-[#D94848] flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Full-Width Application Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {currentView === 'workbench' && (
          <ProWorkbench
            initialCaseId={activeCaseId}
            onOpenReport={handleExportHtml}
            onNavigateToRunAnalysis={(runId) => {
              setActiveRunId(runId);
              setCurrentView('run-analysis');
            }}
          />
        )}

        {currentView === 'run-analysis' && (
          <div className="flex-1 overflow-y-auto overscroll-y-contain p-6 bg-[#F8FAFC]">
            <div className="max-w-6xl w-full mx-auto bg-white border border-[#E7ECF3] rounded-2xl p-6 shadow-sm">
              <RunAnalysis
                runId={activeRunId}
                onNavigateToReview={(runId) => {
                  setActiveRunId(runId);
                  setCurrentView('run-analysis');
                }}
                onNavigateToCapsule={(capsuleId) => {
                  setActiveCapsuleId(capsuleId);
                  setCurrentView('capsules');
                }}
                onBack={() => setCurrentView('workbench')}
              />
            </div>
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="flex-1 overflow-y-auto overscroll-y-contain p-6">
            <div className="max-w-7xl w-full mx-auto">
              <SuiteDashboard
                onNavigate={(view, id) => {
                  if (id) setActiveCaseId(id);
                  if (view === 'cases') setCurrentView('workbench');
                  else if (view === 'capsules') setCurrentView('capsules');
                }}
              />
            </div>
          </div>
        )}

        {currentView === 'capsules' && (
          <div className="flex-1 overflow-y-auto overscroll-y-contain p-6">
            <div className="max-w-7xl w-full mx-auto">
              <CapsuleView
                initialCapsuleId={activeCapsuleId}
                onBack={() => setCurrentView('workbench')}
              />
            </div>
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
