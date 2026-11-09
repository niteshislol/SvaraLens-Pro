import React, { useEffect, useState } from 'react';
import { Run, TestCase } from '../types';
import { fetchRun, fetchTestCase, addReview, updateFinding, compileCapsule, getAudioUrl } from '../api/client';
import { WaveformPlayer } from '../components/WaveformPlayer';
import { StatusPill } from '../components/StatusPill';
import {
  Headphones, Save, Plus, ArrowLeft, Check, FileBox, AlertTriangle,
  Sliders, MessageSquare, Star
} from 'lucide-react';

interface ReviewStudioProps {
  runId: string;
  onNavigateToRun: (runId: string) => void;
  onNavigateToCapsule: (capsuleId: string) => void;
}

export const ReviewStudio: React.FC<ReviewStudioProps> = ({
  runId,
  onNavigateToRun,
  onNavigateToCapsule
}) => {
  const [run, setRun] = useState<Run | null>(null);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);

  // Ratings 1-5
  const [pronunciation, setPronunciation] = useState<number>(4);
  const [naturalness, setNaturalness] = useState<number>(4);
  const [clarity, setClarity] = useState<number>(5);
  const [prosody, setProsody] = useState<number>(4);
  const [codeSwitching, setCodeSwitching] = useState<number>(4);
  const [delivery, setDelivery] = useState<number>(4);

  // New Annotation State
  const [startS, setStartS] = useState<number>(3.20);
  const [endS, setEndS] = useState<number>(4.10);
  const [annotationTag, setAnnotationTag] = useState<string>('MISSING_CONTENT');
  const [annotationComment, setAnnotationComment] = useState<string>('Mandatory final disclosure not audible in the clip.');
  const [annotations, setAnnotations] = useState<any[]>([
    {
      start_s: 3.20,
      end_s: 4.10,
      tag: 'MISSING_CONTENT',
      comment: 'Mandatory final disclosure not audible in the clip.'
    }
  ]);

  const [reviewerName, setReviewerName] = useState('Senior Indic QA Consultant');
  const [confirmedFindingId, setConfirmedFindingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const r = await fetchRun(runId);
      setRun(r);
      if (r.case_id) {
        const c = await fetchTestCase(r.case_id);
        setTestCase(c);
      }
      // Check if there is already a confirmed finding or candidate finding
      const target = r.findings.find(f => f.review_state === 'HUMAN_CONFIRMED') || r.findings[0];
      if (target) {
        setConfirmedFindingId(target.id);
        if (target.region_start_s !== undefined && target.region_end_s !== undefined) {
          setStartS(target.region_start_s);
          setEndS(target.region_end_s);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [runId]);

  const handleAddAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    setAnnotations([
      ...annotations,
      {
        start_s: startS,
        end_s: endS,
        tag: annotationTag,
        comment: annotationComment
      }
    ]);
  };

  const handleConfirmAndCompile = async () => {
    if (!run) return;
    try {
      // 1. Submit review
      await addReview(run.id, {
        reviewer: reviewerName,
        ratings: {
          pronunciation,
          naturalness,
          clarity,
          prosody,
          code_switching: testCase?.language === 'hinglish' ? codeSwitching : null,
          delivery
        },
        annotations
      });

      // 2. Mark finding as HUMAN_CONFIRMED
      const findingToConfirm = confirmedFindingId || run.findings[0]?.id;
      if (findingToConfirm) {
        await updateFinding(findingToConfirm, {
          review_state: 'HUMAN_CONFIRMED',
          severity: 'CRITICAL',
          reviewer_note: annotationComment,
          reviewed_by: reviewerName,
          region_start_s: startS,
          region_end_s: endS
        });

        // 3. Compile capsule
        const capsule = await compileCapsule(findingToConfirm);
        onNavigateToCapsule(capsule.id);
      } else {
        alert('Review saved.');
        onNavigateToRun(run.id);
      }
    } catch (err) {
      alert(`Error during review submission: ${err}`);
    }
  };

  if (loading || !run) {
    return (
      <div className="bg-[#171A21] border border-[#262B36] rounded-lg p-12 text-center text-[#9AA3B2] font-mono">
        Loading Review Studio for {runId}...
      </div>
    );
  }

  const audioUrl = getAudioUrl(run.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262B36]">
        <div>
          <button
            onClick={() => onNavigateToRun(run.id)}
            className="inline-flex items-center gap-1 text-xs font-mono text-[#9AA3B2] hover:text-[#E6E8EE] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Run Analysis</span>
          </button>
          <h1 className="text-xl font-bold text-[#E6E8EE] flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#A78BFA]" />
            <span>Native Language Review Studio</span>
          </h1>
          <p className="text-xs text-[#9AA3B2] mt-0.5">
            Subjective human listener evaluation for tone, pronunciation, prosody, and code-switching naturalness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirmAndCompile}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#F04D4D] hover:bg-[#E03C3C] text-white transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Defect & Compile Capsule</span>
          </button>
        </div>
      </div>

      {/* Audio Waveform with Marked Region */}
      <WaveformPlayer
        src={audioUrl}
        regionStart={startS}
        regionEnd={endS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 6 Rating Dimensions */}
        <div className="lg:col-span-6 bg-[#171A21] border border-[#262B36] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262B36] pb-3">
            <h3 className="text-sm font-semibold text-[#E6E8EE] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#4F8CFF]" />
              <span>Native Language Quality Dimensions (1–5)</span>
            </h3>
            <span className="text-[11px] font-mono text-[#9AA3B2]">Reviewer Judgement</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#E6E8EE] font-medium">Pronunciation</span>
                <span className="font-mono text-[#4F8CFF] font-bold">{pronunciation}/5</span>
              </div>
              <input
                type="range" min="1" max="5" value={pronunciation}
                onChange={(e) => setPronunciation(Number(e.target.value))}
                className="w-full accent-[#4F8CFF]"
              />
              <span className="text-[10px] text-[#9AA3B2]">Correctness of product names, numerals, and Hindi phonemes.</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#E6E8EE] font-medium">Naturalness</span>
                <span className="font-mono text-[#4F8CFF] font-bold">{naturalness}/5</span>
              </div>
              <input
                type="range" min="1" max="5" value={naturalness}
                onChange={(e) => setNaturalness(Number(e.target.value))}
                className="w-full accent-[#4F8CFF]"
              />
              <span className="text-[10px] text-[#9AA3B2]">Authenticity of Indic cadence and human conversational feel.</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#E6E8EE] font-medium">Clarity & Intelligibility</span>
                <span className="font-mono text-[#4F8CFF] font-bold">{clarity}/5</span>
              </div>
              <input
                type="range" min="1" max="5" value={clarity}
                onChange={(e) => setClarity(Number(e.target.value))}
                className="w-full accent-[#4F8CFF]"
              />
              <span className="text-[10px] text-[#9AA3B2]">Ease of comprehension of critical values and disclosures.</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#E6E8EE] font-medium">Prosody & Pausing</span>
                <span className="font-mono text-[#4F8CFF] font-bold">{prosody}/5</span>
              </div>
              <input
                type="range" min="1" max="5" value={prosody}
                onChange={(e) => setProsody(Number(e.target.value))}
                className="w-full accent-[#4F8CFF]"
              />
              <span className="text-[10px] text-[#9AA3B2]">Appropriateness of breath pauses and sentence emphasis.</span>
            </div>

            {testCase?.language === 'hinglish' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#E6E8EE] font-medium">Code-Switching Smoothness</span>
                  <span className="font-mono text-[#4F8CFF] font-bold">{codeSwitching}/5</span>
                </div>
                <input
                  type="range" min="1" max="5" value={codeSwitching}
                  onChange={(e) => setCodeSwitching(Number(e.target.value))}
                  className="w-full accent-[#4F8CFF]"
                />
                <span className="text-[10px] text-[#9AA3B2]">Voice tone consistency when transitioning between Hindi & English.</span>
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#E6E8EE] font-medium">Delivery & Pace</span>
                <span className="font-mono text-[#4F8CFF] font-bold">{delivery}/5</span>
              </div>
              <input
                type="range" min="1" max="5" value={delivery}
                onChange={(e) => setDelivery(Number(e.target.value))}
                className="w-full accent-[#4F8CFF]"
              />
              <span className="text-[10px] text-[#9AA3B2]">Appropriate manner and speed for customer notification scenario.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Audio Interval Annotation Tool */}
        <div className="lg:col-span-6 bg-[#171A21] border border-[#262B36] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262B36] pb-3">
            <h3 className="text-sm font-semibold text-[#E6E8EE] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#A78BFA]" />
              <span>Interval Defect Annotations</span>
            </h3>
            <span className="text-[11px] font-mono text-[#9AA3B2]">{annotations.length} recorded</span>
          </div>

          {/* Add Interval Form */}
          <form onSubmit={handleAddAnnotation} className="bg-[#0F1115] border border-[#262B36] rounded p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono text-[#9AA3B2] mb-1">Start Time (sec)</label>
                <input
                  type="number" step="0.01" value={startS}
                  onChange={(e) => setStartS(Number(e.target.value))}
                  className="w-full bg-[#171A21] border border-[#262B36] rounded px-2 py-1 text-xs text-[#E6E8EE] font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#9AA3B2] mb-1">End Time (sec)</label>
                <input
                  type="number" step="0.01" value={endS}
                  onChange={(e) => setEndS(Number(e.target.value))}
                  className="w-full bg-[#171A21] border border-[#262B36] rounded px-2 py-1 text-xs text-[#E6E8EE] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono text-[#9AA3B2] mb-1">Issue Category Tag</label>
                <select
                  value={annotationTag}
                  onChange={(e) => setAnnotationTag(e.target.value)}
                  className="w-full bg-[#171A21] border border-[#262B36] rounded px-2 py-1 text-xs text-[#E6E8EE]"
                >
                  <option value="MISSING_CONTENT">Missing Content / Disclosure</option>
                  <option value="PRONUNCIATION">Pronunciation Anomaly</option>
                  <option value="CLARITY">Muffled / Low Clarity</option>
                  <option value="PROSODY">Unnatural Prosody / Pauses</option>
                  <option value="CODE_SWITCH">Code-Switch Voice Shift</option>
                  <option value="OTHER">Other Acoustic Defect</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9AA3B2] mb-1">Reviewer Name</label>
                <input
                  type="text" value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-[#171A21] border border-[#262B36] rounded px-2 py-1 text-xs text-[#E6E8EE]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#9AA3B2] mb-1">Reviewer Observation Note</label>
              <input
                type="text" value={annotationComment}
                onChange={(e) => setAnnotationComment(e.target.value)}
                placeholder="Describe exact phonetic or audio anomaly..."
                className="w-full bg-[#171A21] border border-[#262B36] rounded px-2.5 py-1 text-xs text-[#E6E8EE]"
              />
            </div>

            <div className="text-right">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-[#262B36] hover:bg-[#323846] text-[#E6E8EE] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Annotation</span>
              </button>
            </div>
          </form>

          {/* Annotations List */}
          <div className="space-y-2">
            {annotations.map((ann, i) => (
              <div key={i} className="bg-[#0F1115]/50 border border-[#262B36]/60 rounded p-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[#4F8CFF] font-bold">
                      {Number(ann.start_s).toFixed(2)}s – {Number(ann.end_s).toFixed(2)}s
                    </span>
                    <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#F04D4D]/10 text-[#F04D4D] border border-[#F04D4D]/30">
                      {ann.tag}
                    </span>
                  </div>
                  <div className="text-[#E6E8EE] italic">"{ann.comment}"</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
