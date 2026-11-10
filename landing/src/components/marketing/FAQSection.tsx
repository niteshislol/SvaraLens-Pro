import { useId, useRef, useState } from 'react'
import { Reveal, SectionLabel } from './ui'

/**
 * Copy is written conservatively from the product brief. Anything not yet
 * confirmed in the deployed build is phrased as "designed to" rather than as a
 * guarantee. Review against the shipped product before publishing.
 */
const FAQ: [string, string][] = [
  [
    'What is SvaraLens?',
    'SvaraLens is an Indic Voice QA Evidence & Regression Workbench. It helps speech engineering teams inspect AI-generated audio, identify possible voice defects, preserve traceable evidence and verify corrections through reproducible regression tests.',
  ],
  [
    'How does SvaraLens fit into the speech QA workflow?',
    'It follows three steps: inspect the speech, preserve a confirmed defect as evidence, and re-run the original assertions against corrected audio. It is designed to sit alongside the speech systems a team already uses.',
  ],
  [
    'Which languages does it support?',
    'SvaraLens is built with Hindi, Hinglish and Indic speech in mind. Request access to confirm which languages and voices are available in the current build.',
  ],
  [
    'What is a Voice Defect Capsule?',
    'A structured record of a confirmed speech failure. It is designed to hold the original audio, the time-linked defect, model configuration, the reviewer decision and the assertions needed to test the same failure again.',
  ],
  [
    'Does it support both generated and uploaded audio?',
    'The Workbench is built around generated speech. Whether uploaded audio is available depends on the current build, so please confirm this when you request access.',
  ],
  [
    'How does regression testing work?',
    'The assertions tied to a confirmed defect are run against corrected audio, and the result is kept with the capsule. Measurable checks can be automated; subjective qualities still need human review.',
  ],
  [
    'Does it replace existing conversational AI evaluation tools?',
    'No. It is an independent QA companion focused on the evidence behind spoken defects and on reproducible fixes. It is not positioned as a replacement for broader evaluation tooling.',
  ],
  [
    'How does human review work?',
    'SvaraLens is designed to capture native-language reviewer decisions on pronunciation, clarity, naturalness and prosody, and to keep those decisions linked to the audio region they describe.',
  ],
]

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)
  const base = useId()
  const btns = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const last = FAQ.length - 1
    let n = -1
    if (e.key === 'ArrowDown') n = i === last ? 0 : i + 1
    else if (e.key === 'ArrowUp') n = i === 0 ? last : i - 1
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = last
    if (n >= 0) {
      e.preventDefault()
      btns.current[n]?.focus()
    }
  }

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-[clamp(80px,10vw,150px)]">
      <div className="wrap grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <Reveal>
          <SectionLabel>Questions</SectionLabel>
          <h2 id="faq-title" className="display text-[clamp(36px,4.4vw,64px)]">
            Frequently asked.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="border-t border-ink">
            {FAQ.map(([q, a], i) => {
              const isOpen = open === i
              return (
                <div key={q} className="border-b border-line">
                  <h3>
                    <button
                      ref={(el) => {
                        btns.current[i] = el
                      }}
                      id={`${base}-b${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`${base}-p${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      onKeyDown={(e) => onKey(e, i)}
                      className="flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left text-[18px] font-medium tracking-[-0.02em] transition-colors hover:text-cobalt"
                    >
                      {q}
                      <span aria-hidden="true" className="relative h-3 w-3 shrink-0">
                        <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                        <span
                          className="absolute inset-y-0 left-1/2 w-px bg-current transition-transform duration-300"
                          style={{ transform: isOpen ? 'scaleY(0)' : 'none' }}
                        />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`${base}-p${i}`}
                    role="region"
                    aria-labelledby={`${base}-b${i}`}
                    hidden={!isOpen}
                    className="pb-7 pr-10"
                  >
                    <p className="max-w-[62ch] text-[16px] leading-[1.7] text-ink-2">{a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
