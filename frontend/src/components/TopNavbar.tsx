import React from 'react';
import {
  Search, SlidersHorizontal, Phone, Volume2, ShieldCheck,
  AlertTriangle, ExternalLink, Download, Sparkles, Command
} from 'lucide-react';
import { Health } from '../types';

interface TopNavbarProps {
  currentView: string;
  activeCaseId?: string;
  channel: string;
  onChangeChannel: (ch: string) => void;
  selectedModel: string;
  onChangeModel: (m: string) => void;
  onOpenCommandPalette: () => void;
  health: Health | null;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentView,
  activeCaseId,
  channel,
  onChangeChannel,
  selectedModel,
  onChangeModel,
  onOpenCommandPalette,
  health
}) => {
  return (
    <header className="h-14 bg-[#12151C] border-b border-[#262B36] px-4 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Breadcrumbs & Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#9AA3B2] hover:text-[#E6E8EE] cursor-pointer">Insurance Hindi Suite</span>
          <span className="text-[#9AA3B2]/60">/</span>
          <span className="text-[#E6E8EE] font-semibold uppercase">{currentView}</span>
          {activeCaseId && (
            <>
              <span className="text-[#9AA3B2]/60">/</span>
              <span className="px-1.5 py-0.5 rounded bg-[#4F8CFF]/10 text-[#4F8CFF] border border-[#4F8CFF]/30 font-bold">
                {activeCaseId}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Middle: Universal Quick Search (Cmd+K) */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0F1115] hover:bg-[#1A1E27] border border-[#262B36] text-xs text-[#9AA3B2] hover:text-[#E6E8EE] transition-all w-64 shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-[#9AA3B2]" />
          <span className="flex-1 text-left">Search workbench...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-[#1C202B] border border-[#262B36] rounded text-[#9AA3B2]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Channel Switcher, Model Switcher & Status */}
      <div className="flex items-center gap-2.5">
        {/* Channel Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0F1115] border border-[#262B36] rounded-lg px-2 py-1 text-xs font-mono">
          <Phone className="w-3.5 h-3.5 text-[#4F8CFF]" />
          <span className="text-[#9AA3B2] text-[11px] hidden sm:inline">Channel:</span>
          <select
            value={channel}
            onChange={(e) => onChangeChannel(e.target.value)}
            className="bg-transparent text-[#E6E8EE] text-xs outline-none cursor-pointer font-semibold"
          >
            <option value="standard">16kHz Studio</option>
            <option value="pstn_8k">8kHz PSTN (G.711)</option>
            <option value="noisy_telephony">KathBath Noisy (18dB)</option>
          </select>
        </div>

        {/* Global ASR Model Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#0F1115] border border-[#262B36] rounded-lg px-2 py-1 text-xs font-mono">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span className="text-[#9AA3B2] text-[11px]">Engine:</span>
          <select
            value={selectedModel}
            onChange={(e) => onChangeModel(e.target.value)}
            className="bg-transparent text-[#E6E8EE] text-xs outline-none cursor-pointer font-semibold"
          >
            <option value="prisma-v2.5">Gnani Prisma v2.5</option>
            <option value="prisma-v3.0">Gnani Prisma v3.0 (Frontier)</option>
            <option value="whisper-large-v3">OpenAI Whisper v3</option>
            <option value="saaras-v1">Sarvam Saaras v1</option>
          </select>
        </div>

        {/* Health / Live Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono">
          {health?.mock_mode ? (
            <span className="flex items-center gap-1 text-[#F5A524] border-[#F5A524]/30 bg-[#F5A524]/10">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[11px]">Mock Fixtures</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#2FBF71]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FBF71] animate-pulse"></span>
              <span className="text-[11px]">Live Vachana</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
