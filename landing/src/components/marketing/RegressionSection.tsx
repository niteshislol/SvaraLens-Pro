import { Reveal, SectionLabel, WaveBars } from './ui'

const ASSERTIONS: [string, string, string][] = [
  ['Original failure', 'FAIL', 'text-vermilion'],
  ['Corrected execution', 'RE-RUN', 'text-cobalt'],
  ['Verified result', 'PASS', 'text-ok'],
]

export default function RegressionSection() {
  return (
    <section id="regression" aria-labelledby="reg-title" className="py-[clamp(80px,10vw,150px)]">
      <div className="wrap">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <SectionLabel>Engineering confidence / 008</SectionLabel>
            <h2 id="reg-title" className="display max-w-[13ch] text-[clamp(38px,5vw,72px)]">
              A fix should be proven, not assumed.
            </h2>
          </div>
          <p className="max-w-[46ch] text-[17px] leading-relaxed text-ink-2 lg:justify-self-end">
            Run the same defect-specific assertions against corrected audio and preserve the result as part of the
            engineering history.
          </p>
        </Reveal>

        <Reveal className="mt-16">
          <div className="grid items-stretch gap-8 md:grid-cols-[1fr_auto_1fr] md:gap-10">
            <div>
              <p className="eyebrow mb-4 !text-vermilion">Original audio · suspected issue</p>
              <div className="h-40 border-y border-line py-4">
                <WaveBars n={70} seed={2.4} gap={[30, 36]} mark={[28, 38]} className="h-full w-full" />
              </div>
            </div>
            <div className="hidden flex-col items-center md:flex" aria-hidden="true">
              <span className="w-px flex-1 bg-ink" />
              <span className="my-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">verify</span>
              <span className="w-px flex-1 bg-ink" />
            </div>
            <div>
              <p className="eyebrow mb-4 !text-ok">Corrected audio · continuous</p>
              <div className="h-40 border-y border-line py-4">
                <WaveBars n={70} seed={2.4} color="#15171B" className="h-full w-full" />
              </div>
            </div>
          </div>

          <div className="mt-12">
            <p className="eyebrow mb-4">Assertion status · illustrative</p>
            <ul className="grid border-t border-ink md:grid-cols-3">
              {ASSERTIONS.map(([label, status, cls], i) => (
                <li
                  key={label}
                  className={`flex items-center justify-between gap-4 border-b border-line py-5 ${
                    i > 0 ? 'md:border-l md:pl-8' : ''
                  } ${i < 2 ? 'md:pr-8' : ''}`}
                >
                  <span className="text-[15px]">{label}</span>
                  <span className={`font-mono text-[12px] font-medium tracking-[0.16em] ${cls}`}>
                    <span aria-hidden="true">{status === 'PASS' ? '✓ ' : status === 'FAIL' ? '✕ ' : '↻ '}</span>
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 max-w-[70ch] border-l-2 border-cobalt pl-4 text-[15px] leading-relaxed text-ink-2">
            Automated assertions can confirm what is measurable, such as a missing segment or a changed entity. Subjective
            qualities like pronunciation and naturalness still need appropriate human review.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
