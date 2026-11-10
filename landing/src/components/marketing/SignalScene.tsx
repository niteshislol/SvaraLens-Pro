import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import {
  DEFECT_U,
  FIN_START,
  GAP_HALF,
  buildBand,
  finHeight,
  frameAt,
  makeFrame,
  stateAt,
} from '../../lib/signalGeometry'

export interface SceneProps {
  variant: 'hero' | 'story'
  /** Mutable scroll progress 0..1, read every frame (story only). */
  progress?: { current: number }
  reducedMotion: boolean
  lite: boolean
  onReady?: () => void
}

const COBALT = new THREE.Color('#3858E9')
const ALU = new THREE.Color('#B7BCC2')
const GRAPHITE = new THREE.Color('#2a2d34')
const VERMILION = new THREE.Color('#E36B55')

const LANES = [-1, 0, 1]
const LANE_DEPTH = 0.34

function makeEngraving(): THREE.CanvasTexture {
  const W = 1536
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#d3d6da')
  g.addColorStop(1, '#bcc0c6')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // brushed grain
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${i % 2 ? '255,255,255' : '90,95,105'},${0.025 + (i % 5) * 0.006})`
    ctx.fillRect(0, Math.random() * H, W, 1)
  }
  ctx.textBaseline = 'middle'
  ctx.font = '600 190px "Noto Sans Devanagari", "Nirmala UI", sans-serif'
  const x = W * 0.5
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('स्वर', x + 3, H * 0.52 + 3)
  ctx.fillStyle = '#2b2e35'
  ctx.fillText('स्वर', x, H * 0.52)
  // tiny waveform glyph
  ctx.fillStyle = '#2b2e35'
  const bars = [30, 70, 120, 60, 150, 90, 40, 80, 25]
  bars.forEach((h, i) => ctx.fillRect(W * 0.26 + i * 17, H * 0.52 - h / 2, 7, h))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function Sculpture({ variant, progress, reducedMotion, lite, onReady }: SceneProps) {
  const invalidate = useThree((s) => s.invalidate)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const finCount = lite ? 76 : 150
  const finThick = lite ? 0.085 : 0.05

  const group = useRef<THREE.Group>(null)
  const lanes = useRef<(THREE.InstancedMesh | null)[]>([null, null, null])
  const marker = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Group>(null)
  const markerMat = useRef<THREE.MeshStandardMaterial>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)

  const pointer = useRef({ x: 0, y: 0, cx: 0, cy: 0 })
  const cur = useRef({ p: -1, sep: -1, fix: -1, glow: 0 })
  const visible = useRef(true)
  const markerPos = useMemo(() => {
    const f = frameAt(DEFECT_U, makeFrame())
    return f.p.clone()
  }, [])

  const band = useMemo(() => buildBand(lite ? 36 : 64), [lite])
  const engraving = useMemo(() => makeEngraving(), [])
  const finGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  const finMat = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.72, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.72, roughness: 0.3 }),
    ],
    [],
  )
  const bandMats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ map: engraving, metalness: 0.78, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: '#a9aeb5', metalness: 0.85, roughness: 0.38 }),
    ],
    [engraving],
  )

  // Re-render once the engraved font is ready.
  useEffect(() => {
    let live = true
    document.fonts?.load('600 190px "Noto Sans Devanagari"', 'स्वर').then(() => {
      if (!live) return
      const fresh = makeEngraving()
      bandMats[0].map = fresh
      bandMats[0].needsUpdate = true
      invalidate()
    })
    return () => {
      live = false
    }
  }, [bandMats, invalidate])

  // Static per-instance data.
  const data = useMemo(() => {
    const us: number[] = []
    for (let i = 0; i < finCount; i++) us.push(FIN_START + ((1 - FIN_START) * i) / (finCount - 1))
    return us
  }, [finCount])

  const writeInstances = (sep: number, fix: number) => {
    const f = makeFrame()
    const m = new THREE.Matrix4()
    const X = new THREE.Vector3()
    const Y = new THREE.Vector3()
    const Z = new THREE.Vector3()
    const P = new THREE.Vector3()
    const col = new THREE.Color()
    LANES.forEach((lane, li) => {
      const mesh = lanes.current[li]
      if (!mesh) return
      data.forEach((u, i) => {
        frameAt(u, f)
        const inGap = Math.abs(u - DEFECT_U) < GAP_HALF
        const k = inGap ? fix : 1
        const h = finHeight(u)
        X.copy(f.T).multiplyScalar(finThick * k)
        Y.copy(f.N).multiplyScalar(h * (0.0001 + k))
        Z.copy(f.B).multiplyScalar(LANE_DEPTH * k)
        P.copy(f.p)
          .addScaledVector(f.B, lane * LANE_DEPTH * (1.02 + sep * 1.5))
          .addScaledVector(f.N, lane * sep * 0.22)
        m.makeBasis(X, Y, Z).setPosition(P)
        mesh.setMatrixAt(i, m)
        const wave = 0.5 + 0.5 * Math.sin(u * Math.PI * 5.2 + 1.4)
        if (li === 1) col.copy(GRAPHITE).lerp(COBALT, 0.15 + 0.85 * wave * wave)
        else col.copy(ALU).lerp(COBALT, 0.34 * wave).multiplyScalar(0.82 + 0.25 * Math.sin(i * 0.7))
        mesh.setColorAt(i, col)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
  }

  useLayoutEffect(() => {
    writeInstances(0, 0)
    // initial pose; first frame handled by useFrame
    cur.current = { p: -1, sep: -1, fix: -1, glow: 0 }
    invalidate()
    onReady?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Wake the (demand) render loop for scroll and pointer only while visible.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-signal="${variant}"]`)
    let io: IntersectionObserver | undefined
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => {
        visible.current = e.isIntersecting
        if (e.isIntersecting) invalidate()
      })
      io.observe(el)
    }
    const wake = () => visible.current && invalidate()
    const move = (e: PointerEvent) => {
      if (reducedMotion || e.pointerType === 'touch') return
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
      wake()
    }
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      io?.disconnect()
      window.removeEventListener('scroll', wake)
      window.removeEventListener('pointermove', move)
    }
  }, [variant, invalidate, reducedMotion])

  // Dispose what we created.
  useEffect(
    () => () => {
      band.dispose()
      finGeo.dispose()
      engraving.dispose()
      finMat.forEach((m) => m.dispose())
      bandMats.forEach((m) => m.dispose())
    },
    [band, finGeo, engraving, finMat, bandMats],
  )

  const narrow = size.width < 700
  const base = useMemo(() => {
    if (variant === 'hero')
      return narrow
        ? { pos: new THREE.Vector3(0.4, 10, 20.5), look: new THREE.Vector3(0.2, -0.4, 0), rot: -0.42, fov: 30 }
        : { pos: new THREE.Vector3(-1.2, 9.2, 16.5), look: new THREE.Vector3(-1.2, -0.6, 0), rot: -0.5, fov: 30 }
    return narrow
      ? { pos: new THREE.Vector3(0, 4.4, 21), look: new THREE.Vector3(0, 0.1, 0), rot: -0.35, fov: 30 }
      : { pos: new THREE.Vector3(0.2, 8.4, 16.5), look: new THREE.Vector3(0.2, -0.4, 0), rot: -0.42, fov: 30 }
  }, [variant, narrow])

  const target = useMemo(() => new THREE.Vector3(), [])
  const camPos = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const c = cur.current
    const pt = pointer.current
    let moving = false

    const want = variant === 'story' && progress && !reducedMotion ? progress.current : 0
    const prev = c.p < 0 ? want : c.p
    const next = prev + (want - prev) * 0.1
    const settledP = Math.abs(want - next) < 0.0008
    c.p = settledP ? want : next
    if (!settledP) moving = true

    const st = stateAt(variant === 'story' ? c.p : 0)
    if (Math.abs(st.sep - c.sep) > 0.0005 || Math.abs(st.fix - c.fix) > 0.0005) {
      writeInstances(st.sep, st.fix)
      c.sep = st.sep
      c.fix = st.fix
    }
    c.glow = st.glow

    pt.cx += (pt.x - pt.cx) * 0.06
    pt.cy += (pt.y - pt.cy) * 0.06
    if (Math.abs(pt.x - pt.cx) > 0.001 || Math.abs(pt.y - pt.cy) > 0.001) moving = true

    // camera: small pointer response + move toward the defect while focused
    target.copy(base.look).lerp(markerPos, st.focus * 0.8)
    camPos.copy(base.pos)
    camPos.x += pt.cx * 0.55 + (markerPos.x - base.pos.x) * st.focus * 0.35
    camPos.y += -pt.cy * 0.28 - st.focus * 0.4
    camPos.z -= st.focus * 3.4
    camera.position.copy(camPos)
    camera.lookAt(target)
    ;(camera as THREE.PerspectiveCamera).fov = base.fov
    camera.updateProjectionMatrix()
    if (group.current) group.current.rotation.y = base.rot + pt.cx * 0.07

    // defect marker + evidence ring
    if (markerMat.current) {
      markerMat.current.color.copy(VERMILION).lerp(COBALT, st.fix)
      markerMat.current.emissive.copy(VERMILION).lerp(COBALT, st.fix)
      markerMat.current.emissiveIntensity = 0.28 + st.glow * 0.9 * (1 - st.fix)
    }
    if (ring.current) {
      const a = st.anchor
      ring.current.visible = a > 0.01
      ring.current.scale.setScalar(0.6 + 0.4 * a)
    }
    if (ringMat.current) {
      ringMat.current.opacity = st.anchor
      ringMat.current.color.copy(COBALT)
    }

    if (moving) invalidate()
  })

  const markerFrame = useMemo(() => frameAt(DEFECT_U, makeFrame()), [])
  const markerQuat = useMemo(() => {
    const m = new THREE.Matrix4().makeBasis(markerFrame.T, markerFrame.N, markerFrame.B)
    return new THREE.Quaternion().setFromRotationMatrix(m)
  }, [markerFrame])

  return (
    <group ref={group} position={[0, 0, 0]}>
      <mesh geometry={band} material={bandMats} />
      {LANES.map((_, li) => (
        <instancedMesh
          key={`${li}-${finCount}`}
          ref={(el) => {
            lanes.current[li] = el
          }}
          args={[finGeo, finMat[li], finCount]}
          frustumCulled={false}
        />
      ))}
      <mesh ref={marker} position={markerPos} quaternion={markerQuat} scale={[0.1, finHeight(DEFECT_U) * 1.04, 0.36]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={markerMat} color="#E36B55" emissive="#E36B55" emissiveIntensity={0.3} roughness={0.35} metalness={0.2} />
      </mesh>
      <group ref={ring} position={markerPos} quaternion={markerQuat} visible={false}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.1, 0.012, 8, 72]} />
          <meshBasicMaterial ref={ringMat} transparent opacity={0} />
        </mesh>
      </group>
      <Html position={[markerPos.x, markerPos.y + 1.55, markerPos.z]} style={{ pointerEvents: 'none' }} zIndexRange={[5, 0]}>
        <div className="signal-label" aria-hidden="true">
          <span className="signal-label__text">
            <i /> SIGNAL ANOMALY
            <b>03.21s</b>
          </span>
          <span className="signal-label__leader" />
        </div>
      </Html>
      <ContactShadows position={[0, -1.5, 0]} opacity={0.16} scale={22} blur={3} far={3.2} resolution={lite ? 256 : 512} />
    </group>
  )
}

export default function SignalScene(props: SceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, props.lite ? 1.25 : 1.75]}
      gl={{ antialias: !props.lite, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 30, position: [1, 4, 12.6], near: 0.1, far: 60 }}
      style={{ position: 'absolute', inset: 0 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.setClearColor(0x000000, 0)
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[-5, 9, 6]} intensity={2.1} color="#fff6ee" />
      <directionalLight position={[7, 3, 4]} intensity={0.7} color="#dfe6ff" />
      <directionalLight position={[2, 4, -8]} intensity={1.1} color="#ffffff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[-4, 6, 5]} scale={[14, 6, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2.2} position={[0, 2, 9]} scale={[16, 5, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.2} position={[6, 2, 3]} scale={[6, 6, 1]} color="#cfd8ff" />
        <Lightformer form="rect" intensity={1.6} position={[0, 3, -7]} scale={[14, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={0.5} position={[0, -4, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[16, 8, 1]} color="#e9e9e6" />
      </Environment>
      <Sculpture {...props} />
    </Canvas>
  )
}
