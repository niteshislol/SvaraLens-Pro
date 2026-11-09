import React, { useState, useEffect } from 'react';
import {
  Swords, Play, Loader2, Sparkles, AlertTriangle, CheckCircle2,
  Clock, Volume2, ShieldAlert, Zap, ArrowRight, Phone, RefreshCw, BarChart2
} from 'lucide-react';
import { runArenaComparison, fetchArenaModels, fetchTestCases } from '../api/client';
import { ArenaComparisonResponse, ModelOption, TestCase } from '../types';
import { WaveformPlayer } from '../components/WaveformPlayer';

interface MultiModelArenaProps {
  onNavigateToReview?: (runId: string) => void;
  onNavigateToCapsule?: (capsuleId: string) => void;
}

export const MultiModelArena: React.FC<MultiModelArenaProps> = ({
  onNavigateToReview,
  onNavigateToCapsule
}) => {
  const [ttsModels, setTtsModels] = useState<ModelOption[]>([]);
  const [asrModels, setAsrModels] = useState<ModelOption[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  
  // Selection state
  const [selectedCaseId, setSelectedCaseId] = useState<string>('TC-014');
  const [ttsModel, setTtsModel] = useState<string>('timbre-v2.5');
  const [modelA, setModelA] = useState<string>('prisma-v2.5');
  const [modelB, setModelB] = useState<string>('whisper-large-v3');
  const [channel, setChannel] = useState<string>('pstn_8k');
  const [injectedFault, setInjectedFault] = useState<string>('NONE');
  
  const [customText, setCustomText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ArenaComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArenaModels()
      .then(res => {
        setTtsModels(res.tts_models);
        setAsrModels(res.asr_models);
      })
      .catch(console.error);

    fetchTestCases('suite-insurance-hi')
      .then(cases => {
        setTestCases(cases);
        const tc14 = cases.find(c => c.id === 'TC-014');
        if (tc14) setCustomText(tc14.reference_text);
      })
      .catch(console.error);
  }, []);

  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    if (caseId === 'custom') {
      setCustomText('');
    } else {
      const found = testCases.find(c => c.id === caseId);
      if (found) setCustomText(found.reference_text);
    }
  };

  const handleRunComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await runArenaComparison({
        case_id: selectedCaseId !== 'custom' ? selectedCaseId : undefined,
        reference_text: customText || undefined,
        tts_model: ttsModel,
        model_a: modelA,
        model_b: modelB,
        channel: channel,
        injected_fault: injectedFault !== 'NONE' ? injectedFault : undefined
      });
      setComparison(res);
    } catch (e: any) {
      setError(e.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  // Run on mount once default case is loaded
  useEffect(() => {
    if (testCases.length > 0 && !comparison) {
      handleRunComparison();
    }
  }, [testCases]);

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262B36]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-[#4F8CFF]/20 text-[#4F8CFF]">
              <Swords className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F8CFF] font-semibold">
              Comparative Speech Arena
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
              Gnani Research Evaluator
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#E6E8EE]">
            Multi-Model ASR Benchmark & Stress-Test Arena
          </h1>
          <p className="text-xs text-[#9AA3B2] mt-0.5">
            Benchmark <strong>Gnani Pure-Play Streaming ASR (Prisma)</strong> directly against <strong>Seq2Seq LLM-Augmented ASR (Whisper)</strong> under simulated Indian telephony (8kHz G.711) and rural noise conditions.
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#4F8CFF] to-[#3B6BDC] hover:from-[#3D78E6] hover:to-[#2F57B5] text-white transition-all shadow-md shadow-[#4F8CFF]/20 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          <span>Run A/B Benchmark</span>
        </button>
      </div>

      {/* Control Panel Bar */}
      <div className="bg-[#171A21] border border-[#262B36] rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Test Case Selector */}
          <div>
            <label className="block text-[11px] font-mono text-[#9AA3B2] uppercase mb-1">Test Scenario</label>
            <select
              value={selectedCaseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              className="w-full bg-[#0F1115] border border-[#262B36] rounded-lg px-2.5 py-1.5 text-xs text-[#E6E8EE] outline-none font-mono"
            >
              {testCases.map(c => (
                <option key={c.id} value={c.id}>{c.id}: {c.scenario.slice(0, 26)}...</option>
              ))}
              <option value="custom">Custom Reference Script</option>
            </select>
          </div>

          {/* 2. TTS Voice Generator */}
          <div>
            <label className="block text-[11px] font-mono text-[#9AA3B2] uppercase mb-1">TTS Speech Engine</label>
            <select
              value={ttsModel}
              onChange={(e) => setTtsModel(e.target.value)}
              className="w-full bg-[#0F1115] border border-[#262B36] rounded-lg px-2.5 py-1.5 text-xs text-[#E6E8EE] outline-none font-mono"
            >
              <option value="timbre-v2.5">Gnani Timbre v2.5 (Nalini)</option>
              <option value="timbre-v3.0">Gnani Timbre v3.0 (Frontier)</option>
              <option value="bulbul-v1">Sarvam Bulbul v1</option>
            </select>
          </div>

          {/* 3. Telephony Channel */}
          <div>
            <label className="block text-[11px] font-mono text-[#9AA3B2] uppercase mb-1">Acoustic Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full bg-[#0F1115] border border-[#262B36] rounded-lg px-2.5 py-1.5 text-xs text-[#E6E8EE] outline-none font-mono"
            >
              <option value="pstn_8k">PSTN 8kHz (G.711 μ-law)</option>
              <option value="noisy_telephony">KathBath Noisy (18dB SNR)</option>
              <option value="standard">Studio 16kHz Clean</option>
            </select>
          </div>

          {/* 4. Model A Selector */}
          <div>
            <label className="block text-[11px] font-mono text-[#4F8CFF] uppercase font-bold mb-1">Model A (Primary)</label>
            <select
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              className="w-full bg-[#0F1115] border border-[#4F8CFF]/50 rounded-lg px-2.5 py-1.5 text-xs text-[#4F8CFF] font-semibold outline-none font-mono"
            >
              <option value="prisma-v2.5">Gnani Prisma v2.5</option>
              <option value="prisma-v3.0">Gnani Prisma v3.0 (Frontier)</option>
            </select>
          </div>

          {/* 5. Model B Selector */}
          <div>
            <label className="block text-[11px] font-mono text-[#A78BFA] uppercase font-bold mb-1">Model B (Competitor)</label>
            <select
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              className="w-full bg-[#0F1115] border border-[#A78BFA]/50 rounded-lg px-2.5 py-1.5 text-xs text-[#A78BFA] font-semibold outline-none font-mono"
            >
              <option value="whisper-large-v3">OpenAI Whisper Large-v3</option>
              <option value="saaras-v1">Sarvam Saaras v1</option>
            </select>
          </div>
        </div>

        {/* Demo Injected Fault Toggle */}
        <div className="mt-3 pt-3 border-t border-[#262B36] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#9AA3B2] font-mono text-[11px]">Fault Injection:</span>
            <select
              value={injectedFault}
              onChange={(e) => setInjectedFault(e.target.value)}
              className="bg-[#0F1115] border border-[#262B36] text-[#E6E8EE] px-2 py-1 rounded text-xs font-mono"
            >
              <option value="NONE">Clean Spoken Input</option>
              <option value="END_TRUNCATION">Injected End-of-Speech Truncation</option>
            </select>
          </div>

          <div className="text-[11px] text-[#9AA3B2] font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2FBF71]" />
            <span>NIST Formula: Aggregate WER = (S+D+I)/N</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#F04D4D]/10 border border-[#F04D4D]/30 rounded-lg p-3 text-xs text-[#F04D4D] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Audio Player Card with Channel Specifications */}
          <div className="bg-[#171A21] border border-[#262B36] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#4F8CFF]" />
                <span className="text-xs font-mono font-bold text-[#E6E8EE]">
                  Evaluated Spoken Audio Stream ({comparison.duration_s}s)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#4F8CFF]/10 text-[#4F8CFF] border border-[#4F8CFF]/30">
                  {comparison.channel_meta.codec} • {comparison.channel_meta.sample_rate}Hz • {comparison.channel_meta.bandwidth_hz}Hz
                </span>
              </div>

              <div className="text-[11px] font-mono text-[#9AA3B2]">
                TTS: <span className="text-[#E6E8EE]">{comparison.tts_result.model}</span> ({comparison.tts_result.latency_ms}ms)
              </div>
            </div>

            <audio controls src={comparison.audio_url} className="w-full h-10 outline-none" />

            {/* Reference Ground Truth Display */}
            <div className="mt-3 bg-[#0F1115] border border-[#262B36] rounded-lg p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9AA3B2] mb-1">
                Reference Ground Truth Script
              </div>
              <p className="text-sm font-devanagari text-[#E6E8EE] leading-relaxed">
                {comparison.reference_text}
              </p>
            </div>
          </div>

          {/* Delta Scorecard Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#12151C] border border-[#262B36] rounded-xl p-4">
            <div className="border-r border-[#262B36]/50 pr-3">
              <div className="text-[10px] font-mono uppercase text-[#9AA3B2]">WER Difference</div>
              <div className={`text-lg font-bold font-mono mt-0.5 ${
                comparison.delta.wer_diff <= 0 ? 'text-[#2FBF71]' : 'text-[#F5A524]'
              }`}>
                {comparison.delta.wer_diff > 0 ? `+${(comparison.delta.wer_diff * 100).toFixed(1)}%` : `${(comparison.delta.wer_diff * 100).toFixed(1)}%`}
              </div>
              <div className="text-[10px] text-[#9AA3B2] font-mono truncate">
                More accurate: <span className="text-[#E6E8EE] font-bold">{comparison.delta.more_accurate_model}</span>
              </div>
            </div>

            <div className="border-r border-[#262B36]/50 pr-3">
              <div className="text-[10px] font-mono uppercase text-[#9AA3B2]">Latency Differential</div>
              <div className="text-lg font-bold font-mono mt-0.5 text-[#4F8CFF]">
                {Math.abs(comparison.delta.latency_diff_ms)} ms
              </div>
              <div className="text-[10px] text-[#9AA3B2] font-mono truncate">
                Faster engine: <span className="text-[#E6E8EE] font-bold">{comparison.delta.faster_model}</span>
              </div>
            </div>

            <div className="border-r border-[#262B36]/50 pr-3">
              <div className="text-[10px] font-mono uppercase text-[#9AA3B2]">Model A Latency</div>
              <div className="text-lg font-bold font-mono mt-0.5 text-[#4F8CFF]">
                {comparison.model_a.latency_ms} ms
              </div>
              <div className="text-[10px] text-[#9AA3B2] font-mono">{comparison.model_a.provider}</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#9AA3B2]">Model B Latency</div>
              <div className="text-lg font-bold font-mono mt-0.5 text-[#A78BFA]">
                {comparison.model_b.latency_ms} ms
              </div>
              <div className="text-[10px] text-[#9AA3B2] font-mono">{comparison.model_b.provider}</div>
            </div>
          </div>

          {/* Side-by-Side Model Comparison Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Model A Card */}
            <div className="bg-[#171A21] border-2 border-[#4F8CFF]/50 rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#262B36] mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4F8CFF]" />
                      <h3 className="text-base font-bold text-[#E6E8EE]">
                        Model A: {comparison.model_a.model_id}
                      </h3>
                    </div>
                    <p className="text-xs text-[#9AA3B2] font-mono mt-0.5">
                      {comparison.model_a.provider} • Pure-Play Acoustic
                    </p>
                  </div>

                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#4F8CFF]/20 text-[#4F8CFF] border border-[#4F8CFF]/40 font-bold">
                    WER: {(comparison.model_a.metrics.wer * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Score Pills */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center font-mono text-xs">
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">CER</div>
                    <div className="font-bold text-[#E6E8EE]">{(comparison.model_a.metrics.cer * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">Sub (S)</div>
                    <div className="font-bold text-[#F5A524]">{comparison.model_a.metrics.substitutions}</div>
                  </div>
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">Del (D)</div>
                    <div className="font-bold text-[#F04D4D]">{comparison.model_a.metrics.deletions}</div>
                  </div>
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">Ins (I)</div>
                    <div className="font-bold text-[#4F8CFF]">{comparison.model_a.metrics.insertions}</div>
                  </div>
                </div>

                {/* Recognized Transcript */}
                <div className="bg-[#0F1115] border border-[#262B36] rounded-lg p-3.5 mb-4">
                  <div className="text-[10px] font-mono uppercase text-[#9AA3B2] mb-1.5 flex items-center justify-between">
                    <span>Recognized Output</span>
                    <span className="text-[#4F8CFF]">{comparison.model_a.transcript.length} chars</span>
                  </div>
                  <p className="text-sm font-devanagari text-[#E6E8EE] leading-relaxed">
                    {comparison.model_a.transcript}
                  </p>
                </div>

                {/* Findings & Checks */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-[#9AA3B2] uppercase">
                    Detected Findings ({comparison.model_a.findings.length}):
                  </div>
                  {comparison.model_a.findings.length === 0 ? (
                    <div className="text-xs font-mono text-[#2FBF71] flex items-center gap-1.5 p-2 rounded bg-[#2FBF71]/10 border border-[#2FBF71]/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Zero speech or content fidelity defects detected.</span>
                    </div>
                  ) : (
                    comparison.model_a.findings.map(f => (
                      <div key={f.id} className="text-xs p-2 rounded bg-[#0F1115] border border-[#262B36] flex items-start gap-2">
                        <span className={`text-[10px] font-mono px-1 rounded uppercase shrink-0 ${
                          f.status === 'FAIL' ? 'bg-[#F04D4D]/20 text-[#F04D4D]' : 'bg-[#F5A524]/20 text-[#F5A524]'
                        }`}>{f.status}</span>
                        <span className="text-[#E6E8EE] font-mono text-[11px]">{f.check_type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Model B Card */}
            <div className="bg-[#171A21] border-2 border-[#A78BFA]/50 rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#262B36] mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
                      <h3 className="text-base font-bold text-[#E6E8EE]">
                        Model B: {comparison.model_b.model_id}
                      </h3>
                    </div>
                    <p className="text-xs text-[#9AA3B2] font-mono mt-0.5">
                      {comparison.model_b.provider} • Seq2Seq LLM-Augmented
                    </p>
                  </div>

                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40 font-bold">
                    WER: {(comparison.model_b.metrics.wer * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Score Pills */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center font-mono text-xs">
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">CER</div>
                    <div className="font-bold text-[#E6E8EE]">{(comparison.model_b.metrics.cer * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">Sub (S)</div>
                    <div className="font-bold text-[#F5A524]">{comparison.model_b.metrics.substitutions}</div>
                  </div>
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">Del (D)</div>
                    <div className="font-bold text-[#F04D4D]">{comparison.model_b.metrics.deletions}</div>
                  </div>
                  <div className="bg-[#0F1115] p-2 rounded border border-[#262B36]">
                    <div className="text-[10px] text-[#9AA3B2]">Ins (I)</div>
                    <div className="font-bold text-[#4F8CFF]">{comparison.model_b.metrics.insertions}</div>
                  </div>
                </div>

                {/* Recognized Transcript */}
                <div className="bg-[#0F1115] border border-[#262B36] rounded-lg p-3.5 mb-4">
                  <div className="text-[10px] font-mono uppercase text-[#9AA3B2] mb-1.5 flex items-center justify-between">
                    <span>Recognized Output</span>
                    <span className="text-[#A78BFA]">{comparison.model_b.transcript.length} chars</span>
                  </div>
                  <p className="text-sm font-devanagari text-[#E6E8EE] leading-relaxed">
                    {comparison.model_b.transcript}
                  </p>
                </div>

                {/* Findings & Checks */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-[#9AA3B2] uppercase">
                    Detected Findings ({comparison.model_b.findings.length}):
                  </div>
                  {comparison.model_b.findings.length === 0 ? (
                    <div className="text-xs font-mono text-[#2FBF71] flex items-center gap-1.5 p-2 rounded bg-[#2FBF71]/10 border border-[#2FBF71]/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Zero speech or content fidelity defects detected.</span>
                    </div>
                  ) : (
                    comparison.model_b.findings.map(f => (
                      <div key={f.id} className="text-xs p-2 rounded bg-[#0F1115] border border-[#262B36] flex items-start gap-2">
                        <span className={`text-[10px] font-mono px-1 rounded uppercase shrink-0 ${
                          f.status === 'FAIL' ? 'bg-[#F04D4D]/20 text-[#F04D4D]' : 'bg-[#F5A524]/20 text-[#F5A524]'
                        }`}>{f.status}</span>
                        <span className="text-[#E6E8EE] font-mono text-[11px]">{f.check_type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
