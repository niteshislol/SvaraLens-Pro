import { Reveal, SectionLabel } from './ui'

const STAGES = [
  ['Heard', 'A reviewer discovers an issue in generated speech.'],
  ['Documented', 'The exact audio region and expected phrase are preserved.'],
  ['Reproduced', 'The confirmed defect becomes a repeatable regression test.'],
]

export default function ProblemSection() {
  return (
    <section id="problem" aria-labelledby="problem-title" className="py-[clamp(80px,11vw,176px)]">
      <div className="wrap grid gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24">
        <Reveal>
          <SectionLabel>The engineering gap / 002</SectionLabel>
          <h2 id="problem-title" className="display max-w-[14ch] text-[clamp(38px,5vw,76px)]">
            Finding a defect is not the same as fixing it.
          </h2>
          <p className="mt-8 max-w-[52ch] text-[17px] leading-[1.65] text-ink-2">
            Speech quality issues are often discovered by listening. But without time-linked evidence, structured
            review and repeatable tests, the same failure can return in a later release.
          </p>
        </Reveal>

        <ol className="relative self-center">
          <span aria-hidden="true" className="absolute bottom-6 left-[15px] top-6 w-px bg-line" />
          {STAGES.map(([t, d], i) => (
            <li key={t}>
              <Reveal delay={i * 120} className="relative flex gap-8 py-8">
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-canvas font-mono text-[11px] ${
                    i === 2 ? 'border-cobalt text-cobalt' : 'border-line text-ink-2'
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em]">{t}</h3>
                  <p className="mt-3 max-w-[34ch] text-[17px] leading-relaxed text-ink-2">{d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
