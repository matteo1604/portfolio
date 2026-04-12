import { Canvas } from '@react-three/fiber'
import { MorphParticles } from './MorphParticles'

export function ArchitecturesCanvas({ isMobile }: { isMobile?: boolean }) {
  // Mobile devices get a bit more FOV and centered framing, desktop pushes it slightly right if needed
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 30], fov: isMobile ? 65 : 45 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: true }}
      >
        <MorphParticles isMobile={isMobile} />
      </Canvas>
    </div>
  )
}
