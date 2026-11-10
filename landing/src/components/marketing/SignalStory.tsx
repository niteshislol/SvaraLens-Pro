import { useEffect, useRef, useState } from 'react'
import SignalObject3D from './SignalObject3D'
import { SectionLabel } from './ui'
import { useReducedMotion } from '../../lib/hooks'

const STATES = [
  ['Signal', 'The object is one continuous acoustic structure.'],
  ['Analyse', 'The parallel signal layers separate for inspection.'],
  ['Defect', 'The discontinuity is isolated and highlighted.'],
  ['Evidence', 'A geometric marker anchors the defect region.'],
  ['Verified', 'The structure reconnects into one clean form.'],
]

/**
 * One object, five states, driven by scroll. The sticky stage is short enough
 * that normal scrolling is never trapped, and it is static under reduced motion.
 */
export default function SignalStory() {
  const reduced = useReducedMotion()
  const outer = useRef<HTMLDivElement>(null)
  const progress = useRef({ current: 0 })
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduced) {
      progress.current.current = 0
      setActive(0)
      return
    }
    const on = () => {
      const el = outer.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)))
      progress.current.current = p
      setActive(Math.round(p * 4))
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [reduced])

  return (
    <section aria-labelledby="story-title" className="bg-wash">
      <div ref={outer} style={{ height: reduced ? 'auto' : '280vh' }}>
        <div className={reduced ? 'py-24' : 'sticky top-0 flex h-screen items-center overflow-hidden pt-[72px]'}>
          <div className="wrap grid w-full items-center gap-6 lg:grid-cols-[minmax(0,34fr)_minmax(0,66fr)]">
            <div className="relative z-10">
              <SectionLabel>One object, five states</SectionLabel>
              <h2 id="story-title" className="display max-w-[12ch] text-[clamp(32px,4vw,58px)]">
                A signal, inspected.
              </h2>
              <ol className="mt-8 space-y-1">
                {STATES.map(([t, d], i) => (
                  <li
                    key={t}
                    aria-current={i === active ? 'step' : undefined}
                    className={`grid grid-cols-[40px_1fr] gap-2 border-l-2 py-2 pl-4 transition-all duration-500 ${
                      i === active ? 'border-cobalt opacity-100' : 'border-line opacity-80'
                    }`}
                  >
                    <span className="font-mono text-[11px] pt-1 text-ink-2">0{i + 1}</span>
                    <span>
                      <span className="block text-[13px] font-semibold uppercase tracking-[0.18em]">{t}</span>
                      <span
                        className={`block overflow-hidden text-[14.5px] leading-relaxed text-ink-2 transition-all duration-500 ${
                          i === active || reduced ? 'max-h-16 pt-1' : 'max-h-0 sm:max-h-0'
                        }`}
                      >
                        {d}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 max-w-[40ch] text-[12.5px] leading-relaxed text-ink-3">
                Explanatory animation. It does not show a real detection or a real correction.
              </p>
            </div>
            <SignalObject3D variant="story" progress={progress.current} className="relative h-[44svh] lg:h-[70svh]" />
          </div>
        </div>
      </div>
    </section>
  )
}
