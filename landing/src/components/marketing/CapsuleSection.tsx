import { Reveal, SectionLabel } from './ui'
import { CAPSULE_URL } from '../../config'

const MANIFEST: [string, string][] = [
  ['Capsule ID', 'CAP-XXXX-XXXX'],
  ['Original audio', 'preserved · read-only'],
  ['SHA-256', '••••••••••••••••'],
  ['Defect timestamp', '00:00.00 → 00:00.00'],
  ['Reviewer decision', 'confirmed · native reviewer'],
  ['Regression assertions', 'reusable'],
]

function CapsuleObject() {
  return (
    <svg viewBox="0 0 520 220" className="w-full" role="img" aria-label="Illustration of a sealed capsule made of two metal halves with a cobalt integrity ring">
      <defs>
        <linearGradient id="cg-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9dce0" />
          <stop offset="0.55" stopColor="#b7bcc2" />
          <stop offset="1" stopColor="#8e949b" />
        </linearGradient>
        <linearGradient id="cg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3e46" />
          <stop offset="1" stopColor="#15171b" />
        </linearGradient>
      </defs>
      <ellipse cx="260" cy="196" rx="190" ry="10" fill="#15171b" opacity="0.1" />
      <path d="M260 40H118a70 70 0 0 0 0 140h142z" fill="url(#cg-a)" />
      <path d="M260 40h142a70 70 0 0 1 0 140H260z" fill="url(#cg-g)" />
      <rect x="252" y="36" width="16" height="148" fill="#3858E9" />
      <rect x="259" y="36" width="2" height="148" fill="#fff" opacity="0.5" />
      <g fill="#2b2e35">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={96 + i * 14} y={110 - [10, 22, 32, 18, 8][i]} width="6" height={[20, 44, 64, 36, 16][i]} rx="3" />
        ))}
      </g>
      <g fill="#fff" opacity="0.78">
        <rect x="320" y="92" width="64" height="3" />
        <rect x="320" y="104" width="46" height="3" />
        <rect x="320" y="116" width="58" height="3" />
      </g>
      <rect x="392" y="90" width="10" height="34" fill="#E36B55" />
    </svg>
  )
}

export default function CapsuleSection() {
  return (
    <section id="capsule" aria-labelledby="capsule-title" className="bg-wash py-[clamp(80px,10vw,150px)]">
      <div className="wrap">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <SectionLabel>The signature system / 007</SectionLabel>
            <h2 id="capsule-title" className="display max-w-[13ch] text-[clamp(38px,5vw,72px)]">
              Every confirmed defect leaves a trace.
            </h2>
          </div>
          <p className="max-w-[46ch] text-[17px] leading-relaxed text-ink-2 lg:justify-self-end">
            A Voice Defect Capsule preserves the evidence behind a confirmed speech failure and makes the original
            assertions reusable.
          </p>
        </Reveal>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <Reveal>
            <CapsuleObject />
          </Reveal>
          <Reveal delay={120}>
            <dl className="border-t border-ink font-mono text-[12.5px]" aria-label="Illustrative capsule manifest">
              {MANIFEST.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[150px_1fr] gap-4 border-b border-line py-3.5">
                  <dt className="uppercase tracking-[0.14em] text-ink-3">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
              Illustrative layout only. No real hashes, identifiers or customer data are shown.
            </p>
            <a href={CAPSULE_URL} className="link-arrow mt-8">
              Explore the capsule workflow <span aria-hidden="true">→</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
