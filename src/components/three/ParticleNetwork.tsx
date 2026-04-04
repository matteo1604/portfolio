import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createParticleMaterial } from './shaders/particleMaterial'

// ── Constants ──────────────────────────────────────────────────────────────
export const PARTICLE_COUNT = 4000
const MOBILE_PARTICLE_COUNT = 1500
const BOUNDS = { x: 16, y: 10, z: 4 }

// 80% converge to text, 20% stay as outlier network
const OUTLIER_RATIO = 0.2

// World dimensions for text sampling — sized for camera fov55 at z=14
// Viewport at z=0 is ~25.9 wide × ~14.6 tall (16:9), text uses a centered band
const WORLD_TEXT_W = 16
const WORLD_TEXT_H = 7

// Edge constants
const CONN_DIST_IDLE = 2.0      // idle / early convergence — short-range only, no starburst
const CONN_DIST_SETTLED = 1.2   // dense text cluster
const MAX_EDGES = 2500
const MAX_NODE_DEGREE = 3       // max edges per particle — prevents hub nodes
const MOUSE_REPULSION_R = 3.5

// Spatial grid for O(n) edge calculation
const GRID_CELL = 2.1  // slightly > max connection dist
const GRID_OFFSET_X = BOUNDS.x + GRID_CELL
const GRID_OFFSET_Y = BOUNDS.y + GRID_CELL
const GRID_OFFSET_Z = BOUNDS.z + GRID_CELL
const GRID_W = Math.ceil((BOUNDS.x * 2 + GRID_CELL * 2) / GRID_CELL) + 1  // ~12
const GRID_H = Math.ceil((BOUNDS.y * 2 + GRID_CELL * 2) / GRID_CELL) + 1  // ~8
const GRID_D = Math.ceil((BOUNDS.z * 2 + GRID_CELL * 2) / GRID_CELL) + 1  // ~5
const TOTAL_CELLS = GRID_W * GRID_H * GRID_D

function makeLcg(seed: number) {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

// ── Text sampling ──────────────────────────────────────────────────────────
async function sampleTextPositions(count: number): Promise<Float32Array> {
  await document.fonts.ready

  const W = 1024
  const H = 256
  const canvas = new OffscreenCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Line 1 — MATTEO
  ctx.font = 'bold 140px "Clash Display", "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('MATTEO', W / 2, H * 0.30)

  // Line 2 — RAINERI (slightly smaller)
  ctx.font = 'bold 110px "Clash Display", "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('RAINERI', W / 2, H * 0.75)

  const pixels = ctx.getImageData(0, 0, W, H).data

  // Collect every lit pixel
  const litX: number[] = []
  const litY: number[] = []
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      if (pixels[(py * W + px) * 4 + 3] > 128) {
        litX.push(px)
        litY.push(py)
      }
    }
  }

  const total = litX.length
  const result = new Float32Array(count * 3)

  if (total === 0) {
    // Fallback: spread particles in a horizontal band
    const rng = makeLcg(999)
    for (let i = 0; i < count; i++) {
      result[i * 3]     = (rng() - 0.5) * WORLD_TEXT_W
      result[i * 3 + 1] = (rng() - 0.5) * 2
      result[i * 3 + 2] = (rng() - 0.5) * 0.6
    }
    return result
  }

  // Uniform stride sampling — evenly distributed across all lit pixels
  const stride = Math.max(1, Math.floor(total / count))
  const rng = makeLcg(1337)

  for (let i = 0; i < count; i++) {
    const idx = Math.min(i * stride, total - 1)
    const px = litX[idx]
    const py = litY[idx]

    result[i * 3]     = (px / W - 0.5) * WORLD_TEXT_W
    result[i * 3 + 1] = -(py / H - 0.5) * WORLD_TEXT_H
    result[i * 3 + 2] = (rng() - 0.5) * 0.6
  }

  // Debug: log bounding box (should be ~ ±8 on X, ±3 on Y)
  if (import.meta.env.DEV) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let i = 0; i < count; i++) {
      minX = Math.min(minX, result[i * 3])
      maxX = Math.max(maxX, result[i * 3])
      minY = Math.min(minY, result[i * 3 + 1])
      maxY = Math.max(maxY, result[i * 3 + 1])
    }
    console.log('[ParticleNetwork] lit pixels:', total, '  target bbox x:', minX.toFixed(2), '→', maxX.toFixed(2), '  y:', minY.toFixed(2), '→', maxY.toFixed(2))
  }

  return result
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface ParticleNetworkRef {
  setConvergence:    (v: number) => void
  setMouseWorld:     (x: number, y: number) => void
  setScrollProgress: (v: number) => void
  setOvershoot:      (v: number) => void   // ← nuovo
}

interface Props {
  networkRef: React.RefObject<ParticleNetworkRef | null>
  isMobile:   boolean
}

// ── Component ──────────────────────────────────────────────────────────────
export function ParticleNetwork({ networkRef, isMobile }: Props) {
  const { dpr } = useThree()
  const count        = isMobile ? MOBILE_PARTICLE_COUNT : PARTICLE_COUNT
  const outlierCount = Math.floor(count * OUTLIER_RATIO)

  // ── Mutable state refs ─────────────────────────────────────────────────
  const convergenceRef = useRef(0)
  const mouseWorldRef  = useRef<[number, number]>([9999, 9999])
  const scrollRef      = useRef(0)
  const overshootRef   = useRef(0)
  const targetPositions = useRef<Float32Array | null>(null)
  const targetReady    = useRef(false)

  // ── Particle buffers (preallocated once) ───────────────────────────────
  const { posInitial, velocities, phases, scales, isConverging } = useMemo(() => {
    const rng      = makeLcg(42)
    const posInit  = new Float32Array(count * 3)
    const vel      = new Float32Array(count * 3)
    const phs      = new Float32Array(count)
    const scl      = new Float32Array(count)
    const isConv   = new Float32Array(count)  // 1 = converges to text, 0 = outlier

    for (let i = 0; i < count; i++) {
      const x = (rng() - 0.5) * BOUNDS.x * 2
      const y = (rng() - 0.5) * BOUNDS.y * 2
      const z = (rng() - 0.5) * BOUNDS.z * 2
      posInit[i * 3]     = x
      posInit[i * 3 + 1] = y
      posInit[i * 3 + 2] = z
      vel[i * 3]         = (rng() - 0.5) * 0.003
      vel[i * 3 + 1]     = (rng() - 0.5) * 0.003
      vel[i * 3 + 2]     = (rng() - 0.5) * 0.001
      phs[i] = rng() * Math.PI * 2
      scl[i] = 0.5 + rng() * 0.5
      // First (count - outlierCount) particles converge; last outlierCount stay brownian
      isConv[i] = i < (count - outlierCount) ? 1.0 : 0.0
    }

    return { posInitial: posInit, velocities: vel, phases: phs, scales: scl, isConverging: isConv }
  }, [count, outlierCount])

  // ── GPU geometry ───────────────────────────────────────────────────────
  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',  new THREE.BufferAttribute(posInitial.slice(), 3))
    geo.setAttribute('aScale',    new THREE.BufferAttribute(scales, 1))
    // aIsTarget: 1 = converging (cyan→white, fades), 0 = outlier (dim, stays)
    geo.setAttribute('aIsTarget', new THREE.BufferAttribute(isConverging, 1))
    return geo
  }, [posInitial, scales, isConverging])

  const particleMaterial = useMemo(() => {
    const mat = createParticleMaterial()
    mat.uniforms.uSize.value = dpr > 1 ? 1.2 : 1.0
    return mat
  }, [dpr])

  // ── Edge geometry ──────────────────────────────────────────────────────
  const edgeGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_EDGES * 6), 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(MAX_EDGES * 6), 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [])

  // ── Spatial grid (preallocated, GC-free per frame) ─────────────────────
  const gridHead   = useMemo(() => new Int32Array(TOTAL_CELLS).fill(-1), [])
  const gridNext   = useMemo(() => new Int32Array(count), [count])
  const nodeDegree = useMemo(() => new Uint8Array(count), [count])

  // ── Refs for R3F objects ───────────────────────────────────────────────
  const edgeRef = useRef<THREE.LineSegments>(null)

  // ── Load text targets async ────────────────────────────────────────────
  useEffect(() => {
    sampleTextPositions(count).then((arr) => {
      targetPositions.current = arr
      targetReady.current     = true
    })
  }, [count])

  // ── Imperative API ─────────────────────────────────────────────────────
  useEffect(() => {
    ;(networkRef as React.MutableRefObject<ParticleNetworkRef>).current = {
      setConvergence:    (v) => { convergenceRef.current = v },
      setMouseWorld:     (x, y) => { mouseWorldRef.current = [x, y] },
      setScrollProgress: (v) => { scrollRef.current = v },
      setOvershoot:      (v) => { overshootRef.current = v },  // ← nuovo
    }
  }, [networkRef])

  // ── Frame loop ─────────────────────────────────────────────────────────
  useFrame((state) => {
    const conv   = convergenceRef.current
    const scroll = scrollRef.current
    const [mx, my] = mouseWorldRef.current
    const t      = state.clock.elapsedTime

    const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute
    const posArr  = posAttr.array as Float32Array

    // ── Update positions ───────────────────────────────────────────────
    for (let i = 0; i < count; i++) {
      const i3    = i * 3
      let px = posArr[i3], py = posArr[i3 + 1], pz = posArr[i3 + 2]
      const phase = phases[i]

      const shouldConverge = isConverging[i] > 0.5 && conv > 0.001 && targetReady.current && targetPositions.current

      if (!shouldConverge) {
        // ── Brownian / network phase ─────────────────────────────────
        px += velocities[i3]     + Math.sin(t * 0.3  + phase)       * 0.007
        py += velocities[i3 + 1] + Math.cos(t * 0.22 + phase + 1.2) * 0.007
        pz += velocities[i3 + 2] + Math.sin(t * 0.14 + phase + 2.4) * 0.003

        // Wrap bounds
        if (px >  BOUNDS.x) px = -BOUNDS.x
        if (px < -BOUNDS.x) px =  BOUNDS.x
        if (py >  BOUNDS.y) py = -BOUNDS.y
        if (py < -BOUNDS.y) py =  BOUNDS.y
        if (pz >  BOUNDS.z) pz = -BOUNDS.z
        if (pz < -BOUNDS.z) pz =  BOUNDS.z
      } else {
        // ── Converge to text target ──────────────────────────────────
        const tgt = targetPositions.current as Float32Array
        const tx  = tgt[i3], ty = tgt[i3 + 1], tz = tgt[i3 + 2]

        const overshoot = overshootRef.current
        if (overshoot > 0) {
          // ── Crystallizing: lock to target + radial overshoot ────────
          // Skip lerp entirely — position is target + radial displacement
          const len = Math.sqrt(tx * tx + ty * ty)
          if (len > 0.01) {
            px = tx + (tx / len) * overshoot * 0.18
            py = ty + (ty / len) * overshoot * 0.18
          } else {
            px = tx; py = ty
          }
          pz = tz
        } else {
          // ── Normal convergence lerp ──────────────────────────────────
          // Stagger based on distance from text center — center arrives first
          const dFromCenter = Math.abs(tx)
          const staggerDelay = (dFromCenter / (WORLD_TEXT_W * 0.5)) * 0.35
          const localConv = Math.max(0, Math.min(1, (conv - staggerDelay) / (1 - staggerDelay + 0.001)))
          // Power3 ease-in-out
          const eased = localConv < 0.5
            ? 4 * localConv * localConv * localConv
            : 1 - Math.pow(-2 * localConv + 2, 3) / 2

          const approach = eased * 0.055
          px += (tx - px) * approach
          py += (ty - py) * approach
          pz += (tz - pz) * approach
        }
      }

      // ── Mouse repulsion ────────────────────────────────────────────
      const dx = px - mx, dy = py - my
      const dist2 = dx * dx + dy * dy
      const r2    = MOUSE_REPULSION_R * MOUSE_REPULSION_R
      if (dist2 < r2 && dist2 > 0.0001) {
        const dist    = Math.sqrt(dist2)
        const falloff = 1 - dist2 / r2
        const force   = (1 - dist / MOUSE_REPULSION_R) * 0.07
        px += (dx / dist) * force * falloff
        py += (dy / dist) * force * falloff
      }

      // ── Scroll disperse (outliers only) ───────────────────────────
      if (scroll > 0 && isConverging[i] < 0.5) {
        px += (i % 2 === 0 ? 1 : -1) * scroll * 0.05 * scales[i]
        py += (i % 3 === 0 ? 1 : -1) * scroll * 0.04 * scales[i]
      }

      posArr[i3]     = px
      posArr[i3 + 1] = py
      posArr[i3 + 2] = pz
    }
    posAttr.needsUpdate = true

    // Convergence uniform
    particleMaterial.uniforms.uConvergence.value = conv

    // ── Edge update (desktop only) ─────────────────────────────────────
    if (isMobile || !edgeRef.current) return

    // Dynamic connection distance: shrinks as particles converge
    const connDist = CONN_DIST_IDLE + (CONN_DIST_SETTLED - CONN_DIST_IDLE) * conv
    const edgeOpacityMult = scroll > 0 ? Math.max(0, 1 - scroll * 2) : 1

    // ── Rebuild spatial grid ────────────────────────────────────────
    gridHead.fill(-1)
    nodeDegree.fill(0)
    for (let i = 0; i < count; i++) {
      const cx = Math.floor((posArr[i * 3]     + GRID_OFFSET_X) / GRID_CELL) | 0
      const cy = Math.floor((posArr[i * 3 + 1] + GRID_OFFSET_Y) / GRID_CELL) | 0
      const cz = Math.floor((posArr[i * 3 + 2] + GRID_OFFSET_Z) / GRID_CELL) | 0
      if (cx < 0 || cx >= GRID_W || cy < 0 || cy >= GRID_H || cz < 0 || cz >= GRID_D) continue
      const gIdx = (cx * GRID_H + cy) * GRID_D + cz
      gridNext[i]   = gridHead[gIdx]
      gridHead[gIdx] = i
    }

    // ── Find edges ──────────────────────────────────────────────────
    const ePosArr = (edgeGeo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const eClrArr = (edgeGeo.getAttribute('color')    as THREE.BufferAttribute).array as Float32Array
    let edgeCount = 0

    for (let i = 0; i < count && edgeCount < MAX_EDGES; i++) {
      // After crystallization, only outlier particles have edges
      if (conv > 0.75 && isConverging[i] > 0.5) continue
      // Skip hubs that already have max connections
      if (nodeDegree[i] >= MAX_NODE_DEGREE) continue

      const ax = posArr[i * 3], ay = posArr[i * 3 + 1], az = posArr[i * 3 + 2]
      const cx = Math.floor((ax + GRID_OFFSET_X) / GRID_CELL) | 0
      const cy = Math.floor((ay + GRID_OFFSET_Y) / GRID_CELL) | 0
      const cz = Math.floor((az + GRID_OFFSET_Z) / GRID_CELL) | 0

      for (let ddx = -1; ddx <= 1 && edgeCount < MAX_EDGES; ddx++) {
        for (let ddy = -1; ddy <= 1 && edgeCount < MAX_EDGES; ddy++) {
          for (let ddz = -1; ddz <= 1 && edgeCount < MAX_EDGES; ddz++) {
            const nx = cx + ddx, ny = cy + ddy, nz = cz + ddz
            if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H || nz < 0 || nz >= GRID_D) continue

            let j = gridHead[(nx * GRID_H + ny) * GRID_D + nz]
            while (j !== -1 && edgeCount < MAX_EDGES) {
              if (j > i
                && nodeDegree[i] < MAX_NODE_DEGREE
                && nodeDegree[j] < MAX_NODE_DEGREE
                && !(conv > 0.75 && isConverging[j] > 0.5)
              ) {
                const bx = posArr[j * 3], by = posArr[j * 3 + 1], bz = posArr[j * 3 + 2]
                const ex = ax - bx, ey = ay - by, ez = az - bz
                const dist = Math.sqrt(ex * ex + ey * ey + ez * ez)

                if (dist < connDist && dist > 0.001) {
                  const alpha = (1 - dist / connDist) * 0.12 * edgeOpacityMult
                  const e6 = edgeCount * 6
                  ePosArr[e6]     = ax; ePosArr[e6 + 1] = ay; ePosArr[e6 + 2] = az
                  ePosArr[e6 + 3] = bx; ePosArr[e6 + 4] = by; ePosArr[e6 + 5] = bz
                  // Cyan: R=0, G=0.831, B=1.0, scaled by distance-based alpha
                  eClrArr[e6]     = 0; eClrArr[e6 + 1] = 0.831 * alpha; eClrArr[e6 + 2] = 1.0 * alpha
                  eClrArr[e6 + 3] = 0; eClrArr[e6 + 4] = 0.831 * alpha; eClrArr[e6 + 5] = 1.0 * alpha
                  nodeDegree[i]++
                  nodeDegree[j]++
                  edgeCount++
                }
              }
              j = gridNext[j]
            }
          }
        }
      }
    }

    edgeGeo.setDrawRange(0, edgeCount * 2)
    ;(edgeGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(edgeGeo.getAttribute('color')    as THREE.BufferAttribute).needsUpdate = true
  })

  // ── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      particleGeo.dispose()
      particleMaterial.dispose()
      edgeGeo.dispose()
      edgeMaterial.dispose()
    }
  }, [particleGeo, particleMaterial, edgeGeo, edgeMaterial])

  return (
    <group>
      <points geometry={particleGeo} material={particleMaterial} frustumCulled={false} />
      {!isMobile && (
        <lineSegments ref={edgeRef} geometry={edgeGeo} material={edgeMaterial} frustumCulled={false} />
      )}
    </group>
  )
}
