import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { NodeNetwork } from './NodeNetwork'

/**
 * HeroCanvas — position:fixed full-viewport Canvas, rendered behind all content.
 * Bloom parte a intensità alta (1.2) al mount e scende a 0.4 in 2.5s.
 */
export function HeroCanvas() {
  const [bloomIntensity, setBloomIntensity] = useState(1.2)

  useEffect(() => {
    const startTime = performance.now()
    const duration = 2500
    let raf: number

    const tick = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)   // cubicOut
      setBloomIntensity(1.2 - (1.2 - 0.4) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: 'var(--bg-primary)',
      }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <NodeNetwork />
        <EffectComposer>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
          />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
