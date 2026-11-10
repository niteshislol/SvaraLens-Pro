export function Symbol({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  const ink = dark ? '#FFFFFF' : '#15171B'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g fill={ink}>
        <rect x="3" y="20" width="3.4" height="8" rx="1.7" />
        <rect x="9.5" y="14" width="3.4" height="20" rx="1.7" />
        <rect x="16" y="6" width="3.4" height="36" rx="1.7" />
        <rect x="22.5" y="16" width="3.4" height="16" rx="1.7" />
      </g>
      <circle cx="35.5" cy="24" r="8.5" stroke={dark ? '#8EA1FF' : '#3858E9'} strokeWidth="3.4" />
      <rect x="33.8" y="14" width="3.4" height="6" rx="1.7" fill="#E36B55" />
    </svg>
  )
}

export default function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Symbol dark={dark} />
      <span className={`text-[23px] font-semibold tracking-[-0.04em] ${dark ? 'text-white' : 'text-ink'}`}>SvaraLens</span>
      {!compact && (
        <>
          <span className={`hidden h-7 w-px sm:block ${dark ? 'bg-white/25' : 'bg-line'}`} aria-hidden="true" />
          <span
            className={`hidden font-mono text-[9.5px] uppercase leading-[1.5] tracking-[0.2em] sm:block ${dark ? 'text-white/60' : 'text-ink-2'}`}
          >
            Indic voice
            <br />
            engineering
          </span>
        </>
      )}
    </span>
  )
}
