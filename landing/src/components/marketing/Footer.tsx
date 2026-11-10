import Logo from './Logo'
import { AUTH_URL, DOCS_URL, PRIVACY_URL, TERMS_URL } from '../../config'

interface Props {
  onRequestAccess: (mode?: 'access' | 'signin') => void
}

export default function Footer({ onRequestAccess }: Props) {
  const link = 'text-[14.5px] text-white/70 transition-colors hover:text-white'
  return (
    <footer className="on-dark bg-graphite-deep text-white">
      <div className="wrap grid gap-12 py-16 md:grid-cols-[1.4fr_1fr] lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-6 text-[15px] text-white/70">Indic Voice Quality Engineering.</p>
          <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-white/50">
            Every spoken defect becomes a reproducible test.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="grid gap-3">
            <li>
              <a className={link} href="#platform">
                Product
              </a>
            </li>
            <li>
              <a className={link} href="#workflow">
                Workflow
              </a>
            </li>
            <li>
              <a className={link} href="#indic">
                Indic QA
              </a>
            </li>
            {DOCS_URL && (
              <li>
                <a className={link} href={DOCS_URL}>
                  Documentation
                </a>
              </li>
            )}
            <li>
              <button
                className={`${link} cursor-pointer`}
                onClick={() => (AUTH_URL ? (window.location.href = AUTH_URL) : onRequestAccess('signin'))}
              >
                Sign in
              </button>
            </li>
            <li>
              <button className={`${link} cursor-pointer`} onClick={() => onRequestAccess('access')}>
                Request access
              </button>
            </li>
          </ul>
        </nav>

        <div className="md:col-span-2 lg:col-span-1 lg:text-right">
          <p lang="hi" className="font-deva text-[22px] text-white/90">
            आवाज़ से सबूत तक।
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 py-6 text-[13px] text-white/50">
          <span>© {new Date().getFullYear()} SvaraLens</span>
          {(PRIVACY_URL || TERMS_URL) && (
            <span className="flex gap-6">
              {PRIVACY_URL && (
                <a href={PRIVACY_URL} className="hover:text-white">
                  Privacy
                </a>
              )}
              {TERMS_URL && (
                <a href={TERMS_URL} className="hover:text-white">
                  Terms
                </a>
              )}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
