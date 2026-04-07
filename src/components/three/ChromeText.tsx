import { useRef, useEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text3D } from '@react-three/drei'
import * as THREE from 'three'

const FONT_URL = '/fonts/clash_display_bold.typeface.json'

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

function ChromeTextInner({ chromeRef }: Props) {
  const groupRef       = useRef<THREE.Group>(null)
  const mat1Ref        = useRef<THREE.MeshPhysicalMaterial>(null)
  const mat2Ref        = useRef<THREE.MeshPhysicalMaterial>(null)
  const opacityRef     = useRef(0)
  const scaleRef       = useRef(1)
  const mouseRef       = useRef<[number, number]>([0, 0])
  const scrollRef      = useRef(0)
  const targetRotRef   = useRef<[number, number]>([0, 0])
  const currentRotRef  = useRef<[number, number]>([0, 0])

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
    const opacity = opacityRef.current * Math.max(0, 1 - scrollRef.current * 2)
    if (mat1Ref.current) mat1Ref.current.opacity = opacity
    if (mat2Ref.current) mat2Ref.current.opacity = opacity

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
      groupRef.current.position.z = scrollRef.current * 4
    }
  })

  const chromeMaterialProps = {
    color: '#E0E0E8' as const,
    metalness: 1,
    roughness: 0.04,
    envMapIntensity: 2.8,
    clearcoat: 0.9,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0,
  } as const

  return (
    <group ref={groupRef} visible={false} renderOrder={1}>
      {/* MATTEO — top line, left edge at x=-9 */}
      <group position={[-9, 1.5, 0]}>
        <Text3D
          font={FONT_URL}
          size={2.2}
          height={0.55}
          bevelEnabled
          bevelThickness={0.06}
          bevelSize={0.07}
          bevelSegments={10}
          curveSegments={64}
        >
          MATTEO
          <meshPhysicalMaterial ref={mat1Ref} {...chromeMaterialProps} />
        </Text3D>
      </group>

      {/* RAINERI — bottom line, indented 1.5 units right of MATTEO */}
      <group position={[-7.5, -1.0, 0]}>
        <Text3D
          font={FONT_URL}
          size={1.8}
          height={0.45}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.055}
          bevelSegments={8}
          curveSegments={18}
        >
          RAINERI
          <meshPhysicalMaterial ref={mat2Ref} {...chromeMaterialProps} />
        </Text3D>
      </group>
    </group>
  )
}

export function ChromeText({ chromeRef }: Props) {
  return (
    <Suspense fallback={null}>
      <ChromeTextInner chromeRef={chromeRef} />
    </Suspense>
  )
}
