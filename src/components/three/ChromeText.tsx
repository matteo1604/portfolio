import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Text, Center } from '@react-three/drei'
import * as THREE from 'three'

export interface ChromeTextRef {
  setVisible: (v: boolean) => void
  setOpacity: (v: number) => void
  setScale: (v: number) => void
  setMouseInfluence: (x: number, y: number) => void
  setScrollProgress: (v: number) => void
  setEntranceProgress: (t: number) => void
}

export const ChromeText = forwardRef<ChromeTextRef, {}>((_, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const group1Ref = useRef<THREE.Group>(null)
  const group2Ref = useRef<THREE.Group>(null)
  
  const mat1Ref = useRef<THREE.MeshPhysicalMaterial>(null)
  const mat2Ref = useRef<THREE.MeshPhysicalMaterial>(null)
  
  const { size } = useThree()
  
  const isMobile = size.width < 768
  const baseScale = isMobile ? 0.65 : 1.3 // Ingrandito del 30% circa

  useImperativeHandle(ref, () => ({
    setVisible: (v) => {
      if (groupRef.current) groupRef.current.visible = v
    },
    setOpacity: (v) => {
      if (mat1Ref.current) mat1Ref.current.opacity = v
      if (mat2Ref.current) mat2Ref.current.opacity = v
    },
    setScale: (v) => {
      if (groupRef.current) {
        groupRef.current.scale.setScalar(v * baseScale)
      }
    },
    setMouseInfluence: (x, y) => {
      if (groupRef.current) {
        groupRef.current.rotation.y += (x * 0.08 - groupRef.current.rotation.y) * 0.08
        groupRef.current.rotation.x += (-y * 0.05 - groupRef.current.rotation.x) * 0.08
      }
    },
    setScrollProgress: (v) => {
      if (groupRef.current) {
        groupRef.current.position.y = v * 5.0
      }
    },
    setEntranceProgress: (t) => {
      // Snappy exponential ease-out
      const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      
      if (mat1Ref.current) mat1Ref.current.opacity = Math.min(1, t * 1.5)
      if (mat2Ref.current) mat2Ref.current.opacity = Math.min(1, t * 1.5)
      
      if (groupRef.current) {
        // Slam down scale
        const scale = 1 + (1 - ease) * 1.5
        groupRef.current.scale.setScalar(scale * baseScale)
      }
      
      if (group1Ref.current && group2Ref.current) {
        // MATTEO flies in from left, RAINERI from right, both coming from back Z
        const invEase = 1 - ease
        group1Ref.current.position.x = -invEase * 6
        group1Ref.current.position.z = invEase * 10
        group1Ref.current.rotation.y = invEase * 0.8
        
        group2Ref.current.position.x = invEase * 6
        group2Ref.current.position.z = invEase * 10
        group2Ref.current.rotation.y = -invEase * 0.8
      }
    }
  }))

  // Liquid Chrome — high metalness with self-illumination so it never
  // vanishes against dark backgrounds. Clearcoat adds the wet gloss layer.
  const chromeProps = useMemo(() => ({
    metalness: 1.0,
    roughness: 0.20,             // Brushed titanium — spreads light evenly
    envMapIntensity: 3.5,        // Strong environment reflections
    color: new THREE.Color('#E0E8F0'),  // Bright cool silver base
    emissive: new THREE.Color('#5A6A7A'), // Brighter self-illumination
    emissiveIntensity: 0.6,      // Raised — guaranteed visibility on black
    clearcoat: 1.0,              // Wet lacquer layer on top
    clearcoatRoughness: 0.08,    // Slightly softer clearcoat
    transparent: true,
    opacity: 0,
    side: THREE.FrontSide,
  }), [])

  const textProps = {
    font: '/fonts/clash-display-bold.woff',
    fontSize: 3.8,
    letterSpacing: -0.02,
    lineHeight: 1,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
  }

  return (
    <group ref={groupRef} visible={false} position={[0, 0, 3]}>
      {/* Dedicated rim lights to ensure the chrome always catches light */}
      <pointLight position={[-6, 3, 6]} intensity={3.0} color="#FFFFFF" distance={20} decay={2} />
      <pointLight position={[6, -2, 6]} intensity={2.0} color="#B0D0FF" distance={20} decay={2} />
      <pointLight position={[0, 0, 8]} intensity={1.5} color="#E0F0FF" distance={15} decay={2} />

      <group ref={group1Ref} position={[0, 1.4, 0]}>
        <Center>
          <Text {...textProps} outlineWidth={0.03} outlineColor="#8899AA">
            MATTEO
            <meshPhysicalMaterial ref={mat1Ref} {...chromeProps} />
          </Text>
        </Center>
      </group>

      <group ref={group2Ref} position={[0, -1.4, 0]}>
        <Center>
          <Text {...textProps} outlineWidth={0.03} outlineColor="#8899AA">
            RAINERI
            <meshPhysicalMaterial ref={mat2Ref} {...chromeProps} />
          </Text>
        </Center>
      </group>
    </group>
  )
})
