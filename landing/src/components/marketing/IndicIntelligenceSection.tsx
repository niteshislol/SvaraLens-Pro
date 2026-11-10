import { Reveal, SectionLabel } from './ui'

const CONSIDERATIONS = [
  ['Critical entities', 'Preserve the meaning of names, numbers, dates and monetary amounts.'],
  [
    'Code-switching',
    'Evaluate mixed Hindi-English speech without assuming that ordinary ASR agreement proves natural delivery.',
  ],
  [
    'Human listening',
    'Support native-language human confirmation for pronunciation, clarity, naturalness and prosody.',
  ],
]

export default function IndicIntelligenceSection() {
  return (
    <section id="indic" aria-labelledby="indic-title" className="border-t border-line py-[clamp(80px,11vw,170px)]">
      <div className="wrap">
        <Reveal>
          <SectionLabel>Built for Indic speech / 006</SectionLabel>
          <h2 id="indic-title" className="display max-w-[18ch] text-[clamp(36px,4.6vw,68px)]">
            Speech quality is also a language problem.
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <Reveal>
            <p className="text-[clamp(28px,3vw,44px)] font-medium leading-[1.12] tracking-[-0.03em]">
              Meaning must survive the voice.
            </p>
            <p className="mt-6 max-w-[40ch] text-[17px] leading-[1.65] text-ink-2">
              Amounts, dates, names, disclosures and code-switched phrases deserve more than a generic transcription
              score.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <figure aria-label="The same sentence in Hindi, Hinglish and English" className="border-y border-ink">
              {[
                ['Hindi', 'हिन्दी', 'आपका भुगतान कल सुबह जमा किया जाएगा।', 'font-deva text-[clamp(24px,2.8vw,40px)] leading-[1.5]', 'hi'],
                ['Hinglish', 'Latin script', 'Aapka payment kal subah process ho jayega.', 'text-[clamp(21px,2.3vw,32px)] leading-[1.4] tracking-[-0.02em]', 'hi-Latn'],
                ['English', 'English', 'Your payment will be processed tomorrow morning.', 'text-[clamp(19px,2vw,27px)] leading-[1.4] tracking-[-0.02em] text-ink-2', 'en'],
              ].map(([k, , text, cls, lang], i) => (
                <div key={k} className={`grid gap-3 py-7 sm:grid-cols-[110px_1fr] ${i > 0 ? 'border-t border-line' : ''}`}>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 sm:pt-3">{k}</span>
                  <p lang={lang} className={`font-medium ${cls}`}>
                    {text}
                  </p>
                </div>
              ))}
            </figure>
          </Reveal>
        </div>

        <ul className="mt-20 grid gap-10 border-t border-line pt-10 md:grid-cols-3 md:gap-0">
          {CONSIDERATIONS.map(([t, d], i) => (
            <li key={t} className={`${i > 0 ? 'md:border-l md:border-line md:pl-10' : ''} ${i < 2 ? 'md:pr-10' : ''}`}>
              <Reveal delay={i * 100}>
                <p className="font-mono text-[11px] text-mute">0{i + 1}</p>
                <h3 className="mt-3 text-[13px] font-semibold uppercase tracking-[0.2em]">{t}</h3>
                <p className="mt-4 max-w-[34ch] text-[16px] leading-[1.65] text-ink-2">{d}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
