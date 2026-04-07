import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'

// ── Shaders ────────────────────────────────────────────────────────────────
//
// Head (aNorm=1) is bright; tail (aNorm=0) fades to transparent.
// Position is computed entirely from uniforms so the geometry is just a
// 2-point placeholder — frustumCulled must be false.

const SHOOT_VERT = /* glsl */ `
  attribute float aNorm;

  uniform vec3  uStart;
  uniform vec3  uEnd;
  uniform float uProgress;
  uniform float uStreakFrac;  // streak length as fraction of path length

  varying float vNorm;

  void main() {
    vNorm = aNorm;
    float headT = uProgress;
    float tailT = max(0.0, uProgress - uStreakFrac);
    vec3 head = mix(uStart, uEnd, headT);
    vec3 tail = mix(uStart, uEnd, tailT);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(mix(tail, head, aNorm), 1.0);
  }
`

const SHOOT_FRAG = /* glsl */ `
  uniform float uAlpha;
  varying float vNorm;

  void main() {
    // Power curve: head blazes, tail decays quickly — matches real meteor behaviour
    float fade = pow(vNorm, 0.45);
    gl_FragColor = vec4(0.88, 0.96, 1.0, fade * uAlpha);
  }
`

// ── Seeded RNG (separate from StarField to avoid coupling) ─────────────────

let _s = 88888
function rng() { _s = (_s * 9301 + 49297) % 233280; return _s / 233280 }

// ── Inner component (only mounts when conditions allow) ────────────────────

const POOL = 6

function ShootingStarsInner() {
  // Shared 2-point geometry — actual positions come from vertex shader uniforms
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('aNorm',    new THREE.BufferAttribute(new Float32Array([0, 1]), 1))
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0, 0,0,0]), 3))
    return g
  }, [])

  const mats = useMemo(
    () =>
      Array.from({ length: POOL }, () =>
        new THREE.ShaderMaterial({
          vertexShader:   SHOOT_VERT,
          fragmentShader: SHOOT_FRAG,
          transparent:    true,
          depthWrite:     false,
          blending:       THREE.AdditiveBlending,
          uniforms: {
            uStart:      { value: new THREE.Vector3() },
            uEnd:        { value: new THREE.Vector3() },
            uProgress:   { value: -1 },
            uStreakFrac: { value: 0.15 },
            uAlpha:      { value: 0 },
            uMaxAlpha:   { value: 0.82 },  // randomised per spawn
            uSpeed:      { value: 1.8 },
          },
        }),
      ),
    [],
  )

  const lines = useMemo(
    () =>
      mats.map((m) => {
        const l = new THREE.Line(geo, m)
        l.frustumCulled = false
        return l
      }),
    [geo, mats],
  )

  const nextSpawnRef = useRef(2.5 + rng() * 3)

  useEffect(() => () => { geo.dispose(); mats.forEach((m) => m.dispose()) }, [geo, mats])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    // ── Tick active streaks ───────────────────────────────────────────
    for (const mat of mats) {
      const prog = mat.uniforms.uProgress.value
      if (prog < 0) continue

      const next = prog + delta * mat.uniforms.uSpeed.value
      mat.uniforms.uProgress.value = next

      // Alpha envelope: fade in 0→0.12, hold, fade out 0.80→1.0
      const maxA = mat.uniforms.uMaxAlpha.value
      if (next < 0.12) {
        mat.uniforms.uAlpha.value = (next / 0.12) * maxA
      } else if (next > 0.80) {
        mat.uniforms.uAlpha.value = Math.max(0, (1.0 - next) / 0.20) * maxA
      } else {
        mat.uniforms.uAlpha.value = maxA
      }

      if (next >= 1.0) {
        mat.uniforms.uProgress.value = -1
        mat.uniforms.uAlpha.value    = 0
      }
    }

    // ── Spawn ─────────────────────────────────────────────────────────
    if (t > nextSpawnRef.current) {
      const idle = mats.find((m) => m.uniforms.uProgress.value < 0)
      if (idle) {
        // Start: random position in upper scene area, varied depth for parallax
        const sx = (rng() * 2 - 1) * 17
        const sy = 7 + rng() * 7
        const sz = -5 - rng() * 9   // z: −5 to −14

        // Direction: mostly downward, slight left lean
        const dx = -(0.28 + rng() * 0.18)
        const dy = -1.0
        const dz = 0
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
        const pathLen = 26

        idle.uniforms.uStart.value.set(sx, sy, sz)
        idle.uniforms.uEnd.value.set(
          sx + (dx / len) * pathLen,
          sy + (dy / len) * pathLen,
          sz + (dz / len) * pathLen,
        )
        idle.uniforms.uStreakFrac.value = 0.13 + rng() * 0.09
        idle.uniforms.uSpeed.value      = 1.6  + rng() * 1.0
        idle.uniforms.uMaxAlpha.value   = 0.50 + rng() * 0.45  // brightness varies per meteor
        idle.uniforms.uProgress.value   = 0
        idle.uniforms.uAlpha.value      = 0
      }

      nextSpawnRef.current = t + 3.5 + rng() * 4.5
    }
  })

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  )
}

// ── Public wrapper — gating on mobile / reduced motion ─────────────────────

export function ShootingStars() {
  const reducedMotion = usePrefersReducedMotion()
  const isMobile      = useMediaQuery('(max-width: 768px)')

  if (isMobile || reducedMotion) return null
  return <ShootingStarsInner />
}
