import { Reveal, SectionLabel } from './ui'

const CAPS = [
  'Text-to-Speech',
  'Speech-to-Text',
  'Audio signal processing',
  'Indic normalisation',
  'Human review',
  'Evidence storage',
  'Regression testing',
]

export default function TechnologySection() {
  return (
    <section id="technology" aria-labelledby="tech-title" className="border-t border-line py-[clamp(80px,10vw,150px)]">
      <div className="wrap grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <Reveal>
          <SectionLabel>Engineered for speech workflows / 009</SectionLabel>
          <h2 id="tech-title" className="display max-w-[12ch] text-[clamp(38px,5vw,72px)]">
            Designed around real speech systems.
          </h2>
          <p className="mt-8 max-w-[48ch] text-[17px] leading-[1.65] text-ink-2">
            SvaraLens is an independent QA companion for speech systems. It sits beside the text-to-speech and
            speech-to-text tools a team already uses, and keeps the evidence and regression history in one place.
          </p>
          <p className="mt-5 max-w-[48ch] text-[14px] leading-relaxed text-ink-3">
            Provider integrations are described only once they are implemented and verified in the deployed product.
            Nothing here implies endorsement by, or a partnership with, any speech provider.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ul className="border-t border-ink">
            {CAPS.map((c, i) => (
              <li key={c} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
                <span className="text-[18px] font-medium tracking-[-0.02em]">{c}</span>
                <span className="font-mono text-[11px] text-mute">{String(i + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
