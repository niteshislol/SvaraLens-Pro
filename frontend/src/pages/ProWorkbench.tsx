import React, { useState, useEffect } from 'react';
import { TestCase, Run, Capsule, RegressionRun } from '../types';
import {
  fetchTestCases, fetchRun, triggerGenerateRun, fetchLatestRunForCase,
  createTestCase, importCasesCsv, addDefectPin, removeDefectPin,
  updateFinding, compileCapsule, rerunRegression, approveRegression,
  getAudioUrl, duplicateTestCase, validateCapsuleIntegrity
} from '../api/client';
import { ProWaveformPlayer } from '../components/ProWaveformPlayer';
import { DualAsrJury } from '../components/DualAsrJury';
import { CompactAudioHealth } from '../components/CompactAudioHealth';
import { AudioDetailsDrawer } from '../components/AudioDetailsDrawer';
import {
  Plus, Search, FileText, CheckCircle2, ChevronDown,
  Layers, Pin, ArrowRight, Loader2, RefreshCw, Copy,
  Check, Download, AlertTriangle, ShieldCheck, Sparkles,
  Cpu, Filter
} from 'lucide-react';

interface ProWorkbenchProps {
  initialCaseId?: string;
  onOpenReport?: () => void;
}

export const ProWorkbench: React.FC<ProWorkbenchProps> = ({
  initialCaseId = 'TC-007',
  onOpenReport
}) => {
  // Navigation & Case State
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'ALL' | 'hi-IN' | 'hinglish'>('ALL');
  const [loadingCases, setLoadingCases] = useState(true);

  // Model & Synthesis Arena State
  const [selectedModel, setSelectedModel] = useState<'timbre-v3.0' | 'timbre-v2.5'>('timbre-v3.0');
  const [selectedVoice, setSelectedVoice] = useState<string>('Shivani - Warm & Conversational');
  const [generating, setGenerating] = useState(false);

  // Active Run & Audio Telemetry State
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [highlightRegion, setHighlightRegion] = useState<[number, number] | undefined>();

  // Right Inspector State
  const [rightTab, setRightTab] = useState<'radar' | 'pins' | 'capsule'>('radar');
  const [activeCapsule, setActiveCapsule] = useState<Capsule | null>(null);
  const [regressionRun, setRegressionRun] = useState<RegressionRun | null>(null);
  const [fixedRun, setFixedRun] = useState<Run | null>(null);
  const [compilingCapsule, setCompilingCapsule] = useState(false);
  const [rerunningRegression, setRerunningRegression] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<string | null>(null);
  const [verifyingHash, setVerifyingHash] = useState(false);

  // Modals & Drawers
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [pinTime, setPinTime] = useState<number>(3.2);

  // New Case Form State
  const [newScenario, setNewScenario] = useState('');
  const [newLanguage, setNewLanguage] = useState<'hi-IN' | 'hinglish'>('hi-IN');
  const [newTtsModel, setNewTtsModel] = useState<'timbre-v3.0' | 'timbre-v2.5'>('timbre-v3.0');
  const [newVoice, setNewVoice] = useState('Shivani');
  const [newSeverity, setNewSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [newReferenceText, setNewReferenceText] = useState('');
  const [newCriticalPhrases, setNewCriticalPhrases] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);

  // New Pin Form State
  const [pinCategory, setPinCategory] = useState<string>('END_TRUNCATION');
  const [pinSeverity, setPinSeverity] = useState<string>('CRITICAL');
  const [pinNote, setPinNote] = useState<string>('Audible syllable drop on closing disclosure');

  // Load Test Cases (Latest Scenarios on upper side)
  const loadCases = async () => {
    try {
      setLoadingCases(true);
      const data = await fetchTestCases('suite-insurance-hi');
      const sorted = [...data].sort((a, b) => {
        if (a.created_at && b.created_at) {
          const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (diff !== 0) return diff;
        }
        const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
        return numB - numA;
      });
      setCases(sorted);
      if (sorted.length > 0 && !selectedCaseId) {
        setSelectedCaseId(sorted[0].id);
      }
    } catch (err) {
      console.error('Failed to load test cases', err);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const activeCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  // Auto-set voice & load latest run when changing scenario
  useEffect(() => {
    if (!activeCase) return;
    if (activeCase.tts_model === 'timbre-v2.5') {
      setSelectedModel('timbre-v2.5');
      setSelectedVoice('Nalini - Fluent Telephony');
    } else {
      setSelectedModel('timbre-v3.0');
      setSelectedVoice('Shivani - Warm & Conversational');
    }

    // Automatically load the latest run for this scenario if already synthesized
    fetchLatestRunForCase(activeCase.id)
      .then(run => {
        setActiveRun(run);
        if (run?.findings && run.findings.length > 0) {
          const f = run.findings[0];
          if (f.region_start_s != null && f.region_end_s != null) {
            setHighlightRegion([f.region_start_s, f.region_end_s]);
          }
        } else {
          setHighlightRegion(undefined);
        }
      })
      .catch(() => {
        setActiveRun(null);
        setHighlightRegion(undefined);
      });
  }, [selectedCaseId]);

  // Handle Speech Generation
  const handleGenerate = async () => {
    if (!activeCase) return;
    try {
      setGenerating(true);
      // Clean voice name (strip description)
      const cleanVoice = selectedVoice.split(' - ')[0].trim();
      const res = await triggerGenerateRun(activeCase.id, undefined, selectedModel, cleanVoice);
      const runData = await fetchRun(res.run_id);
      setActiveRun(runData);

      // Auto-set highlight region if pin or truncation found
      if (runData.findings && runData.findings.length > 0) {
        const f = runData.findings[0];
        if (f.region_start_s != null && f.region_end_s != null) {
          setHighlightRegion([f.region_start_s, f.region_end_s]);
        }
      }
    } catch (err) {
      alert(`Synthesis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  // Add Defect Pin
  const handleAddPinSubmit = async () => {
    if (!activeRun) return;
    try {
      const pinPayload = {
        timestamp_start_s: Number(pinTime.toFixed(2)),
        timestamp_end_s: Number((pinTime + 0.67).toFixed(2)),
        category: pinCategory as any,
        severity: pinSeverity as any,
        note: pinNote
      };
      const updated = await addDefectPin(activeRun.id, pinPayload);
      setActiveRun(updated);
      setShowAddPinModal(false);
      setRightTab('pins');
    } catch (err) {
      alert(`Failed to add pin: ${err}`);
    }
  };

  // Compile Capsule
  const handleCompileCapsule = async () => {
    if (!activeRun) return;
    try {
      setCompilingCapsule(true);
      const candFinding = activeRun.findings.find(f => f.status === 'FAIL' || f.status === 'SUSPECTED') || activeRun.findings[0];
      if (!candFinding) {
        alert('No failure finding detected to compile capsule from.');
        return;
      }

      await updateFinding(candFinding.id, {
        review_state: 'HUMAN_CONFIRMED',
        reviewer_note: 'Verified speech defect anchored via Pro Workbench Defect Pin.'
      });

      const cap = await compileCapsule(candFinding.id);
      setActiveCapsule(cap);
      setRightTab('capsule');
      alert(`Voice Defect Capsule ${cap.id} compiled successfully!`);
    } catch (err) {
      alert(`Capsule compilation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCompilingCapsule(false);
    }
  };

  // Validate Capsule SHA-256 Byte Digest
  const handleVerifyCapsuleHash = async (capsuleId: string) => {
    try {
      setVerifyingHash(true);
      const res = await validateCapsuleIntegrity(capsuleId);
      if (res.valid) {
        setIntegrityStatus(`VERIFIED: Byte hash match (${res.computed_sha256.substring(0, 16)}...)`);
      } else {
        setIntegrityStatus(`TAMPER DETECTED: Hash mismatch!`);
      }
    } catch (err) {
      setIntegrityStatus(`Verification error: ${err}`);
    } finally {
      setVerifyingHash(false);
    }
  };

  // Rerun Regression
  const handleRerunRegression = async () => {
    if (!activeCapsule) return;
    try {
      setRerunningRegression(true);
      const rr = await rerunRegression(activeCapsule.id, true);
      setRegressionRun(rr);

      const regRunData = await fetchRun(rr.run_id);
      setFixedRun(regRunData);
    } catch (err) {
      alert(`Regression run failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRerunningRegression(false);
    }
  };

  // Approve Regression
  const handleApproveRegression = async () => {
    if (!activeCapsule || !regressionRun) return;
    try {
      const approved = await approveRegression(activeCapsule.id, regressionRun.id, 'QA Lead Hindi');
      setRegressionRun(approved);
      setActiveCapsule(prev => prev ? { ...prev, state: 'RESOLVED' } : null);
      alert('Regression approved! Capsule status elevated to RESOLVED.');
    } catch (err) {
      alert(`Approval failed: ${err}`);
    }
  };

  // Duplicate Scenario
  const handleDuplicateCase = async (caseId: string) => {
    try {
      const cloned = await duplicateTestCase(caseId);
      await loadCases();
      setSelectedCaseId(cloned.id);
      alert(`Duplicated scenario as ${cloned.id}`);
    } catch (err) {
      alert(`Duplication failed: ${err}`);
    }
  };

  // Filtered Scenario list: sorted so LATEST scenarios show on upper side
  const filteredCases = cases
    .filter(c => {
      const matchesSearch = c.scenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang = languageFilter === 'ALL' || c.language === languageFilter;
      return matchesSearch && matchesLang;
    })
    .sort((a, b) => {
      if (a.created_at && b.created_at) {
        const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (diff !== 0) return diff;
      }
      const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    });

  // Calculate current workflow step (1 to 6)
  const getWorkflowStep = () => {
    if (activeCapsule?.state === 'RESOLVED') return 6;
    if (regressionRun) return 6;
    if (activeCapsule) return 5;
    if (activeRun?.findings?.some(f => f.review_state === 'HUMAN_CONFIRMED')) return 4;
    if (activeRun?.audio_path) return 3;
    if (activeCase) return 2;
    return 1;
  };

  const workflowStep = getWorkflowStep();

  return (
    <div className="flex-1 flex min-h-0 h-full overflow-hidden bg-[#F8FAFC]">
      {/* ============================================================== */}
      {/* 1. LEFT SIDEBAR: SCENARIO EXPLORER (Reference Image B)         */}
      {/* ============================================================== */}
      <aside className="w-[280px] lg:w-[300px] shrink-0 bg-white border-r border-[#E7ECF3] flex flex-col h-full min-h-0 overflow-hidden shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
        {/* Header with Title, Suite Subtitle, and Plus Button */}
        <div className="p-4 border-b border-[#E7ECF3] shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#172033]">Scenarios</h2>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#EEF4FF] text-[#3867E8]">
                {cases.length}
              </span>
            </div>
            {/* Compact Plus Button */}
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="w-6 h-6 rounded-md bg-[#3867E8] text-white flex items-center justify-center hover:bg-[#2C56CE] shadow-xs transition-colors"
              title="Add New Scenario"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#64748B]">Insurance Indic Voice Suite</p>

          {/* Search Field */}
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E7ECF3] rounded-lg focus:outline-none focus:border-[#3867E8] text-[#172033] placeholder-[#94A3B8]"
            />
          </div>

          {/* Language Filters Row */}
          <div className="flex items-center justify-between gap-1 mt-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLanguageFilter('ALL')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  languageFilter === 'ALL'
                    ? 'bg-[#EEF4FF] text-[#3867E8] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLanguageFilter('hi-IN')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  languageFilter === 'hi-IN'
                    ? 'bg-[#EEF4FF] text-[#3867E8] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                Hindi
              </button>
              <button
                onClick={() => setLanguageFilter('hinglish')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  languageFilter === 'hinglish'
                    ? 'bg-[#EEF4FF] text-[#3867E8] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                Hinglish
              </button>
            </div>
            <button
              onClick={() => alert('Filter options: hi-IN, Hinglish, Standard, Telephony')}
              className="p-1 rounded text-[#94A3B8] hover:text-[#172033]"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scenario List (Independent Scrolling) */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#F1F5F9] overscroll-y-contain">
          {loadingCases ? (
            <div className="p-4 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#3867E8]" />
              <span>Loading scenarios...</span>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#94A3B8]">
              No matching scenarios found.
            </div>
          ) : (
            filteredCases.map(c => {
              const isSelected = c.id === selectedCaseId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#EEF4FF] border-l-4 border-l-[#3867E8]'
                      : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-mono font-bold ${
                      isSelected ? 'text-[#3867E8]' : 'text-[#172033]'
                    }`}>
                      {c.id}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                      c.severity === 'CRITICAL'
                        ? 'bg-[#FFF0F0] text-[#D94848]'
                        : 'bg-[#FFF0F0] text-[#D94848]'
                    }`}>
                      {c.severity === 'CRITICAL' ? 'Critical' : 'High'}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${
                    isSelected ? 'font-semibold text-[#172033]' : 'text-[#64748B]'
                  }`}>
                    {c.scenario}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Create Scenario Button */}
        <div className="p-3 border-t border-[#E7ECF3] bg-white shrink-0">
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="w-full py-2 px-3 border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] text-[#3867E8] font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#3867E8]" />
            <span>Create Scenario</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. CENTRE WORKSPACE: MAIN CONTENT (Reference Image B)          */}
      {/* ============================================================== */}
      <main className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 overscroll-y-contain">
        {/* A. Workflow Progress Indicator (Reference Image B) */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl px-5 py-3 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Step 1: Scenario */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#16A36A] text-white flex items-center justify-center text-[10px]">
                ✓
              </div>
              <span className="text-xs font-medium text-[#172033]">Scenario</span>
            </div>
            <div className="w-8 h-0.5 bg-[#E2E8F0]" />

            {/* Step 2: Generate */}
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                workflowStep >= 2 ? 'bg-[#16A36A] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {workflowStep >= 3 ? '✓' : '2'}
              </div>
              <span className={`text-xs font-medium ${workflowStep >= 2 ? 'text-[#172033]' : 'text-[#64748B]'}`}>
                Generate
              </span>
            </div>
            <div className="w-8 h-0.5 bg-[#E2E8F0]" />

            {/* Step 3: Inspect */}
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                workflowStep >= 3 ? 'bg-[#3867E8] text-white shadow-xs' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                3
              </div>
              <span className={`text-xs font-medium ${workflowStep >= 3 ? 'text-[#3867E8] font-semibold' : 'text-[#64748B]'}`}>
                Inspect
              </span>
            </div>
            <div className="w-8 h-0.5 bg-[#E2E8F0]" />

            {/* Step 4: Review */}
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                workflowStep >= 4 ? 'bg-[#16A36A] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {workflowStep >= 5 ? '✓' : '4'}
              </div>
              <span className={`text-xs font-medium ${workflowStep >= 4 ? 'text-[#172033]' : 'text-[#64748B]'}`}>
                Review
              </span>
            </div>
            <div className="w-8 h-0.5 bg-[#E2E8F0]" />

            {/* Step 5: Capsule */}
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                workflowStep >= 5 ? 'bg-[#16A36A] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {workflowStep >= 6 ? '✓' : '5'}
              </div>
              <span className={`text-xs font-medium ${workflowStep >= 5 ? 'text-[#172033]' : 'text-[#64748B]'}`}>
                Capsule
              </span>
            </div>
            <div className="w-8 h-0.5 bg-[#E2E8F0]" />

            {/* Step 6: Regression */}
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                workflowStep >= 6 ? 'bg-[#16A36A] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                6
              </div>
              <span className={`text-xs font-medium ${workflowStep >= 6 ? 'text-[#16A36A] font-semibold' : 'text-[#64748B]'}`}>
                Regression
              </span>
            </div>
          </div>
        </div>

        {/* B. Scenario Header & Spoken Ground Truth (Reference Image B) */}
        {activeCase && (
          <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-sm space-y-4">
            {/* Top Row: Case ID, Badges, Severity Pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-[#172033]">
                  {activeCase.id}
                </h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F4F7FB] text-[#64748B] border border-[#E7ECF3]">
                  {activeCase.language === 'hinglish' ? 'Hinglish' : 'Hindi'}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F4F7FB] text-[#64748B] border border-[#E7ECF3]">
                  {activeCase.channel === 'tel_8k' ? 'Telephony' : 'Standard'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDuplicateCase(activeCase.id)}
                  title="Clone Scenario"
                  className="p-1 rounded text-[#94A3B8] hover:text-[#172033] hover:bg-[#F4F7FB]"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FFF0F0] text-[#D94848] border border-[#FDD8D8]">
                  {activeCase.severity === 'CRITICAL' ? 'Critical Severity' : 'High Severity'}
                </span>
              </div>
            </div>

            {/* Scenario Title */}
            <h2 className="text-base font-semibold text-[#172033]">
              {activeCase.scenario}
            </h2>

            {/* Reference Spoken Ground Truth Box (Reference Image B) */}
            <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#EEF4FF] text-[#3867E8] flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[#172033]">
                  Reference Spoken Ground Truth
                </span>
                <span className="text-[11px] font-mono text-[#94A3B8] ml-auto">
                  {activeCase.reference_text.length} chars
                </span>
              </div>

              <p className="font-devanagari text-xs text-[#172033] leading-relaxed pl-7">
                "{activeCase.reference_text}"
              </p>

              {/* Mandatory Tokens Chips */}
              <div className="flex items-center gap-2 pl-7 pt-1 text-xs">
                <span className="text-[#64748B] text-[11px]">Mandatory:</span>
                {activeCase.critical_phrases.map((cp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF4FF] text-[#3867E8] text-[11px] font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3867E8]" />
                    <span>{cp.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* C. Voice Generation Configuration Row (Reference Image B) */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-md bg-[#EEF4FF] text-[#3867E8] flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M4 10a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1zm4-4a1 1 0 0 0-1 1v10a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1zm4-3a1 1 0 0 0-1 1v16a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1zm4 5a1 1 0 0 0-1 1v10a1 1 0 0 0 2 0V9a1 1 0 0 0-1-1zm4 3a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[#172033]">Voice Engine</span>
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Model Selector Dropdown */}
            <div className="relative flex-1 min-w-[170px]">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="w-full text-xs font-medium text-[#172033] bg-[#F8FAFC] border border-[#E7ECF3] rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-[#3867E8] cursor-pointer"
              >
                <option value="timbre-v3.0">Timbre v3.0 (Expressive)</option>
                <option value="timbre-v2.5">Timbre v2.5 (Telephony)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Voice Persona Dropdown */}
            <div className="relative flex-1 min-w-[200px]">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full text-xs font-medium text-[#172033] bg-[#F8FAFC] border border-[#E7ECF3] rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-[#3867E8] cursor-pointer"
              >
                <option value="Shivani - Warm & Conversational">Shivani - Warm & Conversational</option>
                <option value="Avinash - Authoritative">Avinash - Authoritative</option>
                <option value="Lakshmi - Empathetic">Lakshmi - Empathetic</option>
                <option value="Kalpana - Professional">Kalpana - Professional</option>
                <option value="Nalini - Fluent Telephony">Nalini - Fluent Telephony</option>
                <option value="Deepak - Confident">Deepak - Confident</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Primary Action Button: Generate Speech */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-[#3867E8] hover:bg-[#2C56CE] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50 shrink-0"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <span>►</span>
                <span>Generate Speech</span>
              </>
            )}
          </button>
        </div>

        {/* D. Audio Inspection Panel with Waveform (Reference Image B) */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
              Audio Inspection
            </h3>
            {activeRun && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F4F7FB] px-2 py-0.5 rounded border border-[#E7ECF3]">
                  {activeRun.id}
                </span>
                <span className="text-[11px] font-mono font-medium text-[#172033]">
                  {activeRun.duration_s ? `00:0${activeRun.duration_s.toFixed(3)}` : '00:05.599'}
                </span>
              </div>
            )}
          </div>

          {/* Pro Waveform Player */}
          {activeRun?.audio_path ? (
            <ProWaveformPlayer
              primaryAudioUrl={getAudioUrl(activeRun.id)}
              comparisonAudioUrl={fixedRun ? getAudioUrl(fixedRun.id) : undefined}
              defectPins={activeRun.defect_pins || []}
              highlightRegion={highlightRegion}
              onRegionSelected={(s, e) => {
                setHighlightRegion([s, e]);
                setPinTime(s);
              }}
              onAddPinRequested={(time) => {
                setPinTime(time);
                setShowAddPinModal(true);
              }}
            />
          ) : (
            <div className="h-32 border border-dashed border-[#CBD5E1] rounded-lg bg-[#FAFBFD] flex flex-col items-center justify-center gap-2 text-xs text-[#94A3B8]">
              <Sparkles className="w-5 h-5 text-[#3867E8]" />
              <span>Click "Generate Speech" to synthesize Indic audio with Gnani Timbre</span>
            </div>
          )}
        </div>

        {/* E. Speech Recognition (Dual-ASR) Comparison (Reference Image B) */}
        <div className="bg-white border border-[#E7ECF3] rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
            Speech Recognition (Dual-ASR)
          </h3>

          <DualAsrJury
            dualResults={activeRun?.stt_dual_results}
            expectedText={activeCase?.reference_text || ''}
          />
        </div>
      </main>

      {/* ============================================================== */}
      {/* 3. RIGHT INSPECTOR: COMPACT AUDIO HEALTH (Reference Images A & B) */}
      {/* ============================================================== */}
      <aside className="w-[320px] lg:w-[340px] shrink-0 bg-white border-l border-[#E7ECF3] flex flex-col h-full min-h-0 overflow-hidden shadow-[-1px_0_2px_rgba(0,0,0,0.02)]">
        {/* Tab Headers: Radar, Pins, Capsule */}
        <div className="flex border-b border-[#E7ECF3] px-3 pt-2 shrink-0">
          <button
            onClick={() => setRightTab('radar')}
            className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              rightTab === 'radar'
                ? 'border-[#3867E8] text-[#3867E8]'
                : 'border-transparent text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <span>Radar</span>
          </button>

          <button
            onClick={() => setRightTab('pins')}
            className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              rightTab === 'pins'
                ? 'border-[#3867E8] text-[#3867E8]'
                : 'border-transparent text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Pins ({activeRun?.defect_pins?.length || 0})</span>
          </button>

          <button
            onClick={() => setRightTab('capsule')}
            className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              rightTab === 'capsule'
                ? 'border-[#3867E8] text-[#3867E8]'
                : 'border-transparent text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Capsule</span>
          </button>
        </div>

        {/* Tab 1: Radar Content (Reference Image A) */}
        {rightTab === 'radar' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 overscroll-y-contain">
            <div>
              <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
                Audio Health & Quality
              </h3>

              {/* Compact Circular Health Gauge & Side Metrics */}
              <CompactAudioHealth
                run={activeRun}
                onOpenDetails={() => setIsDetailsDrawerOpen(true)}
              />
            </div>

            {/* Voice Defect Capsule Quick Action Card (Reference Image B) */}
            <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#EEF4FF] text-[#3867E8] flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#172033]">Voice Defect Capsule</h4>
              </div>

              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Compile evidence to create a reproducible regression test.
              </p>

              <button
                onClick={handleCompileCapsule}
                disabled={compilingCapsule || !activeRun}
                className="w-full py-2 bg-[#3867E8] hover:bg-[#2C56CE] disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                {compilingCapsule ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sealing Hash...</span>
                  </>
                ) : (
                  <>
                    <span>Compile Capsule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Defect Pins List */}
        {rightTab === 'pins' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 overscroll-y-contain">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7ECF3]">
              <h4 className="text-xs font-bold text-[#172033]">Pinned Defects</h4>
              <button
                onClick={() => setShowAddPinModal(true)}
                className="text-[11px] font-semibold text-[#3867E8] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Pin</span>
              </button>
            </div>

            {!activeRun?.defect_pins || activeRun.defect_pins.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#94A3B8] space-y-2">
                <Pin className="w-6 h-6 mx-auto text-[#CBD5E1]" />
                <p>No defects marked on this recording yet.</p>
                <p className="text-[11px] text-[#64748B]">Select an audio region to document a finding.</p>
              </div>
            ) : (
              activeRun.defect_pins.map(pin => (
                <div
                  key={pin.id}
                  onClick={() => setHighlightRegion([pin.timestamp_start_s, pin.timestamp_end_s])}
                  className="p-3 bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg space-y-1.5 hover:border-[#3867E8] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#D94848]">
                      P1 {pin.timestamp_start_s.toFixed(2)}s – {pin.timestamp_end_s.toFixed(2)}s
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#FFF0F0] text-[#D94848]">
                      {pin.severity}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#172033]">{pin.category.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-[#64748B]">{pin.note}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Capsule Summary & Regression Runner */}
        {rightTab === 'capsule' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 overscroll-y-contain">
            {activeCapsule ? (
              <div className="space-y-4">
                {/* Capsule Header Card */}
                <div className="bg-[#FAFBFD] border border-[#E7ECF3] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#3867E8]">
                      {activeCapsule.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeCapsule.state === 'RESOLVED'
                        ? 'bg-[#EAF8F0] text-[#16A36A] border border-[#C6F0D8]'
                        : 'bg-[#FFF0F0] text-[#D94848] border border-[#FDD8D8]'
                    }`}>
                      {activeCapsule.state}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#172033]">
                    {activeCapsule.defect_type.replace(/_/g, ' ')}
                  </p>

                  <div className="text-[11px] font-mono text-[#64748B] truncate">
                    SHA-256: {activeCapsule.failing_audio_sha256 || activeCapsule.audio_sha256}
                  </div>

                  {/* Hash Validation Button */}
                  <div className="pt-1">
                    <button
                      onClick={() => handleVerifyCapsuleHash(activeCapsule.id)}
                      disabled={verifyingHash}
                      className="w-full py-1 text-[11px] font-medium rounded border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] text-[#3867E8] flex items-center justify-center gap-1 shadow-xs"
                    >
                      {verifyingHash ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                      <span>Verify Byte Hash</span>
                    </button>
                    {integrityStatus && (
                      <p className={`text-[10px] font-mono mt-1 ${
                        integrityStatus.includes('VERIFIED') ? 'text-[#16A36A]' : 'text-[#D94848]'
                      }`}>
                        {integrityStatus}
                      </p>
                    )}
                  </div>
                </div>

                {/* Assertions Checklist */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                    Deterministic Assertions ({activeCapsule.spec.assertions?.length || 0})
                  </h4>
                  <div className="space-y-1.5">
                    {activeCapsule.spec.assertions?.map((a: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-white border border-[#E7ECF3] text-xs space-y-0.5">
                        <div className="flex items-center justify-between font-mono text-[11px] text-[#3867E8]">
                          <span>{a.id} • {a.type}</span>
                          <span className="text-[#16A36A]">ACTIVE</span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">{a.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regression Actions */}
                <div className="space-y-2 pt-2 border-t border-[#E7ECF3]">
                  <button
                    onClick={handleRerunRegression}
                    disabled={rerunningRegression}
                    className="w-full py-2 bg-[#3867E8] hover:bg-[#2C56CE] disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {rerunningRegression ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating Assertions...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Run Regression Test</span>
                      </>
                    )}
                  </button>

                  {regressionRun && (
                    <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E7ECF3] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">Verdict:</span>
                        <span className={`font-mono font-bold ${
                          regressionRun.verdict === 'RESOLVED' ? 'text-[#16A36A]' : 'text-[#D99520]'
                        }`}>
                          {regressionRun.verdict}
                        </span>
                      </div>

                      {regressionRun.verdict === 'NEEDS_REVIEW' && (
                        <button
                          onClick={handleApproveRegression}
                          className="w-full py-1.5 bg-[#16A36A] hover:bg-[#128053] text-white font-medium rounded text-xs flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Fix (Lead Sign-off)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#94A3B8] space-y-2">
                <Layers className="w-6 h-6 mx-auto text-[#CBD5E1]" />
                <p>No capsule compiled for this scenario yet.</p>
                <p className="text-[11px] text-[#64748B]">Switch to Radar or Pins to compile evidence.</p>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ============================================================== */}
      {/* 4. MODALS & DRAWERS                                            */}
      {/* ============================================================== */}

      {/* View Details Diagnostics Drawer */}
      <AudioDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        onClose={() => setIsDetailsDrawerOpen(false)}
        run={activeRun}
      />

      {/* Add Defect Pin Modal */}
      {showAddPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-[#E7ECF3] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Pin className="w-4 h-4 text-[#D94848]" />
              <span>Drop Defect Pin</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Timecode (Seconds)</label>
                <input
                  type="number"
                  step="0.05"
                  value={pinTime}
                  onChange={(e) => setPinTime(parseFloat(e.target.value))}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Defect Category</label>
                <select
                  value={pinCategory}
                  onChange={(e) => setPinCategory(e.target.value)}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033]"
                >
                  <option value="END_TRUNCATION">END_TRUNCATION</option>
                  <option value="AMOUNT_MISPRONUNCIATION">AMOUNT_MISPRONUNCIATION</option>
                  <option value="ACOUSTIC_CLIPPING">ACOUSTIC_CLIPPING</option>
                  <option value="UNEXPECTED_SILENCE">UNEXPECTED_SILENCE</option>
                  <option value="CODE_SWITCH_GLITCH">CODE_SWITCH_GLITCH</option>
                  <option value="UNNATURAL_CADENCE">UNNATURAL_CADENCE</option>
                  <option value="DATE_OR_NUMBER_DISTORTION">DATE_OR_NUMBER_DISTORTION</option>
                  <option value="CRITICAL_PHRASE_MISSING">CRITICAL_PHRASE_MISSING</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Severity</label>
                <select
                  value={pinSeverity}
                  onChange={(e) => setPinSeverity(e.target.value)}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033]"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Reviewer Evidence Note</label>
                <textarea
                  rows={2}
                  value={pinNote}
                  onChange={(e) => setPinNote(e.target.value)}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7ECF3]">
              <button
                onClick={() => setShowAddPinModal(false)}
                className="px-3 py-1.5 rounded text-xs text-[#64748B] hover:bg-[#F4F7FB]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPinSubmit}
                className="px-4 py-1.5 rounded bg-[#3867E8] text-white text-xs font-semibold hover:bg-[#2C56CE]"
              >
                Save Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Scenario Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#E7ECF3] space-y-4">
            <h3 className="text-sm font-bold text-[#172033]">Create Indic Test Scenario</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Scenario Title</label>
                <input
                  type="text"
                  placeholder="e.g. Health Cashless Claim Verification"
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Language</label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value as any)}
                    className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033]"
                  >
                    <option value="hi-IN">Hindi (hi-IN)</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033]"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Reference Ground Truth Script</label>
                <textarea
                  rows={3}
                  placeholder="Enter Hindi/Hinglish reference text..."
                  value={newReferenceText}
                  onChange={(e) => setNewReferenceText(e.target.value)}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033] font-devanagari"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Critical Entities (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. ₹5,000, Apollo Hospital"
                  value={newCriticalPhrases}
                  onChange={(e) => setNewCriticalPhrases(e.target.value)}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#E7ECF3] rounded text-[#172033]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7ECF3]">
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="px-3 py-1.5 rounded text-xs text-[#64748B] hover:bg-[#F4F7FB]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newScenario || !newReferenceText) {
                    alert('Please enter title and script.');
                    return;
                  }
                  try {
                    setCreatingCase(true);
                    const phrases = newCriticalPhrases.split(',').map(s => ({
                      text: s.trim(),
                      variants: [s.trim()],
                      severity: 'CRITICAL' as any
                    })).filter(p => p.text);

                    const created = await createTestCase({
                      suite_id: 'suite-insurance-hi',
                      scenario: newScenario,
                      language: newLanguage,
                      reference_text: newReferenceText,
                      critical_phrases: phrases,
                      tts_model: newTtsModel,
                      voice: newVoice,
                      severity: newSeverity,
                      channel: 'standard'
                    });
                    await loadCases();
                    setSelectedCaseId(created.id);
                    setShowNewCaseModal(false);
                  } catch (e) {
                    alert(`Failed to create scenario: ${e}`);
                  } finally {
                    setCreatingCase(false);
                  }
                }}
                disabled={creatingCase}
                className="px-4 py-1.5 rounded bg-[#3867E8] text-white text-xs font-semibold hover:bg-[#2C56CE]"
              >
                {creatingCase ? 'Creating...' : 'Create Scenario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
