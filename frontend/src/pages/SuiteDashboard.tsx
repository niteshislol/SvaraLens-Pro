import React, { useEffect, useState } from 'react';
import { SuiteSummary } from '../types';
import { fetchSuiteSummary } from '../api/client';
import {
  ShieldAlert, CheckCircle2, Clock, AlertTriangle, FileBox, RefreshCw,
  FileSpreadsheet, FileText, ArrowRight, Activity
} from 'lucide-react';

interface SuiteDashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

export const SuiteDashboard: React.FC<SuiteDashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<SuiteSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await fetchSuiteSummary('suite-insurance-hi');
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262B36]">
        <div>
          <h1 className="text-xl font-bold text-[#E6E8EE] tracking-tight flex items-center gap-2">
            <span>Insurance Hindi Voice Test Suite</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#4F8CFF]/10 text-[#4F8CFF] border border-[#4F8CFF]/30">
              hi-IN & Hinglish
            </span>
          </h1>
          <p className="text-xs text-[#9AA3B2] mt-1">
            Pre-release speech defect capture, audio evidence repository, and reproducible regression test ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/exports/report/suite-insurance-hi.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[#171A21] hover:bg-[#262B36] text-[#E6E8EE] border border-[#262B36] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#4F8CFF]" />
            <span>Printable Report</span>
          </a>

          <a
            href="/api/exports/suite/suite-insurance-hi.csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[#171A21] hover:bg-[#262B36] text-[#E6E8EE] border border-[#262B36] transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2FBF71]" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={loadSummary}
            className="p-1.5 rounded bg-[#171A21] hover:bg-[#262B36] text-[#9AA3B2] hover:text-[#E6E8EE] border border-[#262B36] transition-colors"
            title="Refresh summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#9AA3B2]">Total Test Cases</div>
          <div className="text-2xl font-bold font-mono text-[#4F8CFF] mt-1">{summary?.total_cases ?? '—'}</div>
          <div className="text-[11px] text-[#9AA3B2] mt-1">Active test specifications</div>
        </div>

        <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#9AA3B2]">Automated Pass</div>
          <div className="text-2xl font-bold font-mono text-[#2FBF71] mt-1">{summary?.auto_passed ?? '—'}</div>
          <div className="text-[11px] text-[#9AA3B2] mt-1">Zero automatic findings</div>
        </div>

        <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#9AA3B2]">Needs Human Review</div>
          <div className="text-2xl font-bold font-mono text-[#A78BFA] mt-1">{summary?.needs_review ?? '—'}</div>
          <div className="text-[11px] text-[#9AA3B2] mt-1">Awaiting listener verdict</div>
        </div>

        <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#9AA3B2]">Confirmed Defects</div>
          <div className="text-2xl font-bold font-mono text-[#F04D4D] mt-1">{summary?.confirmed_failures ?? '—'}</div>
          <div className="text-[11px] text-[#9AA3B2] mt-1">Human-verified defects</div>
        </div>
      </div>

      {/* Regression Ledger Quick Status */}
      <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E6E8EE] flex items-center gap-2">
              <FileBox className="w-4 h-4 text-[#4F8CFF]" />
              <span>Voice Defect Capsules & Regression Status</span>
            </h2>
            <p className="text-xs text-[#9AA3B2] mt-0.5">
              Every confirmed defect produces a locked regression test case that is rerun against replacement audio.
            </p>
          </div>

          <button
            onClick={() => onNavigate('capsules')}
            className="text-xs font-medium text-[#4F8CFF] hover:underline flex items-center gap-1"
          >
            <span>View All Capsules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#0F1115]/50 border border-[#262B36] rounded p-3 flex items-center justify-between">
            <span className="text-xs font-mono text-[#9AA3B2]">Open Defects Pending Fix</span>
            <span className="text-sm font-bold font-mono text-[#F5A524]">{summary?.open_capsules ?? 0}</span>
          </div>

          <div className="bg-[#0F1115]/50 border border-[#262B36] rounded p-3 flex items-center justify-between">
            <span className="text-xs font-mono text-[#9AA3B2]">Verified Resolved Regressions</span>
            <span className="text-sm font-bold font-mono text-[#2FBF71]">{summary?.resolved_capsules ?? 0}</span>
          </div>

          <div className="bg-[#0F1115]/50 border border-[#262B36] rounded p-3 flex items-center justify-between">
            <span className="text-xs font-mono text-[#9AA3B2]">Reopened Regressions</span>
            <span className="text-sm font-bold font-mono text-[#F04D4D]">{summary?.reopened_capsules ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Primary Workflow Call to Action */}
      <div className="bg-gradient-to-r from-[#171A21] to-[#1F232D] border border-[#262B36] rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#4F8CFF] font-semibold">Ready for Demo & QA</span>
          <h3 className="text-base font-bold text-[#E6E8EE] mt-0.5">Test Case TC-014: Insurance Premium Reminder</h3>
          <p className="text-xs text-[#9AA3B2] mt-1 max-w-xl">
            Reference script contains mandatory date and late fee disclosure. Experience the full detect → review → capsule → regression loop.
          </p>
        </div>

        <button
          onClick={() => onNavigate('cases', 'TC-014')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] text-white transition-colors shadow-sm shrink-0"
        >
          <span>Open Case Studio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
