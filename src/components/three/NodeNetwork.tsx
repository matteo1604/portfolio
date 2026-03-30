import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ── Texture-mode constants: subtle living background ──────── */
const NODE_COUNT = 35
const BOUNDS = 18
const CONNECTION_DISTANCE = 5.5
const FLOAT_SPEED = 0.10
const DRIFT_SPEED = 0.01

interface NodeData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  phase: number
  phaseSpeed: number
  radius: number
  fadeDelay: number
}

function buildConnections(positions: Float32Array, nodeCount: number): { indices: number[]; distances: number[] } {
  const indices: number[] = []
  const distances: number[] = []

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const dx = positions[i * 3] - positions[j * 3]
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < CONNECTION_DISTANCE) {
        indices.push(i, j)
        distances.push(dist)
      }
    }
  }

  return { indices, distances }
}

export function NodeNetwork() {
  const groupRef = useRef<THREE.Group>(null)

  const nodesRef = useRef<NodeData[]>([])
  const sphereRefs = useRef<(THREE.Mesh | null)[]>([])
  const lineRef = useRef<THREE.LineSegments | null>(null)
  const connectionIndicesRef = useRef<number[]>([])
  const connectionDistancesRef = useRef<number[]>([])

  const introRef = useRef({ started: false, startTime: 0 })

  const initialPositions = useMemo<Float32Array>(() => {
    const rng = (() => {
      let seed = 42
      return () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    })()

    const arr = new Float32Array(NODE_COUNT * 3)
    const nodes: NodeData[] = []

    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (rng() - 0.5) * BOUNDS * 2
      const y = (rng() - 0.5) * BOUNDS * 1.2
      const z = (rng() - 0.5) * BOUNDS * 0.6

      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z

      nodes.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (rng() - 0.5) * 0.002,
          (rng() - 0.5) * 0.002,
          (rng() - 0.5) * 0.001,
        ),
        phase: rng() * Math.PI * 2,
        phaseSpeed: 0.2 + rng() * 0.5,
        radius: 0.035,
        fadeDelay: rng() * 2.0,
      })
    }

    nodesRef.current = nodes

    const { indices, distances } = buildConnections(arr, NODE_COUNT)
    connectionIndicesRef.current = indices
    connectionDistancesRef.current = distances

    return arr
  }, [])

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.035, 6, 6), [])

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(connectionIndicesRef.current.length * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(connectionIndicesRef.current.length * 3), 3))
    return geo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionIndicesRef.current.length])

  useFrame((state, delta) => {
    const nodes = nodesRef.current
    if (!nodes.length) return

    // ── Camera wake-up: z=8 -> z=12 in 3s ──
    if (!introRef.current.started) {
      introRef.current.started = true
      introRef.current.startTime = state.clock.elapsedTime
      state.camera.position.z = 8
    }
    const introElapsed = state.clock.elapsedTime - introRef.current.startTime
    if (introElapsed < 3) {
      const progress = introElapsed / 3
      const eased = 1 - Math.pow(1 - progress, 3)
      state.camera.position.z = 8 + (12 - 8) * eased
    }

    // Slow drift rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += DRIFT_SPEED * delta
    }

    // Read scroll progress from CSS var
    const rawProgress = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0',
    )
    const scrollProgress = Math.max(0, Math.min(1, rawProgress))

    const t = performance.now() * 0.001
    const camZ = state.camera.position.z

    // Update node positions — organic float only, no mouse influence
    for (let i = 0; i < NODE_COUNT; i++) {
      const node = nodes[i]

      const floatX = Math.sin(t * FLOAT_SPEED * node.phaseSpeed + node.phase) * 0.008
      const floatY = Math.cos(t * FLOAT_SPEED * node.phaseSpeed * 0.7 + node.phase + 1.2) * 0.008
      const floatZ = Math.sin(t * FLOAT_SPEED * node.phaseSpeed * 0.4 + node.phase + 2.4) * 0.004

      node.position.x += node.velocity.x + floatX
      node.position.y += node.velocity.y + floatY
      node.position.z += node.velocity.z + floatZ

      // Soft boundary wrapping
      if (node.position.x > BOUNDS) node.position.x = -BOUNDS
      if (node.position.x < -BOUNDS) node.position.x = BOUNDS
      if (node.position.y > BOUNDS * 0.7) node.position.y = -BOUNDS * 0.7
      if (node.position.y < -BOUNDS * 0.7) node.position.y = BOUNDS * 0.7
      if (node.position.z > BOUNDS * 0.4) node.position.z = -BOUNDS * 0.4
      if (node.position.z < -BOUNDS * 0.4) node.position.z = BOUNDS * 0.4

      // Scroll dissolve
      const scrollDrift = scrollProgress * 4
      node.position.z -= scrollDrift * delta * 0.8

      // Update sphere mesh
      const mesh = sphereRefs.current[i]
      if (mesh) {
        mesh.position.copy(node.position)

        // Depth-of-field fade
        const distFromCam = Math.abs(camZ - node.position.z)
        const depthFade = Math.max(0.15, 1 - (distFromCam / (camZ + BOUNDS * 0.4)) * 0.7)

        // Staggered fade-in
        const nodeFadeProgress = Math.max(0, Math.min(1,
          (introElapsed - node.fadeDelay) / 0.8,
        ))

        const material = mesh.material as THREE.MeshBasicMaterial
        material.opacity = Math.max(0, depthFade * 0.12 * (1 - scrollProgress * 1.5) * nodeFadeProgress)
      }
    }

    // Update line segments
    if (lineRef.current) {
      const posAttr = lineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const colorAttr = lineRef.current.geometry.getAttribute('color') as THREE.BufferAttribute
      const indices = connectionIndicesRef.current
      const distances = connectionDistancesRef.current

      for (let c = 0; c < indices.length; c += 2) {
        const iA = indices[c]
        const iB = indices[c + 1]
        const connIdx = c / 2
        const dist = distances[connIdx]

        const pA = nodes[iA].position
        const pB = nodes[iB].position

        const segIdx = c * 3
        posAttr.array[segIdx] = pA.x
        posAttr.array[segIdx + 1] = pA.y
        posAttr.array[segIdx + 2] = pA.z
        posAttr.array[segIdx + 3] = pB.x
        posAttr.array[segIdx + 4] = pB.y
        posAttr.array[segIdx + 5] = pB.z

        // Staggered connection fade-in
        const fadeA = Math.max(0, Math.min(1, (introElapsed - nodes[iA].fadeDelay) / 0.8))
        const fadeB = Math.max(0, Math.min(1, (introElapsed - nodes[iB].fadeDelay) / 0.8))
        const connFade = (fadeA + fadeB) * 0.5

        const baseAlpha = Math.min(0.04, (1 - dist / CONNECTION_DISTANCE) * 0.03)
        const alpha = Math.max(0, baseAlpha * (1 - scrollProgress * 1.5) * connFade)

        colorAttr.array[segIdx] = 0
        colorAttr.array[segIdx + 1] = 0.831 * alpha * 5
        colorAttr.array[segIdx + 2] = 1.0 * alpha * 5
        colorAttr.array[segIdx + 3] = 0
        colorAttr.array[segIdx + 4] = 0.831 * alpha * 5
        colorAttr.array[segIdx + 5] = 1.0 * alpha * 5
      }

      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef}>
      <lineSegments ref={lineRef} geometry={lineGeometry} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={1} />
      </lineSegments>

      {Array.from({ length: NODE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { sphereRefs.current[i] = el }}
          position={[
            initialPositions[i * 3],
            initialPositions[i * 3 + 1],
            initialPositions[i * 3 + 2],
          ]}
          geometry={sphereGeometry}
          frustumCulled={true}
        >
          <meshBasicMaterial color="#00D4FF" transparent opacity={0} />
        </mesh>
      ))}
    </group>
  )
}
