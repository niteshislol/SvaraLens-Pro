import * as THREE from 'three'

/** Deterministic parametric model of the Signal Object. */
export const LENGTH = 13
export const DEFECT_U = 0.5
export const GAP_HALF = 0.018
export const BAND_END = 0.24
export const FIN_START = 0.17

const WAVE = Math.PI * 5.2

export const amp = (u: number) => 0.25 + 0.95 * Math.exp(-Math.pow((u - 0.5) / 0.3, 2))

const position = (u: number, out: THREE.Vector3) =>
  out.set(
    (u - 0.5) * LENGTH,
    amp(u) * Math.sin(u * WAVE + 0.2) + 0.14 * Math.sin(u * Math.PI * 11) * amp(u),
    0.9 * Math.sin(u * Math.PI * 2.1),
  )

export const roll = (u: number) => 0.55 * Math.sin(u * WAVE + 1.4)
export const finHeight = (u: number) => 0.5 + 0.55 * amp(u)

export interface Frame {
  p: THREE.Vector3
  T: THREE.Vector3
  N: THREE.Vector3
  B: THREE.Vector3
}

const a = new THREE.Vector3()
const b = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

export function frameAt(u: number, f: Frame): Frame {
  const e = 0.002
  position(Math.min(1, u + e), a)
  position(Math.max(0, u - e), b)
  f.T.subVectors(a, b).normalize()
  position(u, f.p)
  const B0 = new THREE.Vector3().crossVectors(f.T, UP).normalize()
  const N0 = new THREE.Vector3().crossVectors(B0, f.T).normalize()
  const r = roll(u)
  const c = Math.cos(r)
  const s = Math.sin(r)
  f.N.copy(N0).multiplyScalar(c).addScaledVector(B0, s)
  f.B.copy(B0).multiplyScalar(c).addScaledVector(N0, -s)
  return f
}

export const makeFrame = (): Frame => ({
  p: new THREE.Vector3(),
  T: new THREE.Vector3(),
  N: new THREE.Vector3(),
  B: new THREE.Vector3(),
})

/** Solid silver band at the start of the object (carries the engraving). */
export function buildBand(segments = 56, halfWidth = 0.6, halfThick = 0.07): THREE.BufferGeometry {
  const f = makeFrame()
  const faces = 4
  const per = (segments + 1) * 2
  const pos = new Float32Array(faces * per * 3)
  const uv = new Float32Array(faces * per * 2)
  const idx: number[] = []
  const tmp = new THREE.Vector3()

  const corner = (fr: Frame, sb: number, sn: number) =>
    tmp.copy(fr.p).addScaledVector(fr.B, sb * halfWidth).addScaledVector(fr.N, sn * halfThick)

  // [first edge], [second edge] as (sB, sN) pairs. Order matches the winding derived in notes.
  const edges: [number, number, number, number][] = [
    [-1, 1, 1, 1], // top
    [1, -1, -1, -1], // bottom
    [-1, -1, -1, 1], // left
    [1, 1, 1, -1], // right
  ]

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    frameAt(FIN_START * 0 + t * BAND_END, f)
    edges.forEach((e, face) => {
      const base = face * per + i * 2
      corner(f, e[0], e[1]).toArray(pos, base * 3)
      corner(f, e[2], e[3]).toArray(pos, (base + 1) * 3)
      // Top face: text reads left→right, upright when viewed from the front/above.
      uv[base * 2] = t
      uv[base * 2 + 1] = 1
      uv[(base + 1) * 2] = t
      uv[(base + 1) * 2 + 1] = 0
    })
  }

  const groups: [number, number][] = []
  for (let face = 0; face < faces; face++) {
    const start = idx.length
    for (let i = 0; i < segments; i++) {
      const A = face * per + i * 2
      idx.push(A, A + 1, A + 2, A + 1, A + 3, A + 2)
    }
    groups.push([start, idx.length - start])
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.addGroup(groups[0][0], groups[0][1], 0)
  g.addGroup(groups[1][0], groups[3][0] + groups[3][1] - groups[1][0], 1)
  return g
}

/** Story timeline: s runs 0..4 across five states. */
export interface StoryState {
  sep: number
  glow: number
  anchor: number
  fix: number
  focus: number
}

const ss = (a0: number, a1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0)))
  return t * t * (3 - 2 * t)
}

export function stateAt(p: number): StoryState {
  const s = Math.min(1, Math.max(0, p)) * 4
  let sep = 0
  if (s < 1) sep = ss(0, 1, s)
  else if (s < 2) sep = 1
  else if (s < 3) sep = 1 - 0.6 * ss(2, 3, s)
  else sep = 0.4 * (1 - ss(3, 4, s))
  return {
    sep,
    glow: ss(1, 2, s) * (1 - ss(3, 4, s)),
    anchor: ss(2.4, 3.2, s),
    fix: ss(3.3, 4, s),
    focus: ss(1, 2.2, s) * (1 - ss(3.4, 4, s)),
  }
}
