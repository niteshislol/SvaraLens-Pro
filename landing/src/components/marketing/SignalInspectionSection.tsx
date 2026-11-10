import { useState } from 'react'
import { Reveal, SectionLabel, envelope } from './ui'

type Mode = 'clean' | 'anomaly' | 'corrected'

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: 'clean', label: 'Clean signal', note: 'A continuous reference signal with no marked interval.' },
  {
    id: 'anomaly',
    label: 'Suspected anomaly',
    note: 'A discontinuity is marked for review. A reviewer, not the plot, decides whether it is a defect.',
  },
  { id: 'corrected', label: 'Corrected signal', note: 'The same interval after a fix, ready to re-run the original assertions.' },
]

const N = 150
const W = 1200
const H = 320
const MID = 150
const D0 = 62
const D1 = 70

export default function SignalInspectionSection() {
  const [mode, setMode] = useState<Mode>('anomaly')
  const [hover, setHover] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const env = envelope(N, 2.4)
  const step = W / N

  const shown = picked ?? hover
  const time = (i: number) => ((i / N) * 5.4).toFixed(2)

  return (
    <section id="signal" aria-labelledby="signal-title" className="py-[clamp(80px,10vw,150px)]">
      <div className="wrap">
        <Reveal className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <SectionLabel>Inspect the signal / 003</SectionLabel>
            <h2 id="signal-title" className="display max-w-[12ch] text-[clamp(38px,5vw,72px)]">
              Make the invisible measurable.
            </h2>
          </div>
          <div role="tablist" aria-label="Signal state" className="flex flex-wrap gap-2 lg:justify-end">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => {
                  setMode(m.id)
                  setPicked(null)
                }}
                className={`h-10 cursor-pointer rounded-[5px] border px-4 text-[13px] font-medium transition-colors ${
                  mode === m.id ? 'border-ink bg-ink text-white' : 'border-line bg-white/60 text-ink-2 hover:border-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-12 border border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-2">
              Illustrative demonstration
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
              Conceptual data · not a measurement
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${W} ${H + 46}`}
              className="block min-w-[640px] w-full"
              role="group"
              aria-label="Illustrative waveform with a marked interval"
            >
              {/* amplitude guides */}
              {[-1, -0.5, 0, 0.5, 1].map((g) => (
                <g key={g}>
                  <line x1="0" x2={W} y1={MID - g * 120} y2={MID - g * 120} stroke="#e4e5e0" strokeWidth={g === 0 ? 1.4 : 1} />
                  <text x="6" y={MID - g * 120 - 5} fontSize="10" fontFamily="JetBrains Mono, monospace" fill="#9AA0A8">
                    {g > 0 ? `+${g}` : g}
                  </text>
                </g>
              ))}

              {/* defect interval */}
              {mode === 'anomaly' && (
                <g>
                  <rect x={D0 * step} y="14" width={(D1 - D0 + 1) * step} height={H - 28} fill="#E36B55" opacity="0.09" />
                  <line x1={D0 * step} x2={D0 * step} y1="14" y2={H - 14} stroke="#E36B55" strokeDasharray="3 3" />
                  <line x1={(D1 + 1) * step} x2={(D1 + 1) * step} y1="14" y2={H - 14} stroke="#E36B55" strokeDasharray="3 3" />
                  <text x={D0 * step} y="10" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#C2492F">
                    SUSPECTED INTERVAL · {time(D0)}–{time(D1 + 1)}s
                  </text>
                </g>
              )}
              {mode === 'corrected' && (
                <g>
                  <rect x={D0 * step} y="14" width={(D1 - D0 + 1) * step} height={H - 28} fill="#169B62" opacity="0.07" />
                  <text x={D0 * step} y="10" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#0E7A4A">
                    SAME INTERVAL · RE-CHECKED
                  </text>
                </g>
              )}

              {env.map((v, i) => {
                const inD = i >= D0 && i <= D1
                const broken = mode === 'anomaly' && inD
                const h = broken ? 3 + (i % 2) * 5 : v * 118
                const hot = shown === i || (shown !== null && Math.abs(shown - i) <= 1)
                const fill = broken ? '#E36B55' : hot ? '#3858E9' : mode === 'corrected' && inD ? '#169B62' : '#15171B'
                return (
                  <g key={i}>
                    <rect
                      x={i * step + step * 0.2}
                      y={MID - h}
                      width={step * 0.6}
                      height={h * 2}
                      rx={step * 0.3}
                      fill={fill}
                      opacity={hot ? 1 : 0.86}
                    />
                    {/* generous, keyboard-free hit area; the info is also available via the buttons above */}
                    <rect
                      x={i * step}
                      y="0"
                      width={step}
                      height={H}
                      fill="transparent"
                      onPointerEnter={() => setHover(i)}
                      onPointerLeave={() => setHover(null)}
                      onClick={() => setPicked((p) => (p === i ? null : i))}
                    />
                  </g>
                )
              })}

              {/* timeline */}
              <line x1="0" x2={W} y1={H + 8} y2={H + 8} stroke="#15171B" strokeWidth="1" />
              {Array.from({ length: 10 }, (_, k) => k).map((k) => (
                <g key={k}>
                  <line x1={(k / 9) * (W - 1)} x2={(k / 9) * (W - 1)} y1={H + 8} y2={H + 16} stroke="#15171B" />
                  <text x={(k / 9) * (W - 30)} y={H + 34} fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#747A82">
                    {((k / 9) * 5.4).toFixed(1)}s
                  </text>
                </g>
              ))}

              {shown !== null && (
                <g>
                  <line x1={shown * step + step / 2} x2={shown * step + step / 2} y1="0" y2={H + 8} stroke="#3858E9" strokeWidth="1" />
                  <rect
                    x={Math.min(W - 176, shown * step + 10)}
                    y="26"
                    width="166"
                    height="46"
                    fill="#15171B"
                  />
                  <text x={Math.min(W - 176, shown * step + 10) + 12} y="46" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#fff">
                    t = {time(shown)}s
                  </text>
                  <text x={Math.min(W - 176, shown * step + 10) + 12} y="62" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#9AA0A8">
                    amplitude (concept)
                  </text>
                </g>
              )}
            </svg>
          </div>

          <div className="grid gap-4 border-t border-line px-5 py-4 text-[14px] text-ink-2 md:grid-cols-[1fr_auto] md:items-center">
            <p aria-live="polite">{MODES.find((m) => m.id === mode)!.note}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
              Hover or tap the signal to read a time label
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
