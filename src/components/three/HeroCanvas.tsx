import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { NodeNetwork } from './NodeNetwork'
import { LiquidDistortion } from './LiquidDistortion'

/**
 * HeroCanvas — position:fixed full-viewport Canvas.
 * Layer 0: subtle NodeNetwork (texture mode)
 * Layer 1: LiquidDistortion fullscreen quad with "MATTEO" shader
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
        {/* Layer 0: subtle node network behind everything */}
        <NodeNetwork />
        {/* Layer 1: liquid distortion text on top */}
        <LiquidDistortion />
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
