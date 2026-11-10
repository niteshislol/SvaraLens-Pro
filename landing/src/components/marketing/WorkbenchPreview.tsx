import { useState } from 'react'
import { Reveal, SectionLabel, WaveBars } from './ui'
import { APP_URL } from '../../config'

const PANELS = ['Scenario Explorer', 'Reference script', 'Voice generation settings', 'Waveform', 'ASR comparison', 'Audio Health', 'Evidence Inspector']

/**
 * Shows /images/workbench-preview.webp when a real screenshot is supplied.
 * Until then it renders an honestly labelled layout schematic, never a fake dashboard.
 */
export default function WorkbenchPreview() {
  const [hasShot, setHasShot] = useState(true)

  return (
    <section id="platform" aria-labelledby="wb-title" className="bg-wash py-[clamp(80px,10vw,150px)]">
      <div className="wrap">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <SectionLabel>Inside the workbench / 005</SectionLabel>
            <h2 id="wb-title" className="display max-w-[12ch] text-[clamp(38px,5vw,72px)]">
              Built around the actual audio.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <p className="max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
              Everything required to investigate a spoken defect, organised around one focused engineering workspace.
            </p>
            <a href={APP_URL} className="link-arrow mt-6">
              Explore the Workbench <span aria-hidden="true">→</span>
            </a>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <figure className="overflow-hidden rounded-[10px] border border-line bg-paper shadow-[0_1px_2px_rgba(21,23,27,0.05),0_20px_50px_-30px_rgba(21,23,27,0.25)]">
            <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="ml-4 truncate rounded bg-white px-3 py-1 font-mono text-[11px] text-ink-3">svaralens / workbench</span>
            </div>

            {hasShot ? (
              <img
                src="/images/workbench-preview.webp"
                alt="Screenshot of the SvaraLens Workbench"
                loading="lazy"
                className="block w-full"
                onError={() => setHasShot(false)}
              />
            ) : (
              <div className="grid min-h-[420px] gap-px bg-line md:grid-cols-[220px_1fr_260px]" aria-label="Workbench layout schematic">
                <div className="bg-paper p-5">
                  <p className="eyebrow mb-4">Scenarios</p>
                  {[70, 52, 64, 44].map((w, i) => (
                    <div key={i} className="mb-3 h-2.5 rounded-full bg-wash" style={{ width: `${w}%` }} />
                  ))}
                  <p className="eyebrow mb-3 mt-8">Settings</p>
                  {[58, 40, 66].map((w, i) => (
                    <div key={i} className="mb-3 h-2.5 rounded-full bg-wash" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="bg-paper p-5">
                  <p className="eyebrow mb-4">Reference script · Waveform</p>
                  <div className="mb-6 space-y-2">
                    <div className="h-2.5 w-[92%] rounded-full bg-wash" />
                    <div className="h-2.5 w-[70%] rounded-full bg-wash" />
                  </div>
                  <div className="h-32 border border-line p-3">
                    <WaveBars n={90} seed={3} mark={[44, 49]} className="h-full w-full" />
                  </div>
                  <p className="eyebrow mb-3 mt-6">ASR comparison</p>
                  <div className="h-2.5 w-[80%] rounded-full bg-wash" />
                </div>
                <div className="bg-paper p-5">
                  <p className="eyebrow mb-4">Audio Health</p>
                  {[60, 36, 48].map((w, i) => (
                    <div key={i} className="mb-3 h-2.5 rounded-full bg-wash" style={{ width: `${w}%` }} />
                  ))}
                  <p className="eyebrow mb-4 mt-8">Evidence Inspector</p>
                  {[74, 50].map((w, i) => (
                    <div key={i} className="mb-3 h-2.5 rounded-full bg-wash" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            )}

            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-2">
              <span>{hasShot ? 'Product preview' : 'Layout schematic · replace with a verified product screenshot'}</span>
              <span className="text-ink-3">{PANELS.join(' · ')}</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}
