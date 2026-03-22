import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { NodeNetwork } from './NodeNetwork'

/**
 * HeroCanvas — position:fixed full-viewport Canvas, rendered behind all content.
 * The Canvas itself handles the 3D scene; DOM content overlays it via z-index.
 */
export function HeroCanvas() {
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
        camera={{ position: [0, 0, 12], fov: 60 }}
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
            intensity={0.4}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
          />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
