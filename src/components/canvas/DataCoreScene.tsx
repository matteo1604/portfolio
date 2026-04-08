import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Stars } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

function ParticleSwarm({ count = 2000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  
  const { viewport, mouse } = useThree()
  
  // Create random positions and initial velocities
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
        // distribute inside a wide cylinder/sphere
        const theta = Math.random() * Math.PI * 2
        const r = Math.random() * 20 + 6
        const y = (Math.random() - 0.5) * 30
        temp.push({
            x: r * Math.cos(theta),
            y: y,
            z: r * Math.sin(theta),
            speed: Math.random() * 0.02 + 0.005,
            angle: theta
        })
    }
    return temp
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    if (!meshRef.current) return
    
    // Convert normalized mouse to world space roughly
    const mx = (mouse.x * viewport.width) / 2
    const my = (mouse.y * viewport.height) / 2

    particles.forEach((p, i) => {
      // Slow rotation
      p.angle -= p.speed * 0.1
      p.x = Math.cos(p.angle) * (10 + Math.sin(state.clock.elapsedTime * p.speed + i) * 2)
      p.z = Math.sin(p.angle) * (10 + Math.cos(state.clock.elapsedTime * p.speed + i) * 2)
      
      // Mouse repulsion
      const dx = dummy.position.x - mx
      const dy = dummy.position.y - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      dummy.position.set(p.x, p.y, p.z)
      
      if (dist < 4) {
          const force = (4 - dist) / 4
          dummy.position.x += dx * force * 0.1
          dummy.position.y += dy * force * 0.1
      }
      
      const scale = 0.5 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.3
      dummy.scale.set(scale, scale, scale)
      
      dummy.updateMatrix()
      meshRef.current?.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    
    // subtle pulsing core color
    if (materialRef.current) {
        materialRef.current.opacity = 0.3 + Math.sin(state.clock.elapsedTime) * 0.1
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.015, 6, 6]} />
      <meshBasicMaterial 
        ref={materialRef} 
        color="#00d4ff" 
        transparent 
        opacity={0.15} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

function CameraRig({ progressRef }: { progressRef: React.RefObject<number> }) {
    const { camera } = useThree()
    
    useFrame(() => {
        const progress = progressRef.current || 0
        // Move camera through the particles based on scroll progress (0 to 1)
        // Awwwards feel: subtle parallax combined with deep Z-travel
        const targetZ = gsap.utils.interpolate(15, -5, progress)
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05)
        
        // slight rotation
        const targetRotY = gsap.utils.interpolate(0, Math.PI * 0.25, progress)
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.05)
    })
    
    return null
}

interface DataCoreSceneProps {
    progressRef: React.RefObject<number>;
}

export default function DataCoreScene({ progressRef }: DataCoreSceneProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 45 }}
        dpr={[1, 2]} // Performance optimization
        gl={{ antialias: false, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
          <ParticleSwarm count={1500} />
          
          {/* Distant stars for depth */}
          <Stars radius={80} depth={60} count={1500} factor={3} saturation={0} fade speed={0.8} />
        </Float>

        <CameraRig progressRef={progressRef} />
      </Canvas>
    </div>
  )
}
