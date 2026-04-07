import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { NebulaBackground } from './NebulaBackground'
import { StarField } from './StarField'
import { ShootingStars } from './ShootingStars'
import { ChromeText, type ChromeTextRef } from './ChromeText'

type Phase = 'idle' | 'converging' | 'crystallizing' | 'chrome_in' | 'settled'

interface Props {
  isMobile: boolean
}

export function HeroScene({ isMobile }: Props) {
  const { size, camera } = useThree()

  const phaseRef       = useRef<Phase>('idle')
  const triggerTimeRef = useRef<number | null>(null)

  const chromeApiRef   = useRef<ChromeTextRef | null>(null)

  // Invisible plane at z=0 for mouse raycasting (used by ChromeText tilt)
  const planeMeshRef = useRef<THREE.Mesh>(null)
  const raycaster    = useRef(new THREE.Raycaster())
  const mouseNDC     = useRef(new THREE.Vector2(0, 0))
  const mouseWorld   = useRef(new THREE.Vector3())

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

    // ── Raycast mouse to z=0 plane for ChromeText tilt ───────────────────
    raycaster.current.setFromCamera(mouseNDC.current, camera)
    if (planeMeshRef.current) {
      const hits: THREE.Intersection[] = []
      raycaster.current.intersectObject(planeMeshRef.current, false, hits)
      if (hits.length > 0) mouseWorld.current.copy(hits[0].point)
    }

    const mx = mouseWorld.current.x
    const my = mouseWorld.current.y

    const scrollProgress = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0'
    )

    // ── Phase machine — drives ChromeText reveal timing ──────────────────
    const phase = phaseRef.current

    if (phase !== 'idle') {
      if (triggerTimeRef.current === null) triggerTimeRef.current = t

      const elapsed = t - triggerTimeRef.current

      if (phase === 'converging') {
        // 0 → 3.5s: waiting period before chrome text appears
        if (elapsed >= 3.5) phaseRef.current = 'crystallizing'
      }

      if (phase === 'crystallizing') {
        // 3.5 → 4.0s: brief transition, then reveal chrome text
        if (elapsed >= 4.0) {
          chromeApiRef.current?.setVisible(true)
          chromeApiRef.current?.setOpacity(0)
          chromeApiRef.current?.setScale(0.96)
          phaseRef.current = 'chrome_in'
        }
      }

      if (phase === 'chrome_in') {
        // 4.0 → 5.5s: scale 0.96→1 + opacity 0→1, expo-out quartic
        const chromeT = Math.min((elapsed - 4.0) / 1.5, 1)
        const eased   = 1 - Math.pow(1 - chromeT, 4)
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
        chromeApiRef.current?.setOpacity(1)
        chromeApiRef.current?.setScale(1)
      }
    }

    // ── Pass mouse + scroll to ChromeText ────────────────────────────────
    chromeApiRef.current?.setMouseInfluence(mx / (size.width * 0.5), my / (size.height * 0.5))
    chromeApiRef.current?.setScrollProgress(scrollProgress)
  })

  return (
    <>
      {/* Lighting — required for MeshPhysicalMaterial chrome reflections */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={1.8} />
      {/* Cyan point light behind camera — signature cyan rim on chrome */}
      <pointLight position={[0, 0, 10]} intensity={2.0} color="#00D4FF" />
      {/* Warm fill from top-left — adds depth to MATTEO side */}
      <pointLight position={[-8, 4, 6]} intensity={0.6} />

      {/* Invisible plane at z=0 for raycasting */}
      <mesh ref={planeMeshRef} visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>

      <NebulaBackground />
      <StarField />
      <ShootingStars />
      <ChromeText chromeRef={chromeApiRef} />
    </>
  )
}
