import React from 'react';
import {
  LayoutDashboard, Layers, Activity, Headphones, FileBox,
  Swords, BarChart3, ChevronLeft, ChevronRight, Volume2,
  PhoneCall, ShieldCheck, Sparkles, FolderKanban
} from 'lucide-react';

export type NavView = 'dashboard' | 'arena' | 'benchmarks' | 'cases' | 'run' | 'review' | 'capsules';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeRunId?: string;
  openCapsulesCount?: number;
  totalCasesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapse,
  activeRunId,
  openCapsulesCount = 0,
  totalCasesCount = 19
}) => {
  return (
    <aside
      className={`bg-[#12151C] border-r border-[#262B36] flex flex-col transition-all duration-200 z-30 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-[#262B36] flex items-center justify-between px-3">
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8CFF] to-[#3B6BDC] flex items-center justify-center font-bold text-white shadow-md shadow-[#4F8CFF]/20 group-hover:scale-105 transition-transform shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-[#E6E8EE] flex items-center gap-1.5">
                Svara<span className="text-[#4F8CFF]">Lens</span>
                <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-[#4F8CFF]/20 text-[#4F8CFF] border border-[#4F8CFF]/40">v2.0</span>
              </span>
              <span className="text-[10px] text-[#9AA3B2] truncate font-mono">Indic Voice Workbench</span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1E232E] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Section 1: Explore & Benchmarks */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2] font-semibold">
              Benchmarking & Arena
            </div>
          )}

          <div className="space-y-1">
            <button
              onClick={() => onNavigate('arena')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                currentView === 'arena'
                  ? 'bg-gradient-to-r from-[#4F8CFF]/20 to-transparent text-[#4F8CFF] border-l-2 border-[#4F8CFF] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1A1E27]'
              }`}
              title="Multi-Model Arena"
            >
              <Swords className="w-4 h-4 shrink-0 text-[#4F8CFF]" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Multi-Model Arena</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-[#4F8CFF]/20 text-[#4F8CFF]">A/B</span>
                </div>
              )}
            </button>

            <button
              onClick={() => onNavigate('benchmarks')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                currentView === 'benchmarks'
                  ? 'bg-gradient-to-r from-[#A78BFA]/20 to-transparent text-[#A78BFA] border-l-2 border-[#A78BFA] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1A1E27]'
              }`}
              title="Indic Benchmark Matrix"
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-[#A78BFA]" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Benchmark Matrix</span>
                  <span className="text-[9px] font-mono text-[#9AA3B2]">Research</span>
                </div>
              )}
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-[#4F8CFF]/20 to-transparent text-[#4F8CFF] border-l-2 border-[#4F8CFF] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1A1E27]'
              }`}
              title="Suite Overview"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-[#4F8CFF]" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Suite Overview</span>
                  <span className="text-[10px] font-mono text-[#9AA3B2]">{totalCasesCount}</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Section 2: Core QA Workflow */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2] font-semibold">
              QA Workbench
            </div>
          )}

          <div className="space-y-1">
            <button
              onClick={() => onNavigate('cases')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                currentView === 'cases'
                  ? 'bg-gradient-to-r from-[#4F8CFF]/20 to-transparent text-[#4F8CFF] border-l-2 border-[#4F8CFF] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1A1E27]'
              }`}
              title="Case Studio"
            >
              <Layers className="w-4 h-4 shrink-0 text-[#2FBF71]" />
              {!collapsed && <span>Case Studio</span>}
            </button>

            {activeRunId && (
              <button
                onClick={() => onNavigate('run')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'run'
                    ? 'bg-gradient-to-r from-[#4F8CFF]/20 to-transparent text-[#4F8CFF] border-l-2 border-[#4F8CFF] font-semibold'
                    : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1A1E27]'
                }`}
                title="Run Analysis"
              >
                <Activity className="w-4 h-4 shrink-0 text-[#F5A524]" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>Run Analysis</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F5A524] animate-pulse" />
                  </div>
                )}
              </button>
            )}

            {activeRunId && (
              <button
                onClick={() => onNavigate('review')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'review'
                    ? 'bg-gradient-to-r from-[#A78BFA]/20 to-transparent text-[#A78BFA] border-l-2 border-[#A78BFA] font-semibold'
                    : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1A1E27]'
                }`}
                title="Review Studio"
              >
                <Headphones className="w-4 h-4 shrink-0 text-[#A78BFA]" />
                {!collapsed && <span>Review Studio</span>}
              </button>
            )}

            <button
              onClick={() => onNavigate('capsules')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                currentView === 'capsules'
                  ? 'bg-gradient-to-r from-[#4F8CFF]/20 to-transparent text-[#4F8CFF] border-l-2 border-[#4F8CFF] font-semibold'
                  : 'text-[#9AA3B2] hover:text-[#E6E8EE] hover:bg-[#1A1E27]'
              }`}
              title="Defect Capsules"
            >
              <FileBox className="w-4 h-4 shrink-0 text-[#F04D4D]" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Defect Capsules</span>
                  {openCapsulesCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#F04D4D]/20 text-[#F04D4D] border border-[#F04D4D]/40 font-bold">
                      {openCapsulesCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Section 3: Telephony & Channels Info */}
        {!collapsed && (
          <div className="pt-2 border-t border-[#262B36]/60">
            <div className="px-2 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2] font-semibold">
              Channel Audio DSP
            </div>
            <div className="bg-[#0F1115] border border-[#262B36] rounded-lg p-2.5 text-[11px] space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-[#E6E8EE]">
                <span className="text-[#9AA3B2]">PSTN Codec:</span>
                <span className="text-[#4F8CFF]">G.711 μ-law</span>
              </div>
              <div className="flex items-center justify-between text-[#E6E8EE]">
                <span className="text-[#9AA3B2]">Bandwidth:</span>
                <span className="text-[#2FBF71]">300 - 3400 Hz</span>
              </div>
              <div className="flex items-center justify-between text-[#E6E8EE]">
                <span className="text-[#9AA3B2]">Noise Sim:</span>
                <span className="text-[#F5A524]">KathBath Noisy</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      {!collapsed && (
        <div className="p-3 border-t border-[#262B36] bg-[#0E1015] text-[10px] font-mono text-[#9AA3B2] flex items-center justify-between">
          <span>Engine: Timbre & Prisma</span>
          <span className="text-[#2FBF71] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FBF71] inline-block"></span>
            Online
          </span>
        </div>
      )}
    </aside>
  );
};
