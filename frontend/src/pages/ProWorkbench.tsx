import React, { useState, useEffect } from 'react';
import { TestCase, Run, Finding, Capsule, RegressionRun, DefectPin } from '../types';
import {
  fetchTestCases, fetchRun, triggerGenerateRun, uploadAudioRun,
  createTestCase, importCasesCsv, addDefectPin, removeDefectPin,
  updateFinding, compileCapsule, rerunRegression, approveRegression,
  getAudioUrl, duplicateTestCase, validateCapsuleIntegrity
} from '../api/client';
import { ProWaveformPlayer } from '../components/ProWaveformPlayer';
import { ModelArenaSelector, V3_PERSONAS, V25_PERSONAS } from '../components/ModelArenaSelector';
import { DualAsrJury } from '../components/DualAsrJury';
import { DefectPinDrawer } from '../components/DefectPinDrawer';
import { TranscriptDiff } from '../components/TranscriptDiff';
import { BeforeAfterTable } from '../components/BeforeAfterTable';
import {
  Play, Plus, Upload, Sparkles, Pin, ShieldCheck, CheckCircle2,
  AlertTriangle, Activity, Volume2, ArrowRight, Loader2, Gauge,
  FileText, Check, Clock, RefreshCw, Layers, Search, X, Wand2,
  Copy, Download
} from 'lucide-react';

interface ProWorkbenchProps {
  initialCaseId?: string;
  onOpenReport?: () => void;
}

export const ProWorkbench: React.FC<ProWorkbenchProps> = ({
  initialCaseId = 'TC-014',
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
  const [selectedVoice, setSelectedVoice] = useState<string>('Shivani');
  const [injectFault, setInjectFault] = useState<string>('END_TRUNCATION');
  const [generating, setGenerating] = useState(false);

  // Active Run & Telemetry State
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [highlightRegion, setHighlightRegion] = useState<[number, number] | undefined>();

  // Defect Capsule & Regression State
  const [activeCapsule, setActiveCapsule] = useState<Capsule | null>(null);
  const [regressionRun, setRegressionRun] = useState<RegressionRun | null>(null);
  const [fixedRun, setFixedRun] = useState<Run | null>(null);
  const [compilingCapsule, setCompilingCapsule] = useState(false);
  const [rerunningRegression, setRerunningRegression] = useState(false);
  const [rightTab, setRightTab] = useState<'radar' | 'pins' | 'capsule'>('radar');

  // Modals & New Case Form State
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [newScenario, setNewScenario] = useState('');
  const [newLanguage, setNewLanguage] = useState<'hi-IN' | 'hinglish'>('hi-IN');
  const [newTtsModel, setNewTtsModel] = useState<'timbre-v3.0' | 'timbre-v2.5'>('timbre-v3.0');
  const [newVoice, setNewVoice] = useState('Shivani');
  const [newSeverity, setNewSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [newChannel, setNewChannel] = useState<'standard' | 'tel_8k'>('standard');
  const [newReferenceText, setNewReferenceText] = useState('');
  const [newCriticalPhrases, setNewCriticalPhrases] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);

  // Load all Test Cases
  const loadCases = async () => {
    try {
      setLoadingCases(true);
      const data = await fetchTestCases('suite-insurance-hi');
      setCases(data);
      if (data.length > 0 && !selectedCaseId) {
        setSelectedCaseId(data[0].id);
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

  // Auto-generate / fetch baseline run when switching case
  useEffect(() => {
    if (!activeCase) return;
    // Set voice persona defaults based on case
    if (activeCase.tts_model === 'timbre-v2.5') {
      setSelectedModel('timbre-v2.5');
      setSelectedVoice('Nalini');
    } else {
      setSelectedModel('timbre-v3.0');
      setSelectedVoice('Shivani');
    }
  }, [selectedCaseId]);

  // Handle Speech Generation
  const handleGenerate = async (fault?: string) => {
    if (!activeCase) return;
    try {
      setGenerating(true);
      const faultParam = activeCase.id === 'TC-014' ? fault || injectFault : undefined;
      const res = await triggerGenerateRun(activeCase.id, faultParam, selectedModel, selectedVoice);
      const runData = await fetchRun(res.run_id);
      setActiveRun(runData);

      // Auto-switch right tab to pins/capsule if defects found
      if (runData.findings && runData.findings.length > 0) {
        setRightTab('pins');
      }
    } catch (err) {
      alert(`Synthesis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  // Add Defect Pin
  const handleAddPin = async (pinData: {
    timestamp_start_s: number;
    timestamp_end_s: number;
    category: string;
    severity: string;
    note: string;
  }) => {
    if (!activeRun) return;
    const updated = await addDefectPin(activeRun.id, pinData);
    setActiveRun(updated);
  };

  // Remove Defect Pin
  const handleRemovePin = async (pinId: string) => {
    if (!activeRun) return;
    const updated = await removeDefectPin(activeRun.id, pinId);
    setActiveRun(updated);
  };

  // Compile Capsule from Confirmed Finding or Defect Pin
  const handleCompileCapsule = async () => {
    if (!activeRun) return;
    try {
      setCompilingCapsule(true);
      // Find candidate finding (e.g. truncation or critical phrase missing)
      const candFinding = activeRun.findings.find(f => f.status === 'FAIL' || f.status === 'SUSPECTED') || activeRun.findings[0];
      if (!candFinding) {
        alert('No failure finding detected to compile capsule from.');
        return;
      }

      // 1. Confirm finding
      await updateFinding(candFinding.id, {
        review_state: 'HUMAN_CONFIRMED',
        reviewer_note: 'Verified speech defect anchored via Pro Workbench Defect Pin.'
      });

      // 2. Compile capsule
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

  // Rerun Regression with Replacement Speech
  const handleRerunRegression = async () => {
    if (!activeCapsule) return;
    try {
      setRerunningRegression(true);
      const rr = await rerunRegression(activeCapsule.id, true);
      setRegressionRun(rr);

      // Fetch the newly generated run so we can dual-track compare
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

  // CSV Import
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCsvUploading(true);
      const res = await importCasesCsv(file, 'suite-insurance-hi');
      alert(`Successfully imported ${res.imported} scenarios.`);
      await loadCases();
    } catch (err) {
      alert(`CSV import error: ${err}`);
    } finally {
      setCsvUploading(false);
      e.target.value = '';
    }
  };

  // Preset Autofill for Quick Scenario Creation
  const applyPreset = (preset: 'health' | 'motor' | 'ivr') => {
    if (preset === 'health') {
      setNewScenario('Health Cashless Claim Pre-Auth');
      setNewLanguage('hi-IN');
      setNewTtsModel('timbre-v3.0');
      setNewVoice('Shivani');
      setNewSeverity('HIGH');
      setNewChannel('standard');
      setNewReferenceText('नमस्ते, आपका अपोलो हॉस्पिटल में ₹45,000 का कैशलेस क्लेम मंज़ूर हो गया है। कृपया डिस्चार्ज के समय मूल दस्तावेज काउंटर पर प्रस्तुत करें।');
      setNewCriticalPhrases('₹45,000, अपोलो हॉस्पिटल, कैशलेस क्लेम');
    } else if (preset === 'motor') {
      setNewScenario('Motor Insurance NCB Renewal Alert');
      setNewLanguage('hinglish');
      setNewTtsModel('timbre-v3.0');
      setNewVoice('Avinash');
      setNewSeverity('CRITICAL');
      setNewChannel('standard');
      setNewReferenceText('Hello, आपकी Swift Dzire की कार बीमा पॉलिसी 24 November को समाप्त हो रही है। 50% No Claim Bonus सुरक्षित रखने के लिए आज ही रिन्यू करें।');
      setNewCriticalPhrases('Swift Dzire, 24 November, 50% No Claim Bonus');
    } else if (preset === 'ivr') {
      setNewScenario('Telephony Premium Reminder');
      setNewLanguage('hi-IN');
      setNewTtsModel('timbre-v2.5');
      setNewVoice('Nalini');
      setNewSeverity('HIGH');
      setNewChannel('tel_8k');
      setNewReferenceText('प्रिय ग्राहक, आपकी जीवन बीमा प्रीमियम ₹3,200 15 तारीख तक देय है। लेट फीस से बचने के लिए तुरंत भुगतान करें।');
      setNewCriticalPhrases('₹3,200, 15 तारीख, जीवन बीमा');
    }
  };

  // Create Scenario Handler
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenario.trim() || !newReferenceText.trim()) {
      alert('Please provide both Scenario Title and Reference Spoken Text.');
      return;
    }
    try {
      setCreatingCase(true);
      const phrases = newCriticalPhrases
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => ({
          text: p,
          variants: [],
          severity: newSeverity
        }));

      const created = await createTestCase({
        suite_id: 'suite-insurance-hi',
        scenario: newScenario.trim(),
        language: newLanguage,
        reference_text: newReferenceText.trim(),
        critical_phrases: phrases,
        tts_model: newTtsModel,
        voice: newVoice,
        severity: newSeverity,
        channel: newChannel,
        speed: 1.0,
      });

      setShowNewCaseModal(false);
      setNewScenario('');
      setNewReferenceText('');
      setNewCriticalPhrases('');

      await loadCases();
      setSelectedCaseId(created.id);
      alert(`Scenario ${created.id} created successfully! Ready for multi-model synthesis.`);
    } catch (err) {
      alert(`Failed to create scenario: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreatingCase(false);
    }
  };

  const [hashStatus, setHashStatus] = useState<{ checked: boolean; valid: boolean; computed?: string } | null>(null);

  const handleDuplicateCase = async () => {
    if (!activeCase) return;
    try {
      const dup = await duplicateTestCase(activeCase.id);
      await loadCases();
      setSelectedCaseId(dup.id);
      alert(`Scenario duplicated successfully as ${dup.id}!`);
    } catch (err) {
      alert(`Failed to duplicate scenario: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleValidateHash = async () => {
    if (!activeCapsule) return;
    try {
      const res = await validateCapsuleIntegrity(activeCapsule.id);
      setHashStatus({ checked: true, valid: res.valid, computed: res.computed_sha256 });
    } catch (err) {
      alert(`Hash validation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filtered cases list
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.scenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reference_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang = languageFilter === 'ALL' || c.language === languageFilter;
    return matchesSearch && matchesLang;
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-100px)]">
      {/* =========================================================================
          LEFT PANE: SCENARIO & TEST EXPLORER (3 Cols)
          ========================================================================= */}
      <div className="lg:col-span-3 bg-[#11141B] border border-[#1D2230] rounded-xl p-3.5 flex flex-col h-full overflow-hidden shadow-xl">
        {/* Explorer Header */}
        <div className="pb-3 border-b border-[#1D2230] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-1.5">
                <span>Scenarios</span>
                <span className="text-xs font-mono font-normal text-[#4F8CFF]">({cases.length})</span>
              </h2>
              <p className="text-[10px] text-[#64748B]">Insurance Indic Voice Suite</p>
            </div>

            <div className="flex items-center gap-1.5">
              <label
                title="Import CSV"
                className="p-1.5 rounded-lg bg-[#171C26] hover:bg-[#222938] text-[#94A3B8] hover:text-white border border-[#222938] cursor-pointer transition-colors"
              >
                {csvUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <input type="file" accept=".csv" onChange={handleCsvImport} disabled={csvUploading} className="hidden" />
              </label>

              <a
                href="/api/cases/export?format=csv"
                download="test_cases.csv"
                title="Export Cases CSV"
                className="p-1.5 rounded-lg bg-[#171C26] hover:bg-[#222938] text-[#94A3B8] hover:text-white border border-[#222938] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#2FBF71]" />
              </a>

              <button
                onClick={() => setShowNewCaseModal(true)}
                title="New Scenario"
                className="p-1.5 rounded-lg bg-[#4F8CFF] hover:bg-[#3D78E6] text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Filter scenarios or Devanagari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080A0E] border border-[#222938] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F3F4F6] placeholder-[#64748B] outline-none focus:border-[#4F8CFF]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            {(['ALL', 'hi-IN', 'hinglish'] as const).map(f => (
              <button
                key={f}
                onClick={() => setLanguageFilter(f)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  languageFilter === f
                    ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border border-[#4F8CFF]/40 font-bold'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Scenarios List */}
        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 pt-2">
          {filteredCases.map(c => {
            const isSelected = selectedCaseId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#171C26] border-[#4F8CFF] shadow-sm'
                    : 'bg-[#11141B]/60 border-[#1D2230] hover:border-[#4F8CFF]/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono text-xs font-bold text-[#4F8CFF]">{c.id}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase border ${
                    c.severity === 'CRITICAL'
                      ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-[#080A0E] text-[#64748B] border-[#222938]'
                  }`}>
                    {c.severity}
                  </span>
                </div>
                <div className="text-xs font-medium text-[#F3F4F6] line-clamp-1 mb-0.5">
                  {c.scenario}
                </div>
                <div className="text-[10px] text-[#94A3B8] line-clamp-1 font-devanagari">
                  {c.reference_text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Left Pane Footer: New Scenario Action */}
        <div className="pt-2.5 mt-auto border-t border-[#1D2230]">
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-[#171C26] hover:bg-[#212836] text-[#4F8CFF] hover:text-white border border-[#4F8CFF]/30 hover:border-[#4F8CFF] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Scenario</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CENTER STAGE: MULTI-MODEL ARENA & DUAL-TRACK WAVEFORM (6 Cols)
          ========================================================================= */}
      <div className="lg:col-span-6 flex flex-col h-full overflow-y-auto space-y-4 pr-1">
        {activeCase ? (
          <>
            {/* Ground Truth Scenario Bar */}
            <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-4 shadow-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#4F8CFF]">{activeCase.id}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#080A0E] border border-[#222938] text-[#94A3B8]">
                    {activeCase.language}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#080A0E] border border-[#222938] text-[#94A3B8]">
                    {activeCase.channel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-bold">
                    {activeCase.severity} SEVERITY
                  </span>

                  <button
                    onClick={handleDuplicateCase}
                    title="Duplicate Scenario"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-[#171C26] hover:bg-[#222938] text-[#94A3B8] hover:text-[#F3F4F6] border border-[#222938] transition-colors"
                  >
                    <Copy className="w-3 h-3 text-[#4F8CFF]" />
                    <span>Duplicate</span>
                  </button>
                </div>
              </div>

              <h1 className="text-base font-bold text-[#F3F4F6]">{activeCase.scenario}</h1>

              {/* Reference Ground Truth */}
              <div className="bg-[#080A0E] border border-[#1D2230] rounded-lg p-3">
                <div className="text-[10px] font-mono uppercase text-[#64748B] mb-1 flex items-center justify-between">
                  <span>Reference Spoken Ground Truth</span>
                  <span className="text-[#4F8CFF]">{activeCase.reference_text.length} chars</span>
                </div>
                <p className="font-devanagari text-sm text-[#F3F4F6] leading-relaxed">
                  {activeCase.reference_text}
                </p>
              </div>

              {/* Critical Phrases Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-mono text-[#64748B] uppercase">Mandatory:</span>
                {activeCase.critical_phrases.map((cp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[#171C26] border border-[#222938] text-[#F3F4F6]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4F8CFF]" />
                    <span className="font-devanagari">{cp.text}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Gnani Voice Engine Arena Selector */}
            <ModelArenaSelector
              selectedModel={selectedModel}
              selectedVoice={selectedVoice}
              onModelChange={setSelectedModel}
              onVoiceChange={setSelectedVoice}
            />

            {/* Synthesis Triggers & Demo Fault Switch */}
            <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleGenerate()}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#4F8CFF] hover:bg-[#3D78E6] disabled:opacity-50 text-white transition-all shadow-md active:scale-95"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>Generate with {selectedModel}</span>
                </button>

                {activeCase.id === 'TC-014' && (
                  <select
                    value={injectFault}
                    onChange={(e) => setInjectFault(e.target.value)}
                    className="bg-[#171C26] border border-[#222938] text-xs font-mono text-[#F5A524] px-2.5 py-2 rounded-lg outline-none"
                  >
                    <option value="END_TRUNCATION">Injected Test Fault (Truncation)</option>
                    <option value="FIXED">Clean Speech (No Fault)</option>
                  </select>
                )}
              </div>

              {activeRun && (
                <div className="text-[11px] font-mono text-[#64748B]">
                  Active Run: <span className="text-[#4F8CFF]">{activeRun.id}</span>
                </div>
              )}
            </div>

            {/* Pro Waveform Player & A/B Scrubber */}
            {activeRun && (
              <ProWaveformPlayer
                primaryAudioUrl={getAudioUrl(activeRun.id)}
                comparisonAudioUrl={fixedRun ? getAudioUrl(fixedRun.id) : undefined}
                primaryLabel={`${activeRun.tts_model || 'Timbre'} (${activeRun.tts_voice || 'Shivani'})`}
                comparisonLabel={fixedRun ? `Fixed: ${fixedRun.tts_model} (${fixedRun.tts_voice})` : undefined}
                defectPins={activeRun.defect_pins || []}
                highlightRegion={highlightRegion}
                onRegionSelected={(start, end) => setHighlightRegion([start, end])}
                onAddPinRequested={(time) => {
                  setHighlightRegion([Math.max(0, time - 0.5), time + 1.0]);
                  setRightTab('pins');
                }}
              />
            )}

            {/* Dual-ASR Jury (Prisma v2.5 vs Prisma v3.0) */}
            {activeRun && activeRun.stt_dual_results && (
              <DualAsrJury
                dualResults={activeRun.stt_dual_results}
                expectedText={activeCase.reference_text}
              />
            )}

            {/* Transcript Diff */}
            {activeRun && (
              <div className="bg-[#11141B] border border-[#1D2230] rounded-xl p-4 shadow-lg space-y-2">
                <div className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider mb-2">
                  Recognized Speech Content Fidelity
                </div>
                <TranscriptDiff
                  referenceText={activeCase.reference_text}
                  transcriptText={activeRun.transcript_text || ''}
                  criticalPhrases={activeCase.critical_phrases}
                  wer={activeRun.metrics?.wer}
                  cer={activeRun.metrics?.cer}
                />
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-xs text-[#64748B]">
            Select a test case to start evaluation.
          </div>
        )}
      </div>

      {/* =========================================================================
          RIGHT DRAWER: TELEMETRY & DEFECT CAPSULE INSPECTOR (3 Cols)
          ========================================================================= */}
      <div className="lg:col-span-3 bg-[#11141B] border border-[#1D2230] rounded-xl p-3.5 flex flex-col h-full overflow-hidden shadow-xl">
        {/* Drawer Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#171C26] p-1 rounded-lg border border-[#222938] mb-3 text-xs font-mono">
          <button
            onClick={() => setRightTab('radar')}
            className={`py-1 rounded text-center transition-colors ${
              rightTab === 'radar' ? 'bg-[#4F8CFF] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Radar
          </button>
          <button
            onClick={() => setRightTab('pins')}
            className={`py-1 rounded text-center transition-colors ${
              rightTab === 'pins' ? 'bg-[#EF4444] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Pins ({activeRun?.defect_pins?.length || 0})
          </button>
          <button
            onClick={() => setRightTab('capsule')}
            className={`py-1 rounded text-center transition-colors ${
              rightTab === 'capsule' ? 'bg-[#8B5CF6] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Capsule
          </button>
        </div>

        {/* Tab 1: Acoustic Radar & Telemetry */}
        {rightTab === 'radar' && activeRun && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
            <div className="bg-[#171C26] border border-[#222938] rounded-lg p-3 space-y-2">
              <span className="text-[10px] font-mono text-[#64748B] uppercase">Acoustic Health Gauges</span>
              
              <div className="space-y-2 pt-1 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Peak Amplitude:</span>
                  <span className="text-[#F3F4F6] font-bold">{activeRun.metrics?.peak_db?.toFixed(2) || '0.00'} dBFS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Clipping Sample Ratio:</span>
                  <span className={`font-bold ${
                    (activeRun.metrics?.clip_ratio || 0) > 0.001 ? 'text-[#EF4444]' : 'text-[#10B981]'
                  }`}>
                    {((activeRun.metrics?.clip_ratio || 0) * 100).toFixed(3)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Speaking Pace:</span>
                  <span className="text-[#F3F4F6] font-bold">{activeRun.metrics?.pace_wps?.toFixed(2) || '0.00'} wps</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Internal Silences:</span>
                  <span className="text-[#F3F4F6] font-bold">{activeRun.metrics?.silence_regions_count || 0} gaps</span>
                </div>
              </div>
            </div>

            {/* Findings Summary */}
            <div className="bg-[#171C26] border border-[#222938] rounded-lg p-3 space-y-2">
              <span className="text-[10px] font-mono text-[#64748B] uppercase">
                Active Findings ({activeRun.findings.length})
              </span>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {activeRun.findings.map(f => (
                  <div key={f.id} className="p-2 rounded bg-[#080A0E] border border-[#222938] text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#EF4444]">{f.check_type}</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-[#EF4444]/15 text-[#EF4444]">
                        {f.status}
                      </span>
                    </div>
                    <p className="text-[#94A3B8] line-clamp-2">
                      {f.evidence?.explanation || 'Acoustic finding detected.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* One-Click Compile Capsule CTA */}
            <button
              onClick={handleCompileCapsule}
              disabled={compilingCapsule}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white transition-all shadow-md"
            >
              {compilingCapsule ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Compile Voice Defect Capsule</span>
            </button>
          </div>
        )}

        {/* Tab 2: Defect Pins */}
        {rightTab === 'pins' && activeRun && (
          <div className="flex-1 overflow-y-auto">
            <DefectPinDrawer
              pins={activeRun.defect_pins || []}
              currentTime={0}
              onAddPin={handleAddPin}
              onRemovePin={handleRemovePin}
              onSelectPinRegion={(start, end) => setHighlightRegion([start, end])}
            />

            <div className="pt-3">
              <button
                onClick={handleCompileCapsule}
                disabled={compilingCapsule}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white transition-all shadow-md"
              >
                {compilingCapsule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pin className="w-4 h-4" />}
                <span>Lock Evidence & Compile Capsule</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Defect Capsule & Regression Workbench */}
        {rightTab === 'capsule' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
            {activeCapsule ? (
              <div className="space-y-3">
                <div className="bg-[#171C26] border border-[#222938] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-[#8B5CF6]">{activeCapsule.id}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                      activeCapsule.state === 'RESOLVED'
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                        : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                    }`}>
                      {activeCapsule.state}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-[#94A3B8] space-y-1">
                    <div>Defect: <strong className="text-[#F3F4F6]">{activeCapsule.defect_type}</strong></div>
                    <div className="flex items-center justify-between">
                      <div className="truncate">Digest: <span className="text-[#64748B]">{activeCapsule.failing_audio_sha256.slice(0, 16)}...</span></div>
                      <button
                        onClick={handleValidateHash}
                        className="px-2 py-0.5 rounded bg-[#080A0E] hover:bg-[#222938] text-[10px] text-[#4F8CFF] border border-[#4F8CFF]/30 transition-colors"
                      >
                        Verify Hash
                      </button>
                    </div>
                    {hashStatus?.checked && (
                      <div className={`p-1.5 rounded text-[10px] font-mono border ${
                        hashStatus.valid ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                      }`}>
                        {hashStatus.valid ? '✓ SHA-256 Verified (Matches audio file bytes on disk)' : '✗ Hash Mismatch or File Missing'}
                      </div>
                    )}
                  </div>

                  {/* Assertions Contract */}
                  <div className="pt-2 border-t border-[#222938] space-y-1">
                    <span className="text-[10px] font-mono text-[#64748B] uppercase">Regression Assertions</span>
                    {activeCapsule.spec?.assertions?.map(a => (
                      <div key={a.id} className="p-1.5 rounded bg-[#080A0E] text-[10px] font-mono text-[#94A3B8]">
                        <span className="text-[#4F8CFF] font-bold">[{a.id}]</span> {a.description || a.type}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regression Replay CTA */}
                <button
                  onClick={handleRerunRegression}
                  disabled={rerunningRegression}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-[#4F8CFF] hover:bg-[#3D78E6] disabled:opacity-50 text-white transition-all shadow-md"
                >
                  {rerunningRegression ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>Rerun Regression (Fixed Audio)</span>
                </button>

                {/* Regression Verdict & Table */}
                {regressionRun && (
                  <div className="bg-[#171C26] border border-[#222938] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#F3F4F6]">Verdict</span>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                        regressionRun.verdict === 'RESOLVED' ? 'bg-[#10B981] text-white' : 'bg-[#F59E0B] text-black'
                      }`}>
                        {regressionRun.verdict}
                      </span>
                    </div>

                    <BeforeAfterTable
                      assertions={regressionRun.assertion_results}
                      verdict={regressionRun.verdict}
                      onApprove={handleApproveRegression}
                    />

                    {regressionRun.verdict === 'NEEDS_REVIEW' && (
                      <button
                        onClick={handleApproveRegression}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-[#10B981] hover:bg-[#059669] text-white transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sign-off & Approve Regression</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No capsule compiled for this run yet. Flag an anomaly or click "Compile Voice Defect Capsule" to create one.
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* =========================================================================
        MODAL: CREATE NEW TEST SCENARIO
        ========================================================================= */}
    {showNewCaseModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div
          className="bg-[#11141B] border border-[#1D2230] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-[#1D2230] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#F3F4F6] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4F8CFF]" />
                <span>Create Indic Voice QA Scenario</span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Define expected ground-truth script, target Gnani speech engine, voice persona, and mandatory tokens.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewCaseModal(false)}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1D2230] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Presets Chips */}
          <div className="bg-[#171C26] border border-[#222938] rounded-xl p-3 space-y-2">
            <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Quick Presets (Click to autofill)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('health')}
                className="px-2.5 py-1 rounded bg-[#080A0E] hover:bg-[#222938] text-[11px] text-[#4F8CFF] border border-[#4F8CFF]/30 hover:border-[#4F8CFF] transition-colors"
              >
                🏥 Health Cashless Claim (Hindi)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('motor')}
                className="px-2.5 py-1 rounded bg-[#080A0E] hover:bg-[#222938] text-[11px] text-[#10B981] border border-[#10B981]/30 hover:border-[#10B981] transition-colors"
              >
                🚗 Motor NCB Renewal (Hinglish)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ivr')}
                className="px-2.5 py-1 rounded bg-[#080A0E] hover:bg-[#222938] text-[11px] text-[#F59E0B] border border-[#F59E0B]/30 hover:border-[#F59E0B] transition-colors"
              >
                📞 8kHz Telephony Due Alert
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateCase} className="space-y-4">
            {/* Scenario Name */}
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] mb-1.5">
                Scenario Title <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Term Life Insurance Maturity Payout"
                value={newScenario}
                onChange={(e) => setNewScenario(e.target.value)}
                className="w-full bg-[#080A0E] border border-[#222938] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F3F4F6] placeholder-[#64748B] outline-none transition-colors"
              />
            </div>

            {/* Language & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-[#94A3B8] mb-1.5">
                  Language / Dialect <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value as any)}
                  className="w-full bg-[#080A0E] border border-[#222938] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F3F4F6] outline-none transition-colors"
                >
                  <option value="hi-IN">Hindi (hi-IN) - Devanagari</option>
                  <option value="hinglish">Hinglish - Mixed Indian English</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#94A3B8] mb-1.5">
                  Defect Severity Level <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as any)}
                  className="w-full bg-[#080A0E] border border-[#222938] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F3F4F6] outline-none transition-colors"
                >
                  <option value="CRITICAL">CRITICAL (Financial / Regulatory Truncation)</option>
                  <option value="HIGH">HIGH (Amount or Policy Date Error)</option>
                  <option value="MEDIUM">MEDIUM (Pronunciation or Unnatural Tone)</option>
                  <option value="LOW">LOW (Minor Pause / Hesitation)</option>
                </select>
              </div>
            </div>

            {/* Gnani Engine Model & Voice Persona */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-[#94A3B8] mb-1.5">
                  Synthesis Model Engine <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={newTtsModel}
                  onChange={(e) => {
                    const mod = e.target.value as 'timbre-v3.0' | 'timbre-v2.5';
                    setNewTtsModel(mod);
                    setNewVoice(mod === 'timbre-v3.0' ? 'Shivani' : 'Nalini');
                  }}
                  className="w-full bg-[#080A0E] border border-[#222938] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F3F4F6] outline-none transition-colors"
                >
                  <option value="timbre-v3.0">Timbre v3.0 (Indic-Expressive Sovereign)</option>
                  <option value="timbre-v2.5">Timbre v2.5 (Telephony Baseline)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#94A3B8] mb-1.5">
                  Voice Persona <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={newVoice}
                  onChange={(e) => setNewVoice(e.target.value)}
                  className="w-full bg-[#080A0E] border border-[#222938] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F3F4F6] outline-none transition-colors"
                >
                  {(newTtsModel === 'timbre-v3.0' ? V3_PERSONAS : V25_PERSONAS).map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.gender}) — {p.character}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Channel Audio Format */}
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] mb-1.5">
                Audio Channel & Sample Rate
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  newChannel === 'standard'
                    ? 'bg-[#4F8CFF]/15 border-[#4F8CFF] text-[#F3F4F6]'
                    : 'bg-[#080A0E] border-[#222938] text-[#94A3B8]'
                }`}>
                  <input
                    type="radio"
                    name="channel"
                    value="standard"
                    checked={newChannel === 'standard'}
                    onChange={() => setNewChannel('standard')}
                    className="text-[#4F8CFF]"
                  />
                  <div>
                    <div className="text-xs font-medium">Standard Hi-Fi</div>
                    <div className="text-[10px] text-[#64748B]">16kHz / 24kHz Studio Audio</div>
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  newChannel === 'tel_8k'
                    ? 'bg-[#4F8CFF]/15 border-[#4F8CFF] text-[#F3F4F6]'
                    : 'bg-[#080A0E] border-[#222938] text-[#94A3B8]'
                }`}>
                  <input
                    type="radio"
                    name="channel"
                    value="tel_8k"
                    checked={newChannel === 'tel_8k'}
                    onChange={() => setNewChannel('tel_8k')}
                    className="text-[#4F8CFF]"
                  />
                  <div>
                    <div className="text-xs font-medium">Telephony IVR</div>
                    <div className="text-[10px] text-[#64748B]">8kHz μ-law / Bandpass</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Reference Spoken Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-[#94A3B8]">
                  Reference Spoken Text <span className="text-[#EF4444]">*</span>
                </label>
                <span className="text-[10px] text-[#64748B] font-mono">Devanagari or Hinglish supported</span>
              </div>
              <textarea
                required
                rows={3}
                placeholder="e.g. आपकी अगली किस्त ₹4,250 12 नवंबर तक देय है। लेट पेमेंट चार्ज ₹150 लागू हो सकता है।"
                value={newReferenceText}
                onChange={(e) => setNewReferenceText(e.target.value)}
                className="w-full bg-[#080A0E] border border-[#222938] focus:border-[#4F8CFF] rounded-lg p-3 text-xs text-[#F3F4F6] placeholder-[#64748B] font-devanagari outline-none transition-colors"
              />
            </div>

            {/* Critical Phrases */}
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] mb-1.5">
                Critical Phrases / Mandatory Tokens (comma-separated)
              </label>
              <input
                type="text"
                placeholder="₹4,250, 12 नवंबर, लेट फीस ₹150"
                value={newCriticalPhrases}
                onChange={(e) => setNewCriticalPhrases(e.target.value)}
                className="w-full bg-[#080A0E] border border-[#222938] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F3F4F6] placeholder-[#64748B] font-devanagari outline-none transition-colors"
              />
              <p className="mt-1 text-[10px] text-[#64748B]">
                Dual-ASR Jury (Prisma v2.5 & v3.0) will cross-verify each token against synthesised audio.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1D2230]">
              <button
                type="button"
                onClick={() => setShowNewCaseModal(false)}
                disabled={creatingCase}
                className="px-4 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F3F4F6] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creatingCase}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#4F8CFF] hover:bg-[#3D78E6] disabled:opacity-50 text-white transition-all shadow-md"
              >
                {creatingCase ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{creatingCase ? 'Creating Scenario...' : 'Create Scenario'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  );
};
