import React from 'react';
import { Run, Finding } from '../types';
import { Check, AlertTriangle, AlertCircle, Clock, HelpCircle, ChevronRight, Download } from 'lucide-react';

export type HealthCategory = 'HEALTHY' | 'ATTENTION_REQUIRED' | 'CRITICAL_ISSUE' | 'NEEDS_REVIEW' | 'NOT_EVALUATED';

interface CompactAudioHealthProps {
  run: Run | null;
  onOpenDetails?: () => void;
}

export const CompactAudioHealth: React.FC<CompactAudioHealthProps> = ({ run, onOpenDetails }) => {
  // Determine actual, honest health category from run data
  const determineHealth = (): {
    category: HealthCategory;
    label: string;
    color: string;
    strokeColor: string;
    percentage: number;
    icon: React.ReactNode;
  } => {
    if (!run || !run.audio_path) {
      return {
        category: 'NOT_EVALUATED',
        label: 'Not Evaluated',
        color: '#64748B',
        strokeColor: '#CBD5E1',
        percentage: 0,
        icon: <HelpCircle className="w-5 h-5 text-[#94A3B8]" />
      };
    }

    const findings = run.findings || [];
    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL' && f.status !== 'FAIL');
    const confirmedFails = findings.filter(f => f.status === 'FAIL');
    const warnings = findings.filter(f => f.status === 'WARN');
    const unreviewed = findings.filter(f => f.review_state === 'AUTO_DETECTED' || f.status === 'SUSPECTED');

    if (confirmedFails.length > 0 || criticalFindings.length > 0) {
      return {
        category: 'CRITICAL_ISSUE',
        label: 'Critical Issue',
        color: '#D94848',
        strokeColor: '#D94848',
        percentage: 45,
        icon: <AlertCircle className="w-5 h-5 text-[#D94848]" />
      };
    }

    if (warnings.length > 0) {
      return {
        category: 'ATTENTION_REQUIRED',
        label: 'Attention Req.',
        color: '#D99520',
        strokeColor: '#D99520',
        percentage: 75,
        icon: <AlertTriangle className="w-5 h-5 text-[#D99520]" />
      };
    }

    if (unreviewed.length > 0) {
      return {
        category: 'NEEDS_REVIEW',
        label: 'Needs Review',
        color: '#7856D9',
        strokeColor: '#7856D9',
        percentage: 85,
        icon: <Clock className="w-5 h-5 text-[#7856D9]" />
      };
    }

    return {
      category: 'HEALTHY',
      label: 'Healthy',
      color: '#16A36A',
      strokeColor: '#16A36A',
      percentage: 100,
      icon: <Check className="w-5 h-5 text-[#16A36A]" strokeWidth={2.5} />
    };
  };

  const health = determineHealth();

  // Metrics beside the ring
  const durationText = run?.duration_s != null ? `${run.duration_s.toFixed(1)}s` : '—';
  const clipRatio = run?.metrics?.clip_ratio != null ? `${(run.metrics.clip_ratio * 100).toFixed(1)}%` : '0.0%';
  const hasClipping = (run?.metrics?.clip_ratio || 0) > 0.001;

  const silenceFindings = run?.findings?.filter(f => f.check_type === 'UNEXPECTED_SILENCE' || f.check_type === 'PROSODY_PAUSE');
  const silenceStatus = silenceFindings && silenceFindings.length > 0 ? 'Warning' : 'OK';

  const phraseFindings = run?.findings?.filter(f => f.check_type === 'CRITICAL_PHRASE_MISSING');
  const phrasesStatus = phraseFindings && phraseFindings.length > 0 ? 'Missing' : 'OK';

  // Key findings summary
  const getKeyFindings = () => {
    if (!run || !run.audio_path) return ['No audio evaluated yet.'];
    const findings = run.findings || [];
    if (findings.length === 0) {
      return ['Audio quality looks good', 'No acoustic clipping or silence defects'];
    }
    return findings.slice(0, 2).map(f => {
      if (f.check_type === 'END_TRUNCATION') return 'Possible end truncation detected';
      if (f.check_type === 'CRITICAL_PHRASE_MISSING') return 'Required phrase missing in transcript';
      if (f.check_type === 'CLIPPING') return 'Acoustic clipping detected';
      if (f.check_type === 'UNEXPECTED_SILENCE') return 'Excessive silence gap identified';
      return f.reviewer_note || f.check_type.replace(/_/g, ' ').toLowerCase();
    });
  };

  const keyFindings = getKeyFindings();

  // SVG circle geometry
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (health.percentage / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Circle + Metrics Row (Exact Match to Reference Image A) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Circular Progress Gauge */}
        <div className="relative flex items-center justify-center shrink-0 w-[114px] h-[114px]">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#E2E8F0"
              strokeWidth="6.5"
              fill="transparent"
            />
            {/* Value arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={health.strokeColor}
              strokeWidth="6.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {health.icon}
            <span
              className="text-[12px] font-semibold tracking-tight mt-0.5"
              style={{ color: health.color }}
            >
              {health.label}
            </span>
          </div>
        </div>

        {/* Compact Vertical Metrics Alongside Ring */}
        <div className="flex-1 space-y-1.5 text-xs text-[#172033]">
          {/* Duration */}
          <div className="flex items-center justify-between py-0.5">
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className="w-3.5 h-3.5 rounded-full bg-[#EAF8F0] text-[#16A36A] flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span>Duration</span>
            </span>
            <span className="font-mono font-medium text-[#172033]">{durationText}</span>
          </div>

          {/* Clipping */}
          <div className="flex items-center justify-between py-0.5">
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                hasClipping ? 'bg-[#FFF0F0] text-[#D94848]' : 'bg-[#EAF8F0] text-[#16A36A]'
              }`}>
                {hasClipping ? '!' : '✓'}
              </span>
              <span>Clipping</span>
            </span>
            <span className="font-mono font-medium text-[#172033]">{clipRatio}</span>
          </div>

          {/* Silence */}
          <div className="flex items-center justify-between py-0.5">
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                silenceStatus !== 'OK' ? 'bg-[#FFF7E8] text-[#D99520]' : 'bg-[#EAF8F0] text-[#16A36A]'
              }`}>
                {silenceStatus !== 'OK' ? '!' : '✓'}
              </span>
              <span>Silence</span>
            </span>
            <span className={`font-mono font-medium ${
              silenceStatus !== 'OK' ? 'text-[#D99520]' : 'text-[#16A36A]'
            }`}>
              {silenceStatus}
            </span>
          </div>

          {/* Critical Phrases */}
          <div className="flex items-center justify-between py-0.5">
            <span className="flex items-center gap-1.5 text-[#64748B]">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                phrasesStatus !== 'OK' ? 'bg-[#FFF0F0] text-[#D94848]' : 'bg-[#EAF8F0] text-[#16A36A]'
              }`}>
                {phrasesStatus !== 'OK' ? '✕' : '✓'}
              </span>
              <span>Phrases</span>
            </span>
            <span className={`font-mono font-medium ${
              phrasesStatus !== 'OK' ? 'text-[#D94848]' : 'text-[#16A36A]'
            }`}>
              {phrasesStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Key Findings Section (Reference A) */}
      <div className="pt-2 border-t border-[#E7ECF3]">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
          Key Findings
        </h4>
        <div className="space-y-1.5">
          {keyFindings.map((finding, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-[#172033]">
              <span className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center text-[10px] ${
                health.category === 'HEALTHY' ? 'bg-[#EAF8F0] text-[#16A36A]' : 'bg-[#FFF7E8] text-[#D99520]'
              }`}>
                {health.category === 'HEALTHY' ? '✓' : '!'}
              </span>
              <span className="leading-snug">{finding}</span>
            </div>
          ))}
        </div>

        {/* Minimal View Details Button (Reference A) */}
        {onOpenDetails && (
          <button
            onClick={onOpenDetails}
            className="w-full mt-3 py-1.5 px-3 rounded-lg border border-[#E7ECF3] bg-white hover:bg-[#F8FAFC] text-xs font-medium text-[#172033] hover:text-[#3867E8] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>View Details</span>
          </button>
        )}
      </div>
    </div>
  );
};
