import React, { useEffect, useState } from 'react';
import { Capsule, RegressionRun } from '../types';
import { fetchCapsules, fetchCapsule, rerunRegression, approveRegression } from '../api/client';
import { CapsuleCard } from '../components/CapsuleCard';
import { BeforeAfterTable } from '../components/BeforeAfterTable';
import { StatusPill } from '../components/StatusPill';
import {
  FileBox, Play, Upload, CheckCircle2, RotateCw, ArrowLeft, Loader2, Sparkles
} from 'lucide-react';

interface CapsuleViewProps {
  initialCapsuleId?: string;
  onBack: () => void;
}

export const CapsuleView: React.FC<CapsuleViewProps> = ({ initialCapsuleId, onBack }) => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [latestRegression, setLatestRegression] = useState<RegressionRun | null>(null);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      const data = await fetchCapsules();
      setCapsules(data);
      if (initialCapsuleId) {
        const found = data.find(c => c.id === initialCapsuleId);
        if (found) setSelectedCapsule(found);
      } else if (data.length > 0) {
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

  const handleRerun = async (generate: boolean, file?: File) => {
    if (!selectedCapsule) return;
    try {
      setRerunning(true);
      const res = await rerunRegression(selectedCapsule.id, generate, file);
      setLatestRegression(res);
      // Refresh capsule status
      const updated = await fetchCapsule(selectedCapsule.id);
      setSelectedCapsule(updated);
    } catch (e) {
      alert(`Regression run failed: ${e instanceof Error ? e.message : String(e)}`);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262B36]">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-mono text-[#9AA3B2] hover:text-[#E6E8EE] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Suite Dashboard</span>
          </button>
          <h1 className="text-xl font-bold text-[#E6E8EE] flex items-center gap-2">
            <FileBox className="w-5 h-5 text-[#4F8CFF]" />
            <span>Voice Defect Capsules & Regression Workbench</span>
          </h1>
          <p className="text-xs text-[#9AA3B2] mt-0.5">
            Cryptographically anchored defect records (audio SHA-256) compiled into repeatable regression assertions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Capsule Ledger List */}
        <div className="lg:col-span-4 bg-[#171A21] border border-[#262B36] rounded-lg p-4 flex flex-col h-[700px]">
          <div className="pb-3 border-b border-[#262B36] mb-3">
            <h2 className="text-sm font-semibold text-[#E6E8EE]">Compiled Defect Capsules ({capsules.length})</h2>
            <p className="text-[11px] text-[#9AA3B2]">Immutable QA test assets</p>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {capsules.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#9AA3B2]">
                No capsules compiled yet. Confirm a defect in Case Studio to compile a capsule.
              </div>
            ) : (
              capsules.map((cap) => {
                const isSelected = selectedCapsule?.id === cap.id;
                return (
                  <div
                    key={cap.id}
                    onClick={() => { setSelectedCapsule(cap); setLatestRegression(null); }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#0F1115] border-[#4F8CFF] shadow-sm'
                        : 'bg-[#171A21]/50 border-[#262B36] hover:border-[#4F8CFF]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#4F8CFF]">{cap.id}</span>
                      <StatusPill status={cap.state} size="sm" />
                    </div>
                    <div className="text-xs font-mono font-medium text-[#F04D4D] mb-1">
                      {cap.defect_type}
                    </div>
                    <div className="text-[11px] font-mono text-[#9AA3B2] truncate">
                      Case: {cap.case_id}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Capsule Details & Regression Test Runner */}
        <div className="lg:col-span-8 space-y-5">
          {selectedCapsule ? (
            <>
              {/* Capsule Card */}
              <CapsuleCard capsule={selectedCapsule} />

              {/* Rerun Regression Controls Card */}
              <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#E6E8EE] flex items-center gap-2">
                      <RotateCw className="w-4 h-4 text-[#4F8CFF]" />
                      <span>Rerun Regression Against Replacement Audio</span>
                    </h3>
                    <p className="text-xs text-[#9AA3B2] mt-0.5">
                      Verify that developer fixes resolve the defect without introducing regression anomalies.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleRerun(true)}
                    disabled={rerunning}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] disabled:opacity-50 text-white transition-colors shadow-sm"
                  >
                    {rerunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>Rerun with Corrected Timbre Speech</span>
                  </button>

                  <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded bg-[#0F1115] hover:bg-[#262B36] text-[#E6E8EE] border border-[#262B36] cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#9AA3B2]" />
                    <span>Upload Replacement WAV</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleRerun(false, e.target.files[0]);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Latest Regression Run Comparison Table */}
              {latestRegression && (
                <BeforeAfterTable
                  assertions={latestRegression.assertion_results}
                  verdict={latestRegression.verdict}
                  onApprove={handleApprove}
                />
              )}
            </>
          ) : (
            <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-12 text-center text-[#9AA3B2] font-mono">
              Select a capsule to view its regression assertions and replay against replacement audio.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
