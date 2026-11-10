import type { ReactNode } from 'react'
import { useReveal } from '../../lib/hooks'

export function SectionLabel({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`eyebrow mb-6 ${dark ? '!text-white/60' : ''}`}>{children}</p>
}

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/** Deterministic pseudo-speech envelope for illustrative waveforms. */
export function envelope(n: number, seed = 1): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const syl = Math.pow(Math.abs(Math.sin(t * Math.PI * 7.3 + seed)), 1.4)
    const slow = 0.55 + 0.45 * Math.sin(t * Math.PI * 2.1 + seed * 2)
    const jit = 0.82 + 0.18 * Math.sin(i * 1.9 + seed)
    out.push(Math.max(0.06, Math.min(1, (0.12 + 0.88 * syl) * slow * jit)))
  }
  return out
}

interface BarsProps {
  n?: number
  seed?: number
  width?: number
  height?: number
  /** index range (inclusive) that is highlighted */
  mark?: [number, number]
  markColor?: string
  /** index range rendered as a break */
  gap?: [number, number]
  color?: string
  className?: string
}

export function WaveBars({
  n = 72,
  seed = 1,
  width = 480,
  height = 90,
  mark,
  markColor = '#E36B55',
  gap,
  color = '#15171B',
  className,
}: BarsProps) {
  const env = envelope(n, seed)
  const step = width / n
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      {env.map((v, i) => {
        const inGap = gap && i >= gap[0] && i <= gap[1]
        const inMark = mark && i >= mark[0] && i <= mark[1]
        const h = inGap ? 2 : v * height * 0.92
        return (
          <rect
            key={i}
            x={i * step + step * 0.22}
            y={(height - h) / 2}
            width={step * 0.56}
            height={h}
            rx={step * 0.28}
            fill={inMark ? markColor : color}
            opacity={inMark ? 1 : 0.88}
          />
        )
      })}
    </svg>
  )
}

export function Arrow() {
  return <span aria-hidden="true">→</span>
}
