import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import { APP_URL, AUTH_URL, DOCS_URL } from '../../config'
import { useActiveSection } from '../../lib/hooks'

interface Props {
  onRequestAccess: (mode?: 'access' | 'signin') => void
}

const SECTION_IDS = ['platform', 'workflow', 'indic', 'technology']

export default function Navigation({ onRequestAccess }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(SECTION_IDS)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const links: { label: string; href: string; id?: string; external?: boolean }[] = [
    { label: 'Platform', href: '#platform', id: 'platform' },
    { label: 'Workflow', href: '#workflow', id: 'workflow' },
    { label: 'Indic QA', href: '#indic', id: 'indic' },
    { label: 'Technology', href: '#technology', id: 'technology' },
    ...(DOCS_URL ? [{ label: 'Documentation', href: DOCS_URL, external: true }] : []),
  ]

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    if (!open) return
    const first = menuRef.current?.querySelector<HTMLElement>('a,button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
      if (e.key === 'Tab' && menuRef.current) {
        const f = [toggleRef.current, ...Array.from(menuRef.current.querySelectorAll<HTMLElement>('a,button'))].filter(
          Boolean,
        ) as HTMLElement[]
        const i = f.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && i <= 0) {
          e.preventDefault()
          f[f.length - 1].focus()
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault()
          f[0].focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const signIn = () => {
    setOpen(false)
    if (AUTH_URL) window.location.href = AUTH_URL
    else onRequestAccess('signin')
  }

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 transition-[background,border-color,backdrop-filter] duration-300"
      style={{
        background: scrolled || open ? 'rgba(244,244,241,0.88)' : 'transparent',
        backdropFilter: scrolled || open ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled || open ? 'var(--color-line)' : 'transparent'}`,
      }}
    >
      <div className="wrap flex h-[72px] items-center justify-between gap-6">
        <a href="#top" aria-label="SvaraLens home" className="shrink-0">
          <Logo />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-9 lg:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              aria-current={l.id && active === l.id ? 'true' : undefined}
              className={`relative py-2 text-[15px] transition-colors hover:text-cobalt ${
                l.id && active === l.id ? 'text-ink' : 'text-ink-2'
              }`}
            >
              {l.label}
              {l.id && active === l.id && (
                <span className="absolute inset-x-0 -bottom-0.5 h-px bg-cobalt" aria-hidden="true" />
              )}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <button
            onClick={signIn}
            className="cursor-pointer text-[15px] text-ink-2 transition-colors hover:text-ink font-medium"
          >
            Sign in
          </button>
          <button
            onClick={() => onRequestAccess('access')}
            className="btn btn-light !h-10 !rounded-[7px] !px-3.5 border border-line text-sm"
          >
            Request access
          </button>
          <a
            href={APP_URL}
            className="btn btn-dark !h-10 !rounded-[7px] !px-4 text-sm"
          >
            Launch Workbench <span aria-hidden="true">→</span>
          </a>
        </div>

        <button
          ref={toggleRef}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-line bg-white/60 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
            {open ? (
              <path d="M2 2l14 10M16 2L2 12" stroke="#15171B" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M1 2h16M1 7h16M1 12h16" stroke="#15171B" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" ref={menuRef} className="wrap border-t border-line pb-8 pt-4 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 text-xl font-medium tracking-tight"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <button onClick={signIn} className="btn btn-light justify-center border border-line">
              Sign in
            </button>
            <button
              onClick={() => {
                setOpen(false)
                onRequestAccess('access')
              }}
              className="btn btn-dark justify-center"
            >
              Request access
            </button>
            <a href={APP_URL} className="link-arrow mt-2 self-start">
              Explore SvaraLens <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
