import { useEffect, useRef, useState } from 'react'

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return r
}

export function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    const ok = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return ok
  } catch {
    return false
  }
}

export function useLite(): boolean {
  const [lite, setLite] = useState(
    () => typeof window !== 'undefined' && (window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4),
  )
  useEffect(() => {
    const on = () => setLite(window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return lite
}

/** Adds the `in` class once an element scrolls into view. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.classList.add('in')
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('in')
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState('')
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const visible = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)))
        setActive(ids.find((id) => visible.has(id)) ?? '')
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])
  return active
}
