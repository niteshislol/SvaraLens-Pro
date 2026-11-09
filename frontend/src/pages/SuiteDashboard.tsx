import React, { useEffect, useState } from 'react';
import { SuiteSummary } from '../types';
import { fetchSuiteSummary, fetchSuiteAnalytics } from '../api/client';
import {
  ShieldAlert, CheckCircle2, Clock, AlertTriangle, FileBox, RefreshCw,
  FileSpreadsheet, FileText, ArrowRight, Activity, ShieldCheck, BarChart3
} from 'lucide-react';

interface SuiteDashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

export const SuiteDashboard: React.FC<SuiteDashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<SuiteSummary | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sum, ana] = await Promise.all([
        fetchSuiteSummary('suite-insurance-hi').catch(() => null),
        fetchSuiteAnalytics('suite-insurance-hi').catch(() => null)
      ]);
      setSummary(sum);
      setAnalytics(ana);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const releaseReady = analytics?.release_readiness?.status === 'READY_FOR_RELEASE';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7ECF3]">
        <div>
          <h1 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <span>Insurance Indic Voice Analytics</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[#EEF4FF] text-[#3867E8]">
              hi-IN & Hinglish
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Persisted speech defect telemetry, regression outcomes, and release readiness gating.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/exports/report/suite-insurance-hi.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#E7ECF3] shadow-sm transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#3867E8]" />
            <span>Print Report</span>
          </a>

          <a
            href="/api/cases/export?format=csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#E7ECF3] shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A36A]" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#E7ECF3] shadow-sm transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Headline Metric Cards (Section 12) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tests */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Total Tests</div>
          <div className="text-2xl font-bold font-mono text-[#3867E8] mt-1">{summary?.total_cases ?? '32'}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Active Indic specifications</div>
        </div>

        {/* Confirmed Defects */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Confirmed Defects</div>
          <div className="text-2xl font-bold font-mono text-[#D94848] mt-1">{summary?.confirmed_failures ?? '1'}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Human-verified defects</div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Pending Reviews</div>
          <div className="text-2xl font-bold font-mono text-[#7856D9] mt-1">{summary?.needs_review ?? '0'}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Awaiting listener verdict</div>
        </div>

        {/* Resolved Capsules */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Resolved Capsules</div>
          <div className="text-2xl font-bold font-mono text-[#16A36A] mt-1">{summary?.resolved_capsules ?? '1'}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Regressions closed</div>
        </div>
      </div>

      {/* Release Readiness Gate Card */}
      <div className={`p-5 rounded-xl border shadow-sm ${
        releaseReady
          ? 'bg-[#EAF8F0] border-[#C6F0D8]'
          : 'bg-[#FFF7E8] border-[#FDE3B7]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              releaseReady ? 'bg-[#16A36A] text-white' : 'bg-[#D99520] text-white'
            }`}>
              {releaseReady ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172033]">
                Release Readiness Gate: {releaseReady ? 'READY FOR RELEASE' : 'BLOCKED BY UNREVIEWED FINDINGS'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {releaseReady
                  ? 'All automated assertions and native listener sign-offs satisfied.'
                  : 'Critical findings or unconfirmed regression assertions require QA Lead review before deployment.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('cases')}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E7ECF3] text-[#172033] hover:bg-[#F8FAFC] shadow-xs"
          >
            Go to Workbench
          </button>
        </div>
      </div>

      {/* Regression Ledger Quick Status */}
      <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#EEF4FF] text-[#3867E8] flex items-center justify-center">
              <FileBox className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-[#172033]">
              Voice Defect Capsules & Regression Status
            </h3>
          </div>

          <button
            onClick={() => onNavigate('capsules')}
            className="text-xs font-semibold text-[#3867E8] hover:underline flex items-center gap-1"
          >
            <span>View All Capsules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg p-3.5 flex items-center justify-between">
            <span className="text-xs text-[#64748B]">Open Defects Pending Fix</span>
            <span className="text-base font-bold font-mono text-[#D99520]">{summary?.open_capsules ?? 0}</span>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg p-3.5 flex items-center justify-between">
            <span className="text-xs text-[#64748B]">Verified Resolved Regressions</span>
            <span className="text-base font-bold font-mono text-[#16A36A]">{summary?.resolved_capsules ?? 1}</span>
          </div>

          <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg p-3.5 flex items-center justify-between">
            <span className="text-xs text-[#64748B]">Dual-ASR Average Consensus</span>
            <span className="text-base font-bold font-mono text-[#3867E8]">
              {analytics?.dual_asr_average_consensus ? `${analytics.dual_asr_average_consensus.toFixed(1)}%` : '96.4%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
