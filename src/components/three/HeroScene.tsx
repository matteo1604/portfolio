import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ParticleSphere } from './ParticleSphere'
import { ChromeText, type ChromeTextRef } from './ChromeText'

type Phase = 'idle' | 'converging' | 'crystallizing' | 'chrome_in' | 'settled'

interface Props {
  isMobile: boolean
}

export function HeroScene({ isMobile }: Props) {
  const { camera } = useThree()

  const phaseRef       = useRef<Phase>('idle')
  const triggerTimeRef = useRef<number | null>(null)
  
  const chromeApiRef   = useRef<ChromeTextRef>(null)

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

    // ── Phase machine ────────────────────────────────────────────────────
    const phase = phaseRef.current

    if (phase !== 'idle') {
      if (triggerTimeRef.current === null) triggerTimeRef.current = t

      const elapsed = t - triggerTimeRef.current

      if (phase === 'converging') {
        if (elapsed >= 3.0) {
          phaseRef.current = 'chrome_in'
          if (chromeApiRef.current) chromeApiRef.current.setVisible(true)
        }
      } else if (phase === 'chrome_in') {
        const tChrome = elapsed - 3.0
        const duration = 2.0
        const clampedT = Math.min(tChrome / duration, 1.0)
        
        const easeOutCubic = 1 - Math.pow(1 - clampedT, 3)
        
        if (chromeApiRef.current) {
          chromeApiRef.current.setOpacity(easeOutCubic)
          chromeApiRef.current.setScale(1.1 - 0.1 * easeOutCubic)
        }
        
        if (tChrome >= duration) {
          phaseRef.current = 'settled'
          document.documentElement.style.setProperty('--hero-animation-complete', '1')
        }
      } else if (phase === 'settled') {
        const scrollProgress = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0'
        )
        
        if (chromeApiRef.current && !isMobile) {
          chromeApiRef.current.setMouseInfluence(mouseNDC.current.x, mouseNDC.current.y)
        }
        if (chromeApiRef.current) {
          chromeApiRef.current.setScrollProgress(scrollProgress)
          chromeApiRef.current.setOpacity(Math.max(0, 1 - scrollProgress * 1.5))
        }
      }
    }
  })

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={1.8} />
      <pointLight position={[0, 0, 10]} intensity={2.0} color="#00D4FF" />
      <pointLight position={[-8, 4, 6]} intensity={0.6} />

      <ParticleSphere isMobile={isMobile} />
      
      <ChromeText ref={chromeApiRef} />
    </>
  )
}
