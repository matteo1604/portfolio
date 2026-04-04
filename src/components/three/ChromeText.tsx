import { useRef, useEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'

// Font loaded from public/fonts — avoids JSON import issues, drei FontLoader handles it
const FONT_URL = '/fonts/helvetiker_bold.typeface.json'

export interface ChromeTextRef {
  setVisible:        (v: boolean) => void
  setOpacity:        (v: number)  => void
  setMouseInfluence: (x: number, y: number) => void
  setScrollProgress: (v: number) => void
  setScale:          (v: number)  => void
}

interface Props {
  chromeRef: React.RefObject<ChromeTextRef | null>
}

// Inner component — has access to material refs
function ChromeTextInner({ chromeRef }: Props) {
  const groupRef    = useRef<THREE.Group>(null)
  const mat1Ref     = useRef<THREE.MeshPhysicalMaterial>(null)
  const mat2Ref     = useRef<THREE.MeshPhysicalMaterial>(null)

  const opacityRef         = useRef(0)
  const scaleRef           = useRef(1)
  const mouseRef           = useRef<[number, number]>([0, 0])
  const scrollRef          = useRef(0)
  const targetRotRef       = useRef<[number, number]>([0, 0])
  const currentRotRef      = useRef<[number, number]>([0, 0])

  useEffect(() => {
    ;(chromeRef as React.MutableRefObject<ChromeTextRef>).current = {
      setVisible:        (v) => { if (groupRef.current) groupRef.current.visible = v },
      setOpacity:        (v) => { opacityRef.current = v },
      setMouseInfluence: (x, y) => { mouseRef.current = [x, y] },
      setScrollProgress: (v) => { scrollRef.current = v },
      setScale:          (v) => { scaleRef.current = v },
    }
  }, [chromeRef])

  useFrame((_, delta) => {
    // Fade out when scrolling
    const opacity = opacityRef.current * Math.max(0, 1 - scrollRef.current * 2)
    if (mat1Ref.current) mat1Ref.current.opacity = opacity
    if (mat2Ref.current) mat2Ref.current.opacity = opacity

    // Subtle rotation from mouse — ±3 degrees for reflection shift
    const [mx, my] = mouseRef.current
    const MAX_ROT = (3 * Math.PI) / 180
    targetRotRef.current[0] = -my * MAX_ROT
    targetRotRef.current[1] =  mx * MAX_ROT

    const speed = 1 - Math.pow(0.04, delta)
    currentRotRef.current[0] += (targetRotRef.current[0] - currentRotRef.current[0]) * speed
    currentRotRef.current[1] += (targetRotRef.current[1] - currentRotRef.current[1]) * speed

    if (groupRef.current) {
      groupRef.current.scale.setScalar(scaleRef.current)
      groupRef.current.rotation.x = currentRotRef.current[0]
      groupRef.current.rotation.y = currentRotRef.current[1]
      // Scroll: push chrome in z
      groupRef.current.position.z = scrollRef.current * 4
    }
  })

  // Shared chrome material props
  const chromeMaterialProps = {
    color: '#C0C0C8' as const,
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 1.8,
    clearcoat: 0.4,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0,
  } as const

  return (
    <group ref={groupRef} visible={false} renderOrder={1}>
      {/* MATTEO — top line */}
      <Center position={[0, 1.8, 0]}>
        <Text3D
          font={FONT_URL}
          size={1.9}
          height={0.55}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.03}
          bevelSegments={6}
          curveSegments={12}
        >
          MATTEO
          <meshPhysicalMaterial ref={mat1Ref} {...chromeMaterialProps} />
        </Text3D>
      </Center>

      {/* RAINERI — bottom line */}
      <Center position={[0, -1.8, 0]}>
        <Text3D
          font={FONT_URL}
          size={1.55}
          height={0.45}
          bevelEnabled
          bevelThickness={0.04}
          bevelSize={0.025}
          bevelSegments={5}
          curveSegments={12}
        >
          RAINERI
          <meshPhysicalMaterial ref={mat2Ref} {...chromeMaterialProps} />
        </Text3D>
      </Center>
    </group>
  )
}

// Outer wrapper — Suspense so font loading doesn't block the rest of the scene
export function ChromeText({ chromeRef }: Props) {
  return (
    <Suspense fallback={null}>
      <ChromeTextInner chromeRef={chromeRef} />
    </Suspense>
  )
}
