import React, { useEffect, useState } from 'react';
import {
  BarChart3, ShieldAlert, Award, FileSpreadsheet, ExternalLink,
  Info, CheckCircle2, AlertTriangle, Layers, Phone, Mic, Sparkles
} from 'lucide-react';
import { fetchBenchmarkMatrix } from '../api/client';
import { BenchmarkMatrixResponse } from '../types';

export const BenchmarkMatrix: React.FC = () => {
  const [data, setData] = useState<BenchmarkMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenchmarkMatrix()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262B36]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-[#A78BFA]/20 text-[#A78BFA]">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] font-semibold">
              Gnani Research Benchmark Suite
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#E6E8EE]">
            Indic ASR Model Performance Matrix
          </h1>
          <p className="text-xs text-[#9AA3B2] mt-0.5 max-w-3xl">
            Empirical evaluations grounded in Gnani AI’s technical deep-dive: <em>"Benchmarking Indic ASR Models: A Technical Deep-Dive into WER, CER, and Indic Dataset Methodology"</em>.
          </p>
        </div>

        <a
          href="https://www.gnani.ai/resources/research/benchmarking-indic-asr-models-a-technical-deep-dive"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#171A21] hover:bg-[#262B36] text-[#E6E8EE] border border-[#262B36] transition-colors shrink-0"
        >
          <span>Read Research Paper</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#4F8CFF]" />
        </a>
      </div>

      {/* The Core Finding: Laboratory vs Reality Gap Banner */}
      <div className="bg-gradient-to-r from-[#171A21] via-[#1A1F2B] to-[#171A21] border border-[#262B36] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#F5A524]/10 text-[#F5A524] border border-[#F5A524]/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E6E8EE]">
              The Benchmark vs. Production Reality Gap (~60% Discrepancy)
            </h3>
            <p className="text-xs text-[#9AA3B2] mt-1 leading-relaxed">
              Standard academic benchmarks (FLEURS, CommonVoice) use clean, read speech that does not reflect enterprise customer care. A model that achieves <strong>8% WER on clean studio audio</strong> often degrades to <strong>25–38% WER</strong> on 8kHz telephony (KathBath Noisy) and rural Tier-2/3 dialects (GramVaani).
            </p>
          </div>
        </div>
      </div>

      {/* Dataset Profiles Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#E6E8EE] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#4F8CFF]" />
          <span>Evaluation Dataset Corpus Profiles</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {data?.datasets.map(d => (
            <div key={d.id} className="bg-[#171A21] border border-[#262B36] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-xs text-[#E6E8EE]">{d.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0F1115] border border-[#262B36] text-[#4F8CFF]">
                    {d.hours}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#A78BFA] mb-2">{d.publisher}</div>
                <p className="text-xs text-[#9AA3B2] leading-relaxed mb-3">
                  {d.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#262B36] text-[10px] font-mono text-[#9AA3B2]">
                Target: <span className="text-[#2FBF71]">{d.relevance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Benchmark Matrix Table */}
      <div className="bg-[#171A21] border border-[#262B36] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#262B36] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#E6E8EE]">
              Cross-Model Empirical Benchmark Matrix
            </h3>
            <p className="text-xs text-[#9AA3B2] mt-0.5">
              Evaluated strictly via production APIs. Scored with NIST Aggregate WER formula: (S+D+I)/N.
            </p>
          </div>

          <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#0F1115] border border-[#262B36] text-[#9AA3B2]">
            NIST jiwer standard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#12151C] text-[#9AA3B2] border-b border-[#262B36]">
              <tr>
                <th className="p-3">Model</th>
                <th className="p-3">Architecture</th>
                <th className="p-3 text-center">KathBath Clean (WER)</th>
                <th className="p-3 text-center">PSTN Noisy (WER)</th>
                <th className="p-3 text-center">GramVaani Rural (WER)</th>
                <th className="p-3 text-center">Latency</th>
                <th className="p-3 text-center">Small Utterance Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262B36]">
              {data?.models.map(m => (
                <tr key={m.model_id} className="hover:bg-[#1A1E27] transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-[#E6E8EE]">{m.model_name}</div>
                    <div className="text-[10px] text-[#9AA3B2]">{m.provider}</div>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#0F1115] border border-[#262B36] text-[#A78BFA]">
                      {m.architecture}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-[#2FBF71]">{m.scores.kathbath_clean.wer}%</span>
                    <div className="text-[10px] text-[#9AA3B2]">CER: {m.scores.kathbath_clean.cer}%</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${
                      m.scores.kathbath_noisy.wer < 20 ? 'text-[#2FBF71]' : 'text-[#F5A524]'
                    }`}>
                      {m.scores.kathbath_noisy.wer}%
                    </span>
                    <div className="text-[10px] text-[#9AA3B2]">8kHz G.711</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${
                      m.scores.gramvaani.wer < 25 ? 'text-[#2FBF71]' : 'text-[#F04D4D]'
                    }`}>
                      {m.scores.gramvaani.wer}%
                    </span>
                    <div className="text-[10px] text-[#9AA3B2]">Tier 2/3 dialect</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-[#4F8CFF]">{m.scores.kathbath_clean.latency_ms} ms</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[11px] font-bold ${
                      m.small_utterance_retention.includes('Suppression') ? 'text-[#F04D4D]' : 'text-[#2FBF71]'
                    }`}>
                      {m.small_utterance_retention}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pure-Play vs LLM-Augmented ASR Technical Note */}
      <div className="bg-[#12151C] border border-[#262B36] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-[#E6E8EE] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#4F8CFF]" />
          <span>Research Insight: Pure-Play ASR vs. LLM-Based ASR</span>
        </h3>
        <p className="text-xs text-[#9AA3B2] leading-relaxed">
          As documented in Section 4 of Gnani AI's research, putting an LLM on top of an acoustic decoder often creates the illusion of better grammar while <strong>altering what the speaker actually said</strong>. In Indian enterprise voice applications:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-[#0F1115] border border-[#262B36] rounded-lg p-3">
            <span className="text-[#F5A524] font-bold block mb-1">Small Utterance Suppression</span>
            <p className="text-[#9AA3B2]">
              Short acknowledgments (<em>"हाँ"</em>, <em>"okay"</em>, <em>"sahi hai"</em>) are routinely dropped by LLMs aiming to produce full sentences, breaking IVR turn-taking and consent flows.
            </p>
          </div>

          <div className="bg-[#0F1115] border border-[#262B36] rounded-lg p-3">
            <span className="text-[#F5A524] font-bold block mb-1">Dialect Normalization</span>
            <p className="text-[#9AA3B2]">
              Colloquial spoken forms (e.g. <em>avanunga</em> in Tamil, <em>unko</em> in Hindi) are rewritten into formal literary registers (<em>avargal</em>, <em>unhe</em>), destroying speaker emotion and social register.
            </p>
          </div>

          <div className="bg-[#0F1115] border border-[#262B36] rounded-lg p-3">
            <span className="text-[#2FBF71] font-bold block mb-1">Pure-Play Acoustic Fidelity</span>
            <p className="text-[#9AA3B2]">
              Prisma preserves raw acoustic output without hallucinated post-processing, retaining verbatim disfluencies critical for collections and customer sentiment models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
