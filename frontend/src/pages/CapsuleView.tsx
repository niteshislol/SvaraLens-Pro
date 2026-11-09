import React, { useEffect, useState } from 'react';
import { Capsule, RegressionRun } from '../types';
import { fetchCapsules, fetchCapsule, rerunRegression, approveRegression, validateCapsuleIntegrity } from '../api/client';
import {
  Layers, Play, CheckCircle2, RotateCw, ArrowLeft, Loader2, Sparkles,
  Search, ShieldCheck, FileText, Check, AlertTriangle, RefreshCw
} from 'lucide-react';

interface CapsuleViewProps {
  initialCapsuleId?: string;
  onBack: () => void;
}

export const CapsuleView: React.FC<CapsuleViewProps> = ({ initialCapsuleId, onBack }) => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [latestRegression, setLatestRegression] = useState<RegressionRun | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<string | null>(null);
  const [verifyingHash, setVerifyingHash] = useState(false);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      const data = await fetchCapsules();
      setCapsules(data);
      if (initialCapsuleId) {
        const found = data.find(c => c.id === initialCapsuleId);
        if (found) setSelectedCapsule(found);
      } else if (data.length > 0 && !selectedCapsule) {
        setSelectedCapsule(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCapsules();
  }, [initialCapsuleId]);

  const handleVerifyHash = async (id: string) => {
    try {
      setVerifyingHash(true);
      const res = await validateCapsuleIntegrity(id);
      if (res.valid) {
        setIntegrityStatus(`Verified (${res.computed_sha256.substring(0, 16)}...)`);
      } else {
        setIntegrityStatus(`Tamper Detected!`);
      }
    } catch (e) {
      setIntegrityStatus(`Error: ${e}`);
    } finally {
      setVerifyingHash(false);
    }
  };

  const handleRerun = async () => {
    if (!selectedCapsule) return;
    try {
      setRerunning(true);
      const res = await rerunRegression(selectedCapsule.id, true);
      setLatestRegression(res);
      const updated = await fetchCapsule(selectedCapsule.id);
      setSelectedCapsule(updated);
      await loadCapsules();
    } catch (e) {
      alert(`Regression failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRerunning(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCapsule || !latestRegression) return;
    try {
      const res = await approveRegression(selectedCapsule.id, latestRegression.id, 'QA Delivery Lead');
      setLatestRegression(res);
      const updated = await fetchCapsule(selectedCapsule.id);
      setSelectedCapsule(updated);
      await loadCapsules();
    } catch (e) {
      alert(`Approval failed: ${e}`);
    }
  };

  const filteredCapsules = capsules.filter(c =>
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.defect_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7ECF3]">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#172033] mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workbench</span>
          </button>
          <h1 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#3867E8]" />
            <span>Voice Defect Capsule Registry</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[#EEF4FF] text-[#3867E8]">
              {capsules.length} Capsules
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Immutable Indic voice defect evidence locked with SHA-256 audio digests and deterministic regression assertions.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search capsules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E7ECF3] rounded-lg focus:outline-none focus:border-[#3867E8] text-[#172033] shadow-sm"
          />
        </div>
      </div>

      {/* Main 2-Column Registry & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Searchable Table (Section 13) */}
        <div className="lg:col-span-7 bg-white border border-[#E7ECF3] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E7ECF3] bg-[#FAFBFD]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Sealed Defect Assertions Ledger
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E7ECF3] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Capsule ID</th>
                  <th className="px-4 py-2.5">Scenario</th>
                  <th className="px-4 py-2.5">Defect</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7ECF3]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#94A3B8]">
                      Loading capsules...
                    </td>
                  </tr>
                ) : filteredCapsules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#94A3B8]">
                      No capsules found matching "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredCapsules.map((cap) => {
                    const isSelected = selectedCapsule?.id === cap.id;
                    return (
                      <tr
                        key={cap.id}
                        onClick={() => {
                          setSelectedCapsule(cap);
                          setLatestRegression(null);
                          setIntegrityStatus(null);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#EEF4FF]' : 'hover:bg-[#FAFBFD]'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-[#3867E8]">
                          {cap.id}
                        </td>
                        <td className="px-4 py-3 font-mono text-[#172033]">
                          {cap.case_id}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#172033]">
                          {cap.defect_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FFF0F0] text-[#D94848]">
                            {cap.spec.severity || cap.severity || 'HIGH'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cap.state === 'RESOLVED'
                              ? 'bg-[#EAF8F0] text-[#16A36A] border border-[#C6F0D8]'
                              : 'bg-[#FFF7E8] text-[#D99520] border border-[#FDE3B7]'
                          }`}>
                            {cap.state}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Selected Capsule Deep Dive & Regression Runner */}
        <div className="lg:col-span-5 bg-white border border-[#E7ECF3] rounded-xl shadow-sm p-5 space-y-5">
          {selectedCapsule ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7ECF3]">
                <div>
                  <span className="font-mono text-sm font-bold text-[#3867E8]">
                    {selectedCapsule.id}
                  </span>
                  <p className="text-xs font-semibold text-[#172033] mt-0.5">
                    {selectedCapsule.defect_type.replace(/_/g, ' ')}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  selectedCapsule.state === 'RESOLVED'
                    ? 'bg-[#EAF8F0] text-[#16A36A] border border-[#C6F0D8]'
                    : 'bg-[#FFF7E8] text-[#D99520] border border-[#FDE3B7]'
                }`}>
                  {selectedCapsule.state}
                </span>
              </div>

              {/* SHA-256 Card */}
              <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Cryptographic Audio Anchor
                  </span>
                  <button
                    onClick={() => handleVerifyHash(selectedCapsule.id)}
                    disabled={verifyingHash}
                    className="text-[11px] font-medium text-[#3867E8] hover:underline flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify Byte Hash</span>
                  </button>
                </div>
                <p className="font-mono text-[11px] text-[#64748B] break-all">
                  {selectedCapsule.failing_audio_sha256 || selectedCapsule.audio_sha256}
                </p>
                {integrityStatus && (
                  <p className={`text-[11px] font-mono font-medium ${
                    integrityStatus.includes('Verified') ? 'text-[#16A36A]' : 'text-[#D94848]'
                  }`}>
                    {integrityStatus}
                  </p>
                )}
              </div>

              {/* Deterministic Assertions */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Deterministic Machine Assertions ({selectedCapsule.spec.assertions?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedCapsule.spec.assertions?.map((a: any, i: number) => (
                    <div key={i} className="p-2.5 rounded-lg border border-[#E7ECF3] bg-[#FAFBFD] space-y-0.5">
                      <div className="flex items-center justify-between font-mono text-[11px] text-[#3867E8]">
                        <span>{a.id} • {a.type}</span>
                        <span className="text-[#16A36A] font-bold">LOCKED</span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regression Runner Trigger */}
              <div className="pt-3 border-t border-[#E7ECF3] space-y-3">
                <button
                  onClick={handleRerun}
                  disabled={rerunning}
                  className="w-full py-2 bg-[#3867E8] hover:bg-[#2C56CE] disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  {rerunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Re-Synthesizing & Evaluating Assertions...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Run Regression Test</span>
                    </>
                  )}
                </button>

                {latestRegression && (
                  <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E7ECF3] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Regression Verdict:</span>
                      <span className={`font-mono font-bold ${
                        latestRegression.verdict === 'RESOLVED' ? 'text-[#16A36A]' : 'text-[#D99520]'
                      }`}>
                        {latestRegression.verdict}
                      </span>
                    </div>

                    {latestRegression.verdict === 'NEEDS_REVIEW' && (
                      <button
                        onClick={handleApprove}
                        className="w-full py-1.5 bg-[#16A36A] hover:bg-[#128053] text-white font-medium rounded text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Sign-off & Elevate to RESOLVED</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-[#94A3B8] space-y-2">
              <Layers className="w-8 h-8 mx-auto text-[#CBD5E1]" />
              <p>Select a capsule from the ledger to view assertions and run regressions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
