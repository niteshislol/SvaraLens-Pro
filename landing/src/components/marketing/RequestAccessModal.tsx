import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ACCESS_ENDPOINT } from '../../config'

const INTERESTS = ['Speech QA', 'Indic language review', 'Audio analysis', 'Regression testing', 'Product evaluation']

interface Props {
  open: boolean
  mode: 'access' | 'signin'
  onClose: () => void
}

type Status = 'idle' | 'sending' | 'success' | 'error'
type Errors = Partial<Record<'name' | 'email' | 'organisation' | 'role' | 'interest', string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function RequestAccessModal({ open, mode, onClose }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Errors>({})
  const [serverMsg, setServerMsg] = useState('')
  const panel = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const openedAt = useRef(0)

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement as HTMLElement
    openedAt.current = Date.now()
    setStatus('idle')
    setErrors({})
    setServerMsg('')
    document.body.style.overflow = 'hidden'
    setTimeout(() => panel.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !panel.current) return
      const f = Array.from(
        panel.current.querySelectorAll<HTMLElement>('input:not([tabindex="-1"]),select,textarea,button,a[href]'),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      opener.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const v = (k: string) => String(fd.get(k) ?? '').trim()
    const next: Errors = {}
    if (v('name').length < 2) next.name = 'Please enter your name.'
    if (!EMAIL.test(v('email'))) next.email = 'Please enter a valid work email.'
    if (v('organisation').length < 2) next.organisation = 'Please enter your organisation.'
    if (v('role').length < 2) next.role = 'Please enter your role.'
    if (!INTERESTS.includes(v('interest'))) next.interest = 'Please choose an area of interest.'
    setErrors(next)
    if (Object.keys(next).length) {
      setTimeout(() => panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
      return
    }

    setStatus('sending')
    try {
      const res = await fetch(ACCESS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: v('name'),
          email: v('email'),
          organisation: v('organisation'),
          role: v('role'),
          interest: v('interest'),
          message: v('message'),
          website: v('website'), // honeypot
          elapsedMs: Date.now() - openedAt.current,
        }),
      })
      if (res.ok) {
        setStatus('success')
        return
      }
      const body = await res.json().catch(() => ({}))
      if (res.status === 422 && body.errors) setErrors(body.errors)
      setServerMsg(
        res.status === 429
          ? 'Too many requests from this connection. Please try again a little later.'
          : body.message || 'We could not record your request. Please try again.',
      )
      setStatus('error')
    } catch {
      setServerMsg('We could not reach the server, so your request was not sent. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const field =
    'mt-2 block h-12 w-full rounded-[5px] border border-line bg-white px-4 text-[15px] outline-none transition-colors focus:border-cobalt'
  const label = 'block text-[13px] font-medium'
  const err = 'mt-1.5 text-[13px] text-[#B3361F]'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#15171B]/55 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ra-title"
        className="relative my-8 w-full max-w-[560px] rounded-[10px] bg-canvas p-7 shadow-2xl sm:p-10"
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center rounded-md hover:bg-wash">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="#15171B" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        {status === 'success' ? (
          <div role="status">
            <p className="eyebrow mb-4">Request received</p>
            <h2 id="ra-title" className="display text-[34px]">
              Thank you.
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-ink-2">
              Your request has been recorded. We will review it and reply to the work email you provided.
            </p>
            <button onClick={onClose} className="btn btn-dark mt-8">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="eyebrow mb-4">{mode === 'signin' ? 'Sign in' : 'Request access'}</p>
            <h2 id="ra-title" className="display text-[34px]">
              {mode === 'signin' ? 'Sign-in is not open here yet.' : 'Request access to SvaraLens.'}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              {mode === 'signin'
                ? 'There is no public sign-in on this page. Tell us who you are and we will follow up about access.'
                : 'Tell us a little about your team. We will reply to your work email.'}
            </p>

            {status === 'error' && (
              <p role="alert" className="mt-6 border-l-2 border-vermilion bg-white px-4 py-3 text-[14px] text-[#B3361F]">
                {serverMsg}
              </p>
            )}

            <div className="mt-7 grid gap-5">
              <div>
                <label htmlFor="ra-name" className={label}>
                  Name
                </label>
                <input id="ra-name" name="name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'ra-name-e' : undefined} className={field} />
                {errors.name && (
                  <p id="ra-name-e" className={err}>
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="ra-email" className={label}>
                  Work email
                </label>
                <input id="ra-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'ra-email-e' : undefined} className={field} />
                {errors.email && (
                  <p id="ra-email-e" className={err}>
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="ra-org" className={label}>
                    Organisation
                  </label>
                  <input id="ra-org" name="organisation" autoComplete="organization" required aria-invalid={!!errors.organisation} aria-describedby={errors.organisation ? 'ra-org-e' : undefined} className={field} />
                  {errors.organisation && (
                    <p id="ra-org-e" className={err}>
                      {errors.organisation}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="ra-role" className={label}>
                    Role
                  </label>
                  <input id="ra-role" name="role" autoComplete="organization-title" required aria-invalid={!!errors.role} aria-describedby={errors.role ? 'ra-role-e' : undefined} className={field} />
                  {errors.role && (
                    <p id="ra-role-e" className={err}>
                      {errors.role}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="ra-int" className={label}>
                  Area of interest
                </label>
                <select id="ra-int" name="interest" defaultValue="" required aria-invalid={!!errors.interest} aria-describedby={errors.interest ? 'ra-int-e' : undefined} className={field}>
                  <option value="" disabled>
                    Select one
                  </option>
                  {INTERESTS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
                {errors.interest && (
                  <p id="ra-int-e" className={err}>
                    {errors.interest}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="ra-msg" className={label}>
                  Message <span className="font-normal text-ink-3">(optional)</span>
                </label>
                <textarea id="ra-msg" name="message" rows={3} maxLength={1000} className={`${field} h-auto py-3`} />
              </div>

              {/* honeypot: hidden from people, tempting to bots */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
                <label htmlFor="ra-web">Website</label>
                <input id="ra-web" name="website" tabIndex={-1} autoComplete="off" />
              </div>
            </div>

            <button type="submit" disabled={status === 'sending'} className="btn btn-dark mt-8 w-full justify-center disabled:opacity-60">
              {status === 'sending' ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
