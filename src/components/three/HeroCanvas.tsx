import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { HeroScene } from './HeroScene'

interface Props {
  isMobile: boolean
}

export function HeroCanvas({ isMobile }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'auto',
        backgroundColor: 'var(--bg-primary)',
      }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 14], fov: 55 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        frameloop="always"
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          {/* Environment for chrome reflections — city preset gives cool cyan/blue tones */}
          <Environment preset="night" background={false} />
          <HeroScene isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}
