import { Reveal } from './ui'
import { APP_URL } from '../../config'

export default function FinalCTA({ onRequestAccess }: { onRequestAccess: () => void }) {
  return (
    <section aria-labelledby="cta-title" className="on-dark relative overflow-hidden bg-[#15171B] py-[clamp(90px,12vw,190px)] text-white">
      {/* cropped fragment of the Signal Object, extending in from the right */}
      <img
        src="/images/signal-object-fallback.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute -right-[18%] top-1/2 hidden w-[62%] -translate-y-1/2 opacity-[0.16] mix-blend-screen lg:block"
        style={{ filter: 'grayscale(1) contrast(1.15)' }}
      />
      <div className="wrap relative">
        <Reveal>
          <h2 id="cta-title" className="display max-w-[12ch] text-[clamp(42px,6.2vw,96px)]">
            Make every spoken defect count.
          </h2>
          <p className="mt-8 max-w-[44ch] text-[18px] leading-relaxed text-white/70">
            Bring your voice QA workflow closer to evidence, reproducibility and verified fixes.
          </p>
          <div className="mt-11 flex flex-wrap items-center gap-4">
            <button onClick={onRequestAccess} className="btn btn-light">
              Request access <span aria-hidden="true">→</span>
            </button>
            <a href={APP_URL} className="btn btn-ghost-dark">
              Explore the Workbench
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
