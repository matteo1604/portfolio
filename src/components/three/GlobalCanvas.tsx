import { Canvas } from '@react-three/fiber'
import { Environment, Stars } from '@react-three/drei'
import { Suspense } from 'react'

import { SceneDirector } from './SceneDirector'
import { MorphParticles } from './MorphParticles'
import { EnvelopeShell } from './EnvelopeShell'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function GlobalCanvas() {
  const isMobile      = useMediaQuery('(max-width: 767px)')
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <Canvas
        dpr={reducedMotion ? 1 : isMobile ? [1, 1.2] : [1, 1.5]}
        camera={{ position: [0, 0, 30], fov: isMobile ? 65 : 45 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <SceneDirector isMobile={isMobile} reducedMotion={reducedMotion} />

          <Stars
            radius={72}
            depth={52}
            count={isMobile ? 700 : 1100}
            factor={2.5}
            saturation={0}
            fade
            speed={0.55}
          />
          <Environment preset="night" background={false} />

          <EnvelopeShell isMobile={isMobile} reducedMotion={reducedMotion} />
          <MorphParticles isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}
