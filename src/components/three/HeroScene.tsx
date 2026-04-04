import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ParticleNetwork, type ParticleNetworkRef } from './ParticleNetwork'
import { ChromeText, type ChromeTextRef } from './ChromeText'

type Phase = 'idle' | 'converging' | 'crystallizing' | 'chrome_in' | 'settled'

interface Props {
  isMobile: boolean
}

// Power3 ease-in-out
function easeInOut3(t: number): number {
  t = Math.max(0, Math.min(1, t))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function HeroScene({ isMobile }: Props) {
  const { size, camera } = useThree()

  const phaseRef        = useRef<Phase>('idle')
  const triggerTimeRef  = useRef<number | null>(null)  // clock.elapsedTime at trigger
  const convergenceRef  = useRef(0)

  const networkApiRef   = useRef<ParticleNetworkRef | null>(null)
  const chromeApiRef    = useRef<ChromeTextRef | null>(null)

  // Invisible plane for mouse raycasting
  const planeMeshRef    = useRef<THREE.Mesh>(null)
  const raycaster       = useRef(new THREE.Raycaster())
  const mouseNDC        = useRef(new THREE.Vector2(0, 0))
  const mouseWorld      = useRef(new THREE.Vector3())

  // ── Trigger: first pointermove (desktop) or 1.5s fallback (mobile) ──────
  useEffect(() => {
    let triggered = false

    const trigger = () => {
      if (triggered) return
      triggered = true
      phaseRef.current = 'converging'
    }

    if (isMobile) {
      const timer = setTimeout(trigger, 1500)
      return () => clearTimeout(timer)
    }

    window.addEventListener('pointermove', trigger, { once: true })
    return () => window.removeEventListener('pointermove', trigger)
  }, [isMobile])

  // ── Track pointer NDC for raycasting ─────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseNDC.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseNDC.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // ── Raycast mouse to z=0 plane ────────────────────────────────────────
    raycaster.current.setFromCamera(mouseNDC.current, camera)
    if (planeMeshRef.current) {
      const hits: THREE.Intersection[] = []
      raycaster.current.intersectObject(planeMeshRef.current, false, hits)
      if (hits.length > 0) {
        mouseWorld.current.copy(hits[0].point)
      }
    }

    const mx = mouseWorld.current.x
    const my = mouseWorld.current.y

    // ── Read scroll progress from CSS var ────────────────────────────────
    const scrollProgress = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0'
    )

    // ── Phase machine ────────────────────────────────────────────────────
    const phase = phaseRef.current

    if (phase !== 'idle') {
      if (triggerTimeRef.current === null) triggerTimeRef.current = t

      const elapsed = t - triggerTimeRef.current

      if (phase === 'converging') {
        // 0 → 3.5s: convergenza lenta, Power3 ease-in-out
        const raw = Math.min(elapsed / 3.5, 1)
        convergenceRef.current = easeInOut3(raw)
        networkApiRef.current?.setOvershoot(0)
        if (elapsed >= 3.5) {
          convergenceRef.current = 1
          phaseRef.current = 'crystallizing'
        }
      }

      if (phase === 'crystallizing') {
        // 3.5 → 4.0s: overshoot radiale sin(t·π), poi snap
        convergenceRef.current = 1
        const crystalT = Math.min((elapsed - 3.5) / 0.5, 1)
        const overshoot = Math.sin(crystalT * Math.PI)
        networkApiRef.current?.setOvershoot(overshoot)
        if (elapsed >= 4.0) {
          networkApiRef.current?.setOvershoot(0)
          chromeApiRef.current?.setVisible(true)
          chromeApiRef.current?.setOpacity(0)
          chromeApiRef.current?.setScale(0.96)
          phaseRef.current = 'chrome_in'
        }
      }

      if (phase === 'chrome_in') {
        // 4.0 → 5.5s: scale 0.96→1 + opacity 0→1, expo-out quartica
        convergenceRef.current = 1
        networkApiRef.current?.setOvershoot(0)
        const chromeT = Math.min((elapsed - 4.0) / 1.5, 1)
        // Expo-out quartica: 1 - (1-t)^4  →  80% opacità nei primi ~0.4s
        const eased = 1 - Math.pow(1 - chromeT, 4)
        chromeApiRef.current?.setOpacity(eased)
        chromeApiRef.current?.setScale(0.96 + 0.04 * eased)
        if (elapsed >= 5.5) {
          chromeApiRef.current?.setOpacity(1)
          chromeApiRef.current?.setScale(1)
          phaseRef.current = 'settled'
          document.documentElement.style.setProperty('--hero-animation-complete', '1')
        }
      }

      if (phase === 'settled') {
        convergenceRef.current = 1
        networkApiRef.current?.setOvershoot(0)
        chromeApiRef.current?.setOpacity(1)
        chromeApiRef.current?.setScale(1)
      }
    }

    // ── Pass data to children ─────────────────────────────────────────────
    networkApiRef.current?.setConvergence(convergenceRef.current)
    networkApiRef.current?.setMouseWorld(mx, my)
    networkApiRef.current?.setScrollProgress(scrollProgress)

    chromeApiRef.current?.setMouseInfluence(mx / (size.width * 0.5), my / (size.height * 0.5))
    chromeApiRef.current?.setScrollProgress(scrollProgress)
  })

  return (
    <>
      {/* Lighting — required for MeshPhysicalMaterial chrome effect */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      {/* Cyan point light behind camera — gives the signature cyan rim on chrome */}
      <pointLight position={[0, 0, 10]} intensity={0.5} color="#00D4FF" />

      {/* Invisible plane at z=0 for raycasting */}
      <mesh ref={planeMeshRef} visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>

      <ParticleNetwork networkRef={networkApiRef} isMobile={isMobile} />
      <ChromeText chromeRef={chromeApiRef} />
    </>
  )
}
