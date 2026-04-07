import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'

// ── Shaders ────────────────────────────────────────────────────────────────
//
// Per-star aColor baked into geometry → spectral variety with zero CPU cost per frame.

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aPhase;
  attribute vec3  aColor;

  uniform float uTime;
  uniform float uTwinkle;

  varying float vOpacity;
  varying vec3  vColor;

  void main() {
    float flicker = 1.0 - uTwinkle
      + uTwinkle * sin(uTime * (0.4 + aPhase * 0.08) + aPhase);
    vOpacity = aOpacity * clamp(flicker, 0.0, 1.0);
    vColor   = aColor;

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float depth = max(-mvPos.z, 0.1);
    gl_PointSize = clamp(aSize * 14.0 / depth, 0.5, 12.0);
    gl_Position  = projectionMatrix * mvPos;
  }
`

const STAR_FRAG = /* glsl */ `
  uniform float uOpacityMult;

  varying float vOpacity;
  varying vec3  vColor;

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv) * 2.0;
    if (dist > 1.0) discard;

    float alpha = smoothstep(1.0, 0.2, dist) * vOpacity * uOpacityMult;
    gl_FragColor = vec4(vColor, alpha);
  }
`

// ── Spectral palettes ──────────────────────────────────────────────────────

type ColorEntry = { hex: number; weight: number }

const PALETTE_COLD: ColorEntry[] = [
  { hex: 0x8AB8FF, weight: 20 },  // hot blue    O/B
  { hex: 0xC0D5FF, weight: 50 },  // blue-white  A
  { hex: 0xEEF3FF, weight: 30 },  // white       F
]

const PALETTE_MIXED: ColorEntry[] = [
  { hex: 0xEEF3FF, weight: 35 },  // white        A/F
  { hex: 0xFFF8E8, weight: 30 },  // warm white   G
  { hex: 0xFFE599, weight: 20 },  // light yellow G
  { hex: 0xC0D5FF, weight: 15 },  // blue-white   A
]

const PALETTE_WARM: ColorEntry[] = [
  { hex: 0xFFB040, weight: 35 },  // orange  K giant
  { hex: 0xFF6E30, weight: 25 },  // red     M giant
  { hex: 0xFFD050, weight: 25 },  // yellow  G giant
  { hex: 0xFFF8E8, weight: 15 },  // warm white
]

const PALETTE_CYAN: ColorEntry[] = [
  { hex: 0x00D4FF, weight: 100 }, // accent cyan
]

// ── Layer config ───────────────────────────────────────────────────────────

interface SpiralDef {
  arms:       number  // number of arms (2 = Milky Way-like)
  tightness:  number  // how fast the arm curves (rad per theta-rad)
  spreadFrac: number  // perpendicular scatter as fraction of radius
}

interface StarLayerDef {
  baseCount:    number
  sizeRange:    [number, number]
  palette:      ColorEntry[]
  spread:       number
  yFlatten:     number
  radiusBias:   number
  opacityRange: [number, number]
  driftSpeed:   number
  driftTilt:    number
  parallaxX:    number
  parallaxY:    number
  maxOpacity:   number
  twinkle:      number
  additive:     boolean
  spiral?:      SpiralDef
}

const LAYERS: StarLayerDef[] = [
  // Layer 0 — 5 000 distant cold pinpoints, loose 2-arm spiral disc
  {
    baseCount:    5000,
    sizeRange:    [0.7, 1.8],
    palette:      PALETTE_COLD,
    spread:       42,
    yFlatten:     0.30,
    radiusBias:   1.2,
    opacityRange: [0.18, 0.62],
    driftSpeed:   0.007,
    driftTilt:    0,
    parallaxX:    0.25,
    parallaxY:    0.15,
    maxOpacity:   0.85,
    twinkle:      0,
    additive:     false,
    spiral:       { arms: 2, tightness: 0.28, spreadFrac: 0.22 },
  },
  // Layer 1 — 1 500 mid-field stars, tighter spiral, spectral mix, gentle twinkle
  {
    baseCount:    1500,
    sizeRange:    [1.1, 2.6],
    palette:      PALETTE_MIXED,
    spread:       26,
    yFlatten:     0.55,
    radiusBias:   1.8,
    opacityRange: [0.28, 0.78],
    driftSpeed:   0.014,
    driftTilt:    0.004,
    parallaxX:    0.55,
    parallaxY:    0.35,
    maxOpacity:   0.90,
    twinkle:      0.12,
    additive:     false,
    spiral:       { arms: 2, tightness: 0.36, spreadFrac: 0.14 },
  },
  // Layer 2 — 100 warm giant stars, spherical, near-field, moderate twinkle
  {
    baseCount:    100,
    sizeRange:    [1.8, 3.5],
    palette:      PALETTE_WARM,
    spread:       20,
    yFlatten:     0.65,
    radiusBias:   2.0,
    opacityRange: [0.32, 0.72],
    driftSpeed:   0,
    driftTilt:    0,
    parallaxX:    0.80,
    parallaxY:    0.55,
    maxOpacity:   0.80,
    twinkle:      0.18,
    additive:     false,
  },
  // Layer 3 — 80 cyan accent dots, additive blending → Bloom glow
  {
    baseCount:    80,
    sizeRange:    [2.5, 5.0],
    palette:      PALETTE_CYAN,
    spread:       18,
    yFlatten:     0.70,
    radiusBias:   1.5,
    opacityRange: [0.50, 1.00],
    driftSpeed:   0,
    driftTilt:    0,
    parallaxX:    1.0,
    parallaxY:    0.7,
    maxOpacity:   1.0,
    twinkle:      0.25,
    additive:     true,
  },
]

// ── RNG ────────────────────────────────────────────────────────────────────

function makeLcg(seed: number): () => number {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

// ── Color picker ───────────────────────────────────────────────────────────

function pickColor(palette: ColorEntry[], rng: () => number, out: THREE.Color): void {
  const total = palette.reduce((sum, e) => sum + e.weight, 0)
  let r = rng() * total
  for (const entry of palette) {
    r -= entry.weight
    if (r <= 0) { out.setHex(entry.hex); return }
  }
  out.setHex(palette[palette.length - 1].hex)
}

// ── Geometry factory ───────────────────────────────────────────────────────

function buildGeometry(def: StarLayerDef, count: number, seed: number): THREE.BufferGeometry {
  const rng       = makeLcg(seed)
  const positions = new Float32Array(count * 3)
  const sizes     = new Float32Array(count)
  const opacities = new Float32Array(count)
  const phases    = new Float32Array(count)
  const colors    = new Float32Array(count * 3)

  const tmpColor = new THREE.Color()

  for (let i = 0; i < count; i++) {
    // ── Position ──────────────────────────────────────────────────────
    if (def.spiral) {
      const { arms, tightness, spreadFrac } = def.spiral
      const arm      = Math.floor(rng() * arms)
      const t        = rng()                          // 0–1 along arm
      const theta    = t * Math.PI * 3.5              // 1.75 full turns
      const r        = def.spread * (0.04 + 0.96 * Math.pow(t, 0.65))
      const armAngle = arm * (Math.PI * 2 / arms)
      const angle    = theta * tightness + armAngle

      // Perpendicular scatter grows with distance from center
      const scatter  = def.spread * spreadFrac * (0.3 + 0.7 * t) * (rng() * 2 - 1)
      const perp     = angle + Math.PI * 0.5

      positions[i * 3]     = r * Math.cos(angle) + scatter * Math.cos(perp)
      positions[i * 3 + 1] = (rng() * 2 - 1) * def.spread * def.yFlatten * 0.22
      positions[i * 3 + 2] = r * Math.sin(angle) + scatter * Math.sin(perp)
    } else {
      const r   = def.spread * Math.pow(rng(), def.radiusBias)
      const th  = rng() * Math.PI * 2
      const phi = Math.acos(2 * rng() - 1)
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(th)
      positions[i * 3 + 1] = r * Math.cos(phi) * def.yFlatten
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(th)
    }

    // ── Attributes ────────────────────────────────────────────────────
    sizes[i]     = def.sizeRange[0]    + rng() * (def.sizeRange[1]    - def.sizeRange[0])
    opacities[i] = def.opacityRange[0] + rng() * (def.opacityRange[1] - def.opacityRange[0])
    phases[i]    = rng() * Math.PI * 2

    pickColor(def.palette, rng, tmpColor)
    colors[i * 3]     = tmpColor.r
    colors[i * 3 + 1] = tmpColor.g
    colors[i * 3 + 2] = tmpColor.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1))
  geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases,    1))
  geo.setAttribute('aColor',   new THREE.BufferAttribute(colors,    3))
  return geo
}

// ── Material factory ───────────────────────────────────────────────────────

function buildMaterial(def: StarLayerDef): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader:   STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent:    true,
    depthWrite:     false,
    blending:       def.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uOpacityMult: { value: def.maxOpacity },
      uTime:        { value: 0 },
      uTwinkle:     { value: def.twinkle },
    },
  })
}

// ── Component ──────────────────────────────────────────────────────────────

export function StarField() {
  const reducedMotion = usePrefersReducedMotion()
  const isMobile      = useMediaQuery('(max-width: 768px)')

  // ~55 % reduction on mobile
  const count0 = isMobile ? 2200 : LAYERS[0].baseCount
  const count1 = isMobile ? 650  : LAYERS[1].baseCount
  const count2 = isMobile ? 45   : LAYERS[2].baseCount
  const count3 = isMobile ? 35   : LAYERS[3].baseCount

  const geo0 = useMemo(() => buildGeometry(LAYERS[0], count0, 42),   [count0])
  const geo1 = useMemo(() => buildGeometry(LAYERS[1], count1, 137),  [count1])
  const geo2 = useMemo(() => buildGeometry(LAYERS[2], count2, 512),  [count2])
  const geo3 = useMemo(() => buildGeometry(LAYERS[3], count3, 1024), [count3])

  const mat0 = useMemo(() => buildMaterial(LAYERS[0]), [])
  const mat1 = useMemo(() => buildMaterial(LAYERS[1]), [])
  const mat2 = useMemo(() => buildMaterial(LAYERS[2]), [])
  const mat3 = useMemo(() => buildMaterial(LAYERS[3]), [])

  const grp0 = useRef<THREE.Group>(null)
  const grp1 = useRef<THREE.Group>(null)
  const grp2 = useRef<THREE.Group>(null)
  const grp3 = useRef<THREE.Group>(null)

  // ── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => { return () => geo0.dispose() }, [geo0])
  useEffect(() => { return () => geo1.dispose() }, [geo1])
  useEffect(() => { return () => geo2.dispose() }, [geo2])
  useEffect(() => { return () => geo3.dispose() }, [geo3])

  useEffect(() => {
    return () => { mat0.dispose(); mat1.dispose(); mat2.dispose(); mat3.dispose() }
  }, [mat0, mat1, mat2, mat3])

  // ── Frame loop ─────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const t   = state.clock.elapsedTime
    const ptx = state.pointer.x
    const pty = state.pointer.y

    const scrollProgress = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0',
    )
    const scrollFade = Math.max(0, 1 - scrollProgress / 0.8)
    const lerp       = 0.02

    // Layer 0 — distant spiral disc, slow Y drift
    mat0.uniforms.uOpacityMult.value = LAYERS[0].maxOpacity * scrollFade
    if (!reducedMotion && grp0.current) {
      grp0.current.rotation.y += LAYERS[0].driftSpeed * delta
      grp0.current.position.x += (ptx * LAYERS[0].parallaxX - grp0.current.position.x) * lerp
      grp0.current.position.y += (pty * LAYERS[0].parallaxY - grp0.current.position.y) * lerp
    }

    // Layer 1 — mid spiral, tilted drift + twinkle
    mat1.uniforms.uOpacityMult.value = LAYERS[1].maxOpacity * scrollFade
    if (!reducedMotion) {
      mat1.uniforms.uTime.value = t
      if (grp1.current) {
        grp1.current.rotation.y += LAYERS[1].driftSpeed * delta
        grp1.current.rotation.x += LAYERS[1].driftTilt  * delta
        grp1.current.position.x += (ptx * LAYERS[1].parallaxX - grp1.current.position.x) * lerp
        grp1.current.position.y += (pty * LAYERS[1].parallaxY - grp1.current.position.y) * lerp
      }
    }

    // Layer 2 — warm giants, parallax + twinkle (no drift)
    mat2.uniforms.uOpacityMult.value = LAYERS[2].maxOpacity * scrollFade
    if (!reducedMotion) {
      mat2.uniforms.uTime.value = t
      if (grp2.current) {
        grp2.current.position.x += (ptx * LAYERS[2].parallaxX - grp2.current.position.x) * lerp
        grp2.current.position.y += (pty * LAYERS[2].parallaxY - grp2.current.position.y) * lerp
      }
    }

    // Layer 3 — cyan accents, parallax + twinkle (no drift)
    mat3.uniforms.uOpacityMult.value = LAYERS[3].maxOpacity * scrollFade
    if (!reducedMotion) {
      mat3.uniforms.uTime.value = t
      if (grp3.current) {
        grp3.current.position.x += (ptx * LAYERS[3].parallaxX - grp3.current.position.x) * lerp
        grp3.current.position.y += (pty * LAYERS[3].parallaxY - grp3.current.position.y) * lerp
      }
    }
  })

  return (
    <group>
      <group ref={grp0}>
        <points geometry={geo0} material={mat0} frustumCulled={false} />
      </group>
      <group ref={grp1}>
        <points geometry={geo1} material={mat1} frustumCulled={false} />
      </group>
      <group ref={grp2}>
        <points geometry={geo2} material={mat2} frustumCulled={false} />
      </group>
      <group ref={grp3}>
        <points geometry={geo3} material={mat3} frustumCulled={false} />
      </group>
    </group>
  )
}
