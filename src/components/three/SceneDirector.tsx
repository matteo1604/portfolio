import { useRef, useEffect, type Ref } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMouseNDC } from '@/hooks/useMouseNDC'
import { ChromeText, type ChromeTextRef } from './ChromeText'
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing'
import { BlendFunction, BloomEffect } from 'postprocessing'
import { toProgress } from '@/lib/scrollPhases'

// ── Camera keyframe poses ────────────────────────────────────────────────────
interface Pose {
  t: number
  pos: readonly [number, number, number]
  lookAt: readonly [number, number, number]
  roll: number  // degrees
  fov: number
}

const POSES: Pose[] = [
  { t: 0.00, pos: [ 0,  0, 30], lookAt: [0, 0, 0], roll:  0, fov: 45 },
  { t: 0.17, pos: [ 2,  1, 22], lookAt: [0, 0, 0], roll: -6, fov: 55 }, // portal 1
  { t: 0.26, pos: [ 3,  0, 18], lookAt: [1, 0, 0], roll: -3, fov: 50 }, // About
  { t: toProgress(41.5), pos: [-1, -2, 20], lookAt: [0, 0, 0], roll:  6, fov: 56 }, // portal 2
  { t: toProgress(50.5), pos: [-2,  1.4, 21], lookAt: [0, 0, 0], roll:  2, fov: 49 }, // Skills
  { t: 0.71, pos: [ 1, -1, 16], lookAt: [0, 0, 0], roll: -5, fov: 60 }, // portal 3
  { t: 0.82, pos: [ 0,  0, 14], lookAt: [0, 0, 0], roll:  0, fov: 55 }, // Projects
  { t: 0.91, pos: [ 0,  1,  8], lookAt: [0, 0, 0], roll:  4, fov: 65 }, // portal 4
  { t: 1.00, pos: [ 0,  0,  6], lookAt: [0, 0, 0], roll:  0, fov: 65 }, // Contact
]

// Pre-allocated scratch vectors — reused every frame, zero GC.
const _posA    = new THREE.Vector3()
const _posB    = new THREE.Vector3()
const _laA     = new THREE.Vector3()
const _laB     = new THREE.Vector3()
const _upWorld = new THREE.Vector3(0, 1, 0)
const _lookDir = new THREE.Vector3()
const _rollQ   = new THREE.Quaternion()
const _rollAxis = new THREE.Vector3()

function lerpPose(
  scroll: number,
  outPos:    THREE.Vector3,
  outLookAt: THREE.Vector3,
  outRollFov: { roll: number; fov: number },
): void {
  let a = POSES[0], b = POSES[POSES.length - 1]
  for (let i = 0; i < POSES.length - 1; i++) {
    if (scroll >= POSES[i].t && scroll <= POSES[i + 1].t) {
      a = POSES[i]; b = POSES[i + 1]; break
    }
  }
  const span = b.t - a.t
  const raw  = span === 0 ? 0 : (scroll - a.t) / span
  // smoothstep: 3t²-2t³
  const t    = raw * raw * (3 - 2 * raw)

  _posA.set(...a.pos)
  _posB.set(...b.pos)
  outPos.copy(_posA).lerp(_posB, t)

  _laA.set(...a.lookAt)
  _laB.set(...b.lookAt)
  outLookAt.copy(_laA).lerp(_laB, t)

  outRollFov.roll = a.roll + (b.roll - a.roll) * t
  outRollFov.fov  = a.fov  + (b.fov  - a.fov)  * t
}

// ── Entry phase ──────────────────────────────────────────────────────────────
type Phase = 'idle' | 'converging' | 'chrome_in' | 'settled'

interface SceneDirectorProps {
  isMobile: boolean
  reducedMotion?: boolean
}

type BloomHandle = {
  intensity: number
}

export function SceneDirector({ isMobile, reducedMotion = false }: SceneDirectorProps) {
  const { camera } = useThree()
  const mouseNDC   = useMouseNDC()

  const phase       = useRef<Phase>('idle')
  const triggerTime = useRef<number | null>(null)
  const chromeRef   = useRef<ChromeTextRef>(null)
  const bloomRef    = useRef<BloomHandle | null>(null)
  const flashState  = useRef(0)

  // Smoothed camera state — lerped toward desired pose each frame
  const camPos    = useRef(new THREE.Vector3(0, 0, 30))
  const camLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const camRoll   = useRef(0)    // degrees
  const camFov    = useRef(isMobile ? 65 : 45)

  // Scratch for lerpPose output — reused, no alloc
  const _desiredPos    = useRef(new THREE.Vector3())
  const _desiredLookAt = useRef(new THREE.Vector3())
  const _desiredRF     = useRef({ roll: 0, fov: isMobile ? 65 : 45 })

  // ── Entry trigger ─────────────────────────────────────────────────────────
  useEffect(() => {
    let triggered = false
    const trigger = () => {
      if (triggered) return
      triggered = true
      phase.current = 'converging'
    }
    if (isMobile) {
      const t = setTimeout(trigger, 1500)
      return () => clearTimeout(t)
    }

    const desktopFallback = window.setTimeout(trigger, 900)
    window.addEventListener('pointermove', trigger, { once: true })

    return () => {
      window.clearTimeout(desktopFallback)
      window.removeEventListener('pointermove', trigger)
    }
  }, [isMobile])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const elapsed = state.clock.elapsedTime

    // ── Pre-settled phases: entry animation ──────────────────────────────
    if (phase.current !== 'settled') {
      if (phase.current !== 'idle') {
        if (triggerTime.current === null) triggerTime.current = elapsed
        const sinceStart = elapsed - triggerTime.current

        if (phase.current === 'converging') {
          camera.position.z = 6
          ;(camera as THREE.PerspectiveCamera).fov = 85
          camera.updateProjectionMatrix()
          if (sinceStart >= 1.2) {
            phase.current = 'chrome_in'
            chromeRef.current?.setVisible(true)
          }
        } else if (phase.current === 'chrome_in') {
          const tC       = Math.max(0, sinceStart - 1.2)
          const clamped  = Math.min(tC, 1.0)
          const pullBack = 1 - Math.pow(1 - clamped, 4)

          camera.position.z = 6 + pullBack * 24
          ;(camera as THREE.PerspectiveCamera).fov = 85 - pullBack * (85 - (isMobile ? 65 : 45))
          camera.updateProjectionMatrix()

          const flashIntensity = clamped < 0.15
            ? clamped / 0.15
            : 1 - (clamped - 0.15) / 0.85
          if (bloomRef.current) bloomRef.current.intensity = flashIntensity * 2.5

          chromeRef.current?.setEntranceProgress(clamped)

          if (tC >= 1.0) {
            phase.current = 'settled'
            document.documentElement.style.setProperty('--hero-animation-complete', '1')
            if (bloomRef.current) bloomRef.current.intensity = 0
            // Sync smooth state with actual camera at settle point
            camPos.current.set(0, 0, 30)
            camFov.current = isMobile ? 65 : 45
            camRoll.current = 0
          }
        }
      } else {
        // idle: hold close while waiting for first interaction
        camera.position.z = 6
        ;(camera as THREE.PerspectiveCamera).fov = 85
        camera.updateProjectionMatrix()
      }
      return
    }

    // ── Settled: scroll-driven spatial journey ────────────────────────────
    const scrollProg = parseFloat(
      document.documentElement.style.getPropertyValue('--scroll-progress') || '0'
    )
    const heroProg = parseFloat(
      document.documentElement.style.getPropertyValue('--hero-progress') || '0'
    )

    // ChromeText (hero name) — scroll exit
    if (!isMobile) chromeRef.current?.setMouseInfluence(mouseNDC.current.x, mouseNDC.current.y)
    chromeRef.current?.setScrollProgress(heroProg * 3.0)
    chromeRef.current?.setOpacity(Math.max(0, 1 - heroProg * 2.1))

    // ── Bloom flash (driven by --p-flash from sections/portals) ──────────
    const flashRaw = parseFloat(document.documentElement.style.getPropertyValue('--p-flash') || '0')
    // Retrigger if new flash arrives and previous has mostly decayed
    if (flashRaw > 0.5 && flashState.current < 0.1) flashState.current = flashRaw
    if (bloomRef.current) {
      const targetBloom = flashState.current * 4.0
      // Delta-independent lerp toward target
      bloomRef.current.intensity += (targetBloom - bloomRef.current.intensity) * (1 - Math.exp(-12 * dt))
    }
    // Delta-independent exponential decay (half-life ≈ 0.5s regardless of FPS)
    flashState.current *= Math.pow(0.88, dt * 60)

    // ── Reduced motion: static pose ───────────────────────────────────────
    if (reducedMotion) {
      camera.position.set(0, 0, 22)
      camera.up.copy(_upWorld)
      camera.lookAt(0, 0, 0)
      ;(camera as THREE.PerspectiveCamera).fov = isMobile ? 65 : 45
      camera.updateProjectionMatrix()
      return
    }

    // ── Interpolate target pose ───────────────────────────────────────────
    lerpPose(scrollProg, _desiredPos.current, _desiredLookAt.current, _desiredRF.current)

    const rollAmp = isMobile ? 0.5 : 1.0
    const fovAmp  = isMobile ? 0.7 : 1.0
    const targetFov  = POSES[0].fov + (_desiredRF.current.fov - POSES[0].fov) * fovAmp
    const targetRoll = _desiredRF.current.roll * rollAmp

    // Delta-independent smooth follow — speed constant in seconds not frames
    const posSpeed  = 1 - Math.exp(-5  * dt)  // ~5 units/sec follow
    const rollSpeed = 1 - Math.exp(-4  * dt)
    const fovSpeed  = 1 - Math.exp(-3  * dt)

    camPos.current.lerp(_desiredPos.current, posSpeed)
    camLookAt.current.lerp(_desiredLookAt.current, posSpeed)
    camRoll.current += (targetRoll - camRoll.current) * rollSpeed
    camFov.current  += (targetFov  - camFov.current)  * fovSpeed

    // ── Mouse parallax ────────────────────────────────────────────────────
    const parallax = 0.8
    camera.position.copy(camPos.current)
    camera.position.x += mouseNDC.current.x * parallax
    camera.position.y += mouseNDC.current.y * parallax

    // ── Look-at + roll ────────────────────────────────────────────────────
    // Build rolled "up" vector: rotate world-up around the look direction
    _lookDir.subVectors(camLookAt.current, camera.position).normalize()
    _rollAxis.copy(_lookDir)
    _rollQ.setFromAxisAngle(_rollAxis, THREE.MathUtils.degToRad(camRoll.current))
    camera.up.copy(_upWorld).applyQuaternion(_rollQ)
    camera.lookAt(camLookAt.current)

    ;(camera as THREE.PerspectiveCamera).fov = camFov.current
    camera.updateProjectionMatrix()
  })

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={1.8} />
      <pointLight position={[0, 0, 10]} intensity={2.0} color="#00D4FF" />

      <ChromeText ref={chromeRef} />

      <EffectComposer multisampling={isMobile ? 0 : 2} autoClear={false}>
        <Bloom
          ref={bloomRef as unknown as Ref<typeof BloomEffect>}
          intensity={0}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
        />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.06} />
      </EffectComposer>
    </>
  )
}
