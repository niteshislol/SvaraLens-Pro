import { Reveal, SectionLabel, WaveBars } from './ui'

function Capsule() {
  return (
    <svg viewBox="0 0 220 90" className="h-full w-full" aria-hidden="true">
      <rect x="6" y="14" width="208" height="62" rx="31" fill="none" stroke="#15171B" strokeWidth="1.6" />
      <line x1="110" y1="14" x2="110" y2="76" stroke="#15171B" strokeWidth="1.2" />
      <rect x="30" y="38" width="54" height="3" fill="#15171B" />
      <rect x="30" y="48" width="38" height="3" fill="#B7BCC2" />
      <circle cx="152" cy="45" r="11" fill="none" stroke="#3858E9" strokeWidth="2" />
      <path d="M146.5 45.5l4 4 7.5-8.5" stroke="#3858E9" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const COLS = [
  {
    n: '01',
    label: 'Inspect',
    title: 'Inspect Speech.',
    body: 'Listen, visualise and analyse generated speech through waveform inspection, acoustic checks and transcript comparison.',
    visual: <WaveBars n={44} seed={1.3} mark={[17, 24]} markColor="#3858E9" className="h-full w-full" />,
  },
  {
    n: '02',
    label: 'Preserve',
    title: 'Preserve Evidence.',
    body: 'Capture time-linked defects, model configuration and native-language reviewer decisions in a structured Voice Defect Capsule.',
    visual: <Capsule />,
  },
  {
    n: '03',
    label: 'Prevent',
    title: 'Prevent Regression.',
    body: 'Run the original assertions against corrected audio and verify whether the identified failure has genuinely been resolved.',
    visual: (
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-3">
        <WaveBars n={22} seed={1.3} gap={[9, 12]} className="h-full w-full" />
        <span className="font-mono text-[10px] text-mute" aria-hidden="true">
          →
        </span>
        <WaveBars n={22} seed={1.3} color="#169B62" className="h-full w-full" />
      </div>
    ),
  },
]

export default function WorkflowSection() {
  return (
    <section id="workflow" aria-labelledby="workflow-title" className="border-t border-line py-[clamp(80px,10vw,150px)]">
      <div className="wrap">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <SectionLabel>The workflow / 004</SectionLabel>
            <h2 id="workflow-title" className="display text-[clamp(38px,5vw,72px)]">
              From audio to evidence.
            </h2>
          </div>
          <p className="max-w-[40ch] text-[17px] leading-relaxed text-ink-2 lg:justify-self-end">
            One connected process. Traceable findings. Repeatable outcomes.
          </p>
        </Reveal>

        <ol className="mt-16 grid gap-14 md:grid-cols-3 md:gap-0">
          {COLS.map((c, i) => (
            <li key={c.n} className={`${i > 0 ? 'md:border-l md:border-line md:pl-10' : ''} ${i < 2 ? 'md:pr-10' : ''}`}>
              <Reveal delay={i * 120}>
                <div className="flex items-baseline gap-4">
                  <span className="text-[26px] font-light text-mute">{c.n}</span>
                  <span className="text-[13px] font-semibold uppercase tracking-[0.2em]">{c.label}</span>
                </div>
                <div className="my-9 h-24 border-b border-line pb-4">{c.visual}</div>
                <h3 className="text-[26px] font-semibold tracking-[-0.03em]">{c.title}</h3>
                <p className="mt-4 max-w-[36ch] text-[16px] leading-[1.65] text-ink-2">{c.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
