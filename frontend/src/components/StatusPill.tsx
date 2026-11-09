import React from 'react';
import {
  CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, XCircle, ShieldCheck
} from 'lucide-react';

export type PillVariant =
  | 'PASS'
  | 'WARN'
  | 'SUSPECTED'
  | 'NEEDS_REVIEW'
  | 'NEEDS REVIEW'
  | 'CONFIRMED_FAIL'
  | 'CONFIRMED FAIL'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'FALSE POSITIVE'
  | 'STILL_FAILING'
  | 'REGRESSED';

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md' }) => {
  const norm = status.toUpperCase().replace('_', ' ');

  let bg = 'bg-[#171A21]';
  let border = 'border-[#262B36]';
  let text = 'text-[#9AA3B2]';
  let icon = <HelpCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;

  switch (norm) {
    case 'PASS':
    case 'RESOLVED':
      bg = 'bg-[#2FBF71]/10';
      border = 'border-[#2FBF71]/30';
      text = 'text-[#2FBF71]';
      icon = <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      break;

    case 'WARN':
      bg = 'bg-[#F5A524]/10';
      border = 'border-[#F5A524]/30';
      text = 'text-[#F5A524]';
      icon = <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      break;

    case 'SUSPECTED':
    case 'NEEDS REVIEW':
      bg = 'bg-[#A78BFA]/10';
      border = 'border-[#A78BFA]/30';
      text = 'text-[#A78BFA]';
      icon = <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      break;

    case 'CONFIRMED FAIL':
    case 'FAIL':
    case 'STILL FAILING':
    case 'REGRESSED':
      bg = 'bg-[#F04D4D]/10';
      border = 'border-[#F04D4D]/30';
      text = 'text-[#F04D4D]';
      icon = <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      break;

    case 'FALSE POSITIVE':
      bg = 'bg-[#9AA3B2]/10';
      border = 'border-[#9AA3B2]/30';
      text = 'text-[#9AA3B2]';
      icon = <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      break;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${bg} ${border} ${text} ${padding} tracking-wide`}>
      {icon}
      <span>{norm}</span>
    </span>
  );
};
