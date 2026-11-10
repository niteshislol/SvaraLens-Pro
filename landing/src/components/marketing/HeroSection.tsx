import SignalObject3D from './SignalObject3D'
import { APP_URL } from '../../config'

export default function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden pt-[72px]">
      <div className="wrap relative grid min-h-[min(940px,calc(100svh-72px))] grid-cols-1 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
        <div className="relative z-10 flex flex-col justify-center pb-10 pt-12 lg:py-16">
          <p className="eyebrow mb-7">
            <span aria-hidden="true">[ </span>Voice quality engineering / 001<span aria-hidden="true"> ]</span>
          </p>
          <h1
            id="hero-title"
            className="display whitespace-nowrap text-[clamp(34px,9vw,60px)] lg:text-[clamp(44px,4.15vw,78px)]"
          >
            VOICE QUALITY.
            <br />
            MADE <span className="text-cobalt">TESTABLE.</span>
          </h1>
          <p className="mt-8 max-w-[30ch] text-[clamp(18px,1.55vw,23px)] leading-[1.45] text-ink-2">
            Inspect Indic speech. Isolate the defect. Preserve the evidence. Verify the fix.
          </p>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
            SvaraLens turns spoken defects into traceable evidence and repeatable engineering tests.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
            <a href={APP_URL} className="btn btn-dark">
              Explore SvaraLens <span aria-hidden="true">↗</span>
            </a>
            <a href="#workflow" className="link-arrow">
              View the workflow <span aria-hidden="true">→</span>
            </a>
          </div>

          <p className="mt-10 max-w-[38ch] text-[13.5px] leading-relaxed text-ink-2">
            Designed for speech QA engineers, language reviewers and voice pipeline teams.
          </p>
          <p className="mt-5 flex items-center gap-3 border-l-2 border-cobalt pl-3 text-[13.5px] text-ink-2">
            Hindi <span aria-hidden="true">·</span> Hinglish <span aria-hidden="true">·</span> Indic Speech
          </p>
        </div>

        {/* Object bleeds past the content frame on desktop */}
        <div className="relative h-[420px] sm:h-[520px] lg:h-auto lg:min-h-[640px]">
          <SignalObject3D
            variant="hero"
            className="absolute inset-y-0 left-[-4vw] right-[-4vw] lg:left-[-2vw] lg:right-[calc(-1*clamp(20px,4.2vw,68px)-6vw)]"
          />
          <p className="absolute bottom-3 right-0 z-10 font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
            Concept render · illustrative annotation
          </p>
        </div>
      </div>
    </section>
  )
}
