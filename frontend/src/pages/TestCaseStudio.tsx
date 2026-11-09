import React, { useEffect, useState } from 'react';
import { TestCase } from '../types';
import { fetchTestCases, fetchTestCase, triggerGenerateRun, uploadAudioRun, createTestCase, importCasesCsv } from '../api/client';
import { StatusPill } from '../components/StatusPill';
import {
  Play, Upload, Plus, AlertCircle, Sparkles, Layers,
  ChevronRight, ArrowRight, Loader2, Check
} from 'lucide-react';

interface TestCaseStudioProps {
  initialCaseId?: string;
  onNavigateToRun: (runId: string) => void;
}

export const TestCaseStudio: React.FC<TestCaseStudioProps> = ({ initialCaseId, onNavigateToRun }) => {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [injectFault, setInjectFault] = useState<string>('END_TRUNCATION');
  const [showNewModal, setShowNewModal] = useState(false);

  // New Case Form State
  const [newScenario, setNewScenario] = useState('');
  const [newLanguage, setNewLanguage] = useState<'hi-IN' | 'hinglish'>('hi-IN');
  const [newReferenceText, setNewReferenceText] = useState('');
  const [newCriticalPhrases, setNewCriticalPhrases] = useState('₹4,250, 12 नवंबर, विलंब शुल्क');
  const [newSeverity, setNewSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('CRITICAL');

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await fetchTestCases('suite-insurance-hi');
      setCases(data);
      if (initialCaseId) {
        const found = data.find(c => c.id === initialCaseId);
        if (found) setSelectedCase(found);
      } else if (data.length > 0) {
        setSelectedCase(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [initialCaseId]);

  const handleGenerate = async (fault?: string) => {
    if (!selectedCase) return;
    try {
      setGenerating(true);
      const res = await triggerGenerateRun(selectedCase.id, fault);
      onNavigateToRun(res.run_id);
    } catch (e) {
      alert(`Synthesis failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCase || !e.target.files?.[0]) return;
    try {
      setGenerating(true);
      const file = e.target.files[0];
      const res = await uploadAudioRun(selectedCase.id, file);
      onNavigateToRun(res.run_id);
    } catch (e) {
      alert(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCsvUploading(true);
      const res = await importCasesCsv(file, 'suite-insurance-hi');
      alert(`Successfully imported ${res.imported} test case(s).${res.errors && res.errors.length > 0 ? ` Warnings/Errors: ${res.errors.join(', ')}` : ''}`);
      await loadCases();
    } catch (err) {
      alert(`CSV import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCsvUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const phrases = newCriticalPhrases.split(',').map(p => ({
        text: p.trim(),
        variants: [],
        severity: newSeverity
      })).filter(p => p.text.length > 0);

      const created = await createTestCase({
        suite_id: 'suite-insurance-hi',
        scenario: newScenario,
        language: newLanguage,
        reference_text: newReferenceText,
        critical_phrases: phrases,
        severity: newSeverity,
        channel: 'standard'
      });

      setShowNewModal(false);
      await loadCases();
      setSelectedCase(created);
    } catch (err) {
      alert(`Failed to create test case: ${err}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Test Cases List */}
      <div className="lg:col-span-4 bg-[#171A21] border border-[#262B36] rounded-lg p-4 flex flex-col h-[750px]">
        <div className="flex items-center justify-between pb-3 border-b border-[#262B36] mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#E6E8EE]">Test Cases ({cases.length})</h2>
            <p className="text-[11px] text-[#9AA3B2]">Insurance Hindi Suite</p>
          </div>

          <div className="flex items-center gap-2">
            <label
              title="Import CSV test cases"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-[#0F1115] hover:bg-[#262B36] text-[#E6E8EE] border border-[#262B36] cursor-pointer transition-colors"
            >
              {csvUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#9AA3B2]" />}
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleCsvImport} disabled={csvUploading} className="hidden" />
            </label>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {cases.map((c) => {
            const isSelected = selectedCase?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#0F1115] border-[#4F8CFF] shadow-sm'
                    : 'bg-[#171A21]/50 border-[#262B36] hover:border-[#4F8CFF]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-[#4F8CFF]">{c.id}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase border ${
                    c.severity === 'CRITICAL'
                      ? 'bg-[#F04D4D]/10 text-[#F04D4D] border-[#F04D4D]/30'
                      : 'bg-[#0F1115] text-[#9AA3B2] border-[#262B36]'
                  }`}>
                    {c.severity}
                  </span>
                </div>
                <div className="text-xs font-medium text-[#E6E8EE] line-clamp-1 mb-1">
                  {c.scenario}
                </div>
                <div className="text-[11px] text-[#9AA3B2] line-clamp-1 font-devanagari">
                  {c.reference_text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Case Details & Action Trigger */}
      <div className="lg:col-span-8 space-y-6">
        {selectedCase ? (
          <div className="space-y-5">
            {/* Header Card */}
            <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-base font-bold text-[#4F8CFF]">{selectedCase.id}</span>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#0F1115] border border-[#262B36] text-[#9AA3B2]">
                      {selectedCase.language}
                    </span>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#0F1115] border border-[#262B36] text-[#9AA3B2]">
                      {selectedCase.channel}
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-[#E6E8EE]">{selectedCase.scenario}</h1>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono uppercase px-2 py-1 rounded bg-[#F04D4D]/10 border border-[#F04D4D]/30 text-[#F04D4D] font-bold">
                    {selectedCase.severity} SEVERITY
                  </span>
                </div>
              </div>

              {/* Reference Script */}
              <div className="bg-[#0F1115] border border-[#262B36] rounded-md p-4 mb-4">
                <div className="text-xs uppercase font-mono tracking-wider text-[#9AA3B2] mb-1.5 flex items-center justify-between">
                  <span>Reference Spoken Text (Ground Truth)</span>
                  <span className="text-[10px] text-[#4F8CFF]">{selectedCase.reference_text.length} chars</span>
                </div>
                <p className="text-sm font-devanagari text-[#E6E8EE] leading-relaxed">
                  {selectedCase.reference_text}
                </p>
              </div>

              {/* Critical Phrases */}
              <div className="mb-5">
                <div className="text-xs font-mono text-[#9AA3B2] mb-2 uppercase tracking-wider">
                  Mandatory Critical Phrases ({selectedCase.critical_phrases.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.critical_phrases.map((cp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-[#0F1115] border border-[#262B36] text-[#E6E8EE]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F8CFF]" />
                      <span className="font-devanagari">{cp.text}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Generation Controls / Pipeline Execution */}
              <div className="pt-4 border-t border-[#262B36] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleGenerate(selectedCase.id === 'TC-014' ? injectFault : undefined)}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] disabled:opacity-50 text-white transition-colors shadow-sm"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>Generate with Timbre v2.5</span>
                  </button>

                  <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded bg-[#0F1115] hover:bg-[#262B36] text-[#E6E8EE] border border-[#262B36] cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#9AA3B2]" />
                    <span>Upload Audio</span>
                    <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Injected Fault Toggle for Demo */}
                {selectedCase.id === 'TC-014' && (
                  <div className="flex items-center gap-2 bg-[#0F1115] border border-[#262B36] px-3 py-1.5 rounded text-xs">
                    <span className="text-[#F5A524] font-mono font-medium">Demo Mode:</span>
                    <select
                      value={injectFault}
                      onChange={(e) => setInjectFault(e.target.value)}
                      className="bg-transparent text-[#E6E8EE] text-xs font-mono outline-none"
                    >
                      <option value="END_TRUNCATION">Injected Test Fault (Truncation)</option>
                      <option value="FIXED">Clean Baseline Speech</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-12 text-center text-[#9AA3B2]">
            Select a test case to view specifications or create a new test case.
          </div>
        )}
      </div>

      {/* New Test Case Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#171A21] border border-[#262B36] rounded-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#E6E8EE]">Create New QA Test Case</h3>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#9AA3B2] mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Life Insurance Policy Maturity Notice"
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#262B36] rounded px-3 py-2 text-xs text-[#E6E8EE] outline-none focus:border-[#4F8CFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#9AA3B2] mb-1">Language</label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value as any)}
                    className="w-full bg-[#0F1115] border border-[#262B36] rounded px-3 py-2 text-xs text-[#E6E8EE] outline-none"
                  >
                    <option value="hi-IN">Hindi (hi-IN)</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#9AA3B2] mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full bg-[#0F1115] border border-[#262B36] rounded px-3 py-2 text-xs text-[#E6E8EE] outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9AA3B2] mb-1">Reference Spoken Text</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter expected Indic speech text..."
                  value={newReferenceText}
                  onChange={(e) => setNewReferenceText(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#262B36] rounded px-3 py-2 text-xs text-[#E6E8EE] outline-none font-devanagari focus:border-[#4F8CFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9AA3B2] mb-1">Critical Phrases (comma separated)</label>
                <input
                  type="text"
                  placeholder="₹10,000, 15 अगस्त, नो क्लेम बोनस"
                  value={newCriticalPhrases}
                  onChange={(e) => setNewCriticalPhrases(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#262B36] rounded px-3 py-2 text-xs text-[#E6E8EE] outline-none font-devanagari"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262B36]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs text-[#9AA3B2] hover:text-[#E6E8EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#4F8CFF] hover:bg-[#3D78E6] text-white"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
