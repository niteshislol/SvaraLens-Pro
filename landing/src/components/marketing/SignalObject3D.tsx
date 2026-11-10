import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { detectWebGL, useLite, useReducedMotion } from '../../lib/hooks'

const SignalScene = lazy(() => import('./SignalScene'))

class Boundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

interface Props {
  variant: 'hero' | 'story'
  progress?: { current: number }
  className?: string
}

const ALT =
  'A long, wave-shaped acoustic sculpture built from brushed aluminium and graphite fins with cobalt-blue shading. One red insert marks a break in the structure. A small engraving on the silver band reads svara in Devanagari. Decorative illustration, not measured data.'

/**
 * The Signal Object: real WebGL geometry, with a static render underneath that
 * is shown while the scene loads, when WebGL is unavailable, or if it fails.
 */
export default function SignalObject3D({ variant, progress, className = '' }: Props) {
  const reduced = useReducedMotion()
  const lite = useLite()
  const [mount, setMount] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!detectWebGL()) {
      setFailed(true)
      return
    }
    // Keep text and CTAs painting first; start the 3D chunk when the browser is idle.
    const start = () => setMount(true)
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 1200 })
    else setTimeout(start, 250)
  }, [])

  return (
    <div data-signal={variant} role="img" aria-label={ALT} className={`overflow-hidden ${className}`}>
      <img
        src="/images/signal-object-fallback.webp"
        alt=""
        width={1152}
        height={560}
        decoding="async"
        fetchPriority={variant === 'hero' ? 'high' : 'auto'}
        className="absolute inset-0 h-full w-full object-contain object-right transition-opacity duration-700"
        style={{
          opacity: ready && !failed ? 0 : 1,
          mixBlendMode: 'multiply',
          WebkitMaskImage: 'radial-gradient(ellipse 72% 78% at 58% 52%, #000 55%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 72% 78% at 58% 52%, #000 55%, transparent 100%)',
        }}
      />
      {mount && !failed && (
        <Boundary onFail={() => setFailed(true)}>
          <Suspense fallback={null}>
            <div className="absolute inset-0" style={{ opacity: ready ? 1 : 0, transition: 'opacity .7s ease' }}>
              <SignalScene
                variant={variant}
                progress={progress}
                reducedMotion={reduced}
                lite={lite}
                onReady={() => setReady(true)}
              />
            </div>
          </Suspense>
        </Boundary>
      )}
    </div>
  )
}
