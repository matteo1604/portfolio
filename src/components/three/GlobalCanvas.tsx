import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useRef, useEffect, Suspense } from 'react'

import { MorphParticles } from './MorphParticles'
import { ChromeText, type ChromeTextRef } from './ChromeText'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type Phase = 'idle' | 'converging' | 'chrome_in' | 'settled'

function GlobalSceneController({ isMobile }: { isMobile: boolean }) {
  const { camera } = useThree()
  
  const phaseRef = useRef<Phase>('idle')
  const triggerTimeRef = useRef<number | null>(null)
  
  const chromeApiRef = useRef<ChromeTextRef>(null)
  const bloomRef = useRef<any>(null)
  const flashStateRef = useRef(0)
  
  const mouseNDC = useRef(new THREE.Vector2(0, 0))

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseNDC.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseNDC.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

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

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const phase = phaseRef.current

    if (phase !== 'idle') {
      if (triggerTimeRef.current === null) triggerTimeRef.current = t
      const elapsed = t - triggerTimeRef.current

      if (phase === 'converging') {
        camera.position.z = 6
        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
          ;(camera as THREE.PerspectiveCamera).fov = 85
          camera.updateProjectionMatrix()
        }
        
        if (elapsed >= 1.2) {
          phaseRef.current = 'chrome_in'
          if (chromeApiRef.current) chromeApiRef.current.setVisible(true)
        }
      } else if (phase === 'chrome_in') {
        const tChrome = Math.max(0, elapsed - 1.2)
        const duration = 1.0
        const clampedT = Math.min(tChrome / duration, 1.0)
        
        const pullBackEase = 1 - Math.pow(1 - clampedT, 4)
        camera.position.z = 6 + pullBackEase * 24 // Pull back to 30 for the MorphParticles
        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
          ;(camera as THREE.PerspectiveCamera).fov = 85 - pullBackEase * (85 - (isMobile ? 65 : 45))
          camera.updateProjectionMatrix()
        }
        
        const flashIntensity = clampedT < 0.15 
          ? (clampedT / 0.15) 
          : 1 - ((clampedT - 0.15) / 0.85)

        if (bloomRef.current) bloomRef.current.intensity = flashIntensity * 2.5
        
        if (chromeApiRef.current) chromeApiRef.current.setEntranceProgress(clampedT)
        
        if (tChrome >= duration) {
          phaseRef.current = 'settled'
          document.documentElement.style.setProperty('--hero-animation-complete', '1')
          if (bloomRef.current) bloomRef.current.intensity = 0
        }
      } else if (phase === 'settled') {
        const scrollProgress = parseFloat(document.documentElement.style.getPropertyValue('--hero-progress') || '0')
        
        const targetZ = 30 - (scrollProgress * 12)
        camera.position.z += (targetZ - camera.position.z) * 0.1
        
        if (chromeApiRef.current && !isMobile) {
          chromeApiRef.current.setMouseInfluence(mouseNDC.current.x, mouseNDC.current.y)
        }
        if (chromeApiRef.current) {
          chromeApiRef.current.setScrollProgress(scrollProgress * 4.0) // scroll title away fast
          chromeApiRef.current.setOpacity(Math.max(0, 1 - scrollProgress * 3.0))
        }
        
        // Handle cinematic bloom flashes triggered by scroll snaps
        const flashRaw = parseFloat(document.documentElement.style.getPropertyValue('--p-flash') || '0')
        if (flashRaw > 0.5 && flashStateRef.current === 0) {
           flashStateRef.current = 1.0 // Trigger new flash
        }
        
        const targetBloom = flashStateRef.current * 4.0
        if (bloomRef.current) bloomRef.current.intensity += (targetBloom - bloomRef.current.intensity) * 0.1
        
        flashStateRef.current *= 0.9 // decay
      }
    } else {
      camera.position.z = 6
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        ;(camera as THREE.PerspectiveCamera).fov = 85
        camera.updateProjectionMatrix()
      }
    }
  })

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={1.8} />
      <pointLight position={[0, 0, 10]} intensity={2.0} color="#00D4FF" />
      
      {/* Background space elements */}
      <Stars radius={80} depth={60} count={2000} factor={3} saturation={0} fade speed={0.8} />
      <Environment preset="night" background={false} />
      
      <ChromeText ref={chromeApiRef} />
      
      <EffectComposer multisampling={4} autoClear={false}>
        <Bloom ref={bloomRef} intensity={0} luminanceThreshold={0.5} luminanceSmoothing={0.9} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.12} />
      </EffectComposer>
    </>
  )
}

export function GlobalCanvas() {
  const isMobile = useMediaQuery('(max-width: 767px)')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none', // Critical: clicks pass through to DOM sections
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 30], fov: isMobile ? 65 : 45 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
           <GlobalSceneController isMobile={isMobile} />
           <MorphParticles isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}
