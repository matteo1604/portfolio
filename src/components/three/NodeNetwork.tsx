import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const NODE_COUNT = 80
const BOUNDS = 18
const CONNECTION_DISTANCE = 5
const FLOAT_SPEED = 0.08
const MOUSE_INFLUENCE_RADIUS = 3.5
const MOUSE_STRENGTH = 0.4
const DRIFT_SPEED = 0.02

interface NodeData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  phase: number
  phaseSpeed: number
  radius: number
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
  const { pointer, viewport, camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  // Node data stored in refs — no React state for frame-level updates
  const nodesRef = useRef<NodeData[]>([])
  const sphereRefs = useRef<(THREE.Mesh | null)[]>([])
  const lineRef = useRef<THREE.LineSegments | null>(null)
  const connectionIndicesRef = useRef<number[]>([])
  const connectionDistancesRef = useRef<number[]>([])

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
      let x = (rng() - 0.5) * BOUNDS * 2
      const y = (rng() - 0.5) * BOUNDS * 1.2
      const z = (rng() - 0.5) * BOUNDS * 0.6

      // Push nodes away from center to leave clear zone for text
      if (Math.abs(x) < 4 && Math.abs(y) < 3) {
        x *= 2.5
      }

      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z

      nodes.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (rng() - 0.5) * 0.003,
          (rng() - 0.5) * 0.003,
          (rng() - 0.5) * 0.002,
        ),
        phase: rng() * Math.PI * 2,
        phaseSpeed: 0.3 + rng() * 0.7,
        radius: 0.035,
      })
    }

    nodesRef.current = nodes

    const { indices, distances } = buildConnections(arr, NODE_COUNT)
    connectionIndicesRef.current = indices
    connectionDistancesRef.current = distances

    return arr
  }, [])

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.035, 6, 6), [])

  // Geometry for the line segments
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(connectionIndicesRef.current.length * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((connectionIndicesRef.current.length) * 3), 3))
    return geo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionIndicesRef.current.length])

  useFrame((_, delta) => {
    const nodes = nodesRef.current
    if (!nodes.length) return

    // Slow drift rotation on the group
    if (groupRef.current) {
      groupRef.current.rotation.y += DRIFT_SPEED * delta
    }

    // Read scroll progress from CSS var
    const rawProgress = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0'
    )
    const scrollProgress = Math.max(0, Math.min(1, rawProgress))

    // Map pointer to world-space approximate position
    const mouseX = pointer.x * (viewport.width / 2)
    const mouseY = pointer.y * (viewport.height / 2)

    const t = performance.now() * 0.001
    const camZ = camera.position.z

    // Update node positions
    for (let i = 0; i < NODE_COUNT; i++) {
      const node = nodes[i]

      // Organic floating motion — slow, breathing rhythm
      const floatX = Math.sin(t * FLOAT_SPEED * node.phaseSpeed + node.phase) * 0.012
      const floatY = Math.cos(t * FLOAT_SPEED * node.phaseSpeed * 0.7 + node.phase + 1.2) * 0.012
      const floatZ = Math.sin(t * FLOAT_SPEED * node.phaseSpeed * 0.4 + node.phase + 2.4) * 0.006

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

      // Mouse influence
      const dx = node.position.x - mouseX
      const dy = node.position.y - mouseY
      const distToMouse = Math.sqrt(dx * dx + dy * dy)
      if (distToMouse < MOUSE_INFLUENCE_RADIUS && distToMouse > 0.01) {
        const force = (1 - distToMouse / MOUSE_INFLUENCE_RADIUS) * MOUSE_STRENGTH * delta
        node.position.x += (dx / distToMouse) * force
        node.position.y += (dy / distToMouse) * force
      }

      // Scroll dissolve: push nodes away from camera
      const scrollDrift = scrollProgress * 4
      node.position.z -= scrollDrift * delta * 0.8

      // Update sphere mesh
      const mesh = sphereRefs.current[i]
      if (mesh) {
        mesh.position.copy(node.position)
        // Depth-of-field: nodes farther from camera have lower opacity
        const distFromCam = Math.abs(camZ - node.position.z)
        const depthFade = Math.max(0.15, 1 - (distFromCam / (camZ + BOUNDS * 0.4)) * 0.7)
        const material = mesh.material as THREE.MeshBasicMaterial
        material.opacity = Math.max(0, depthFade * 0.4 * (1 - scrollProgress * 1.5))
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

        // Soft mouse glow — gradual falloff
        const dxA = nodes[iA].position.x - mouseX
        const dyA = nodes[iA].position.y - mouseY
        const distAToMouse = Math.sqrt(dxA * dxA + dyA * dyA)
        const mouseFactor = distAToMouse < MOUSE_INFLUENCE_RADIUS
          ? (1 - distAToMouse / MOUSE_INFLUENCE_RADIUS) * 0.3
          : 0

        const baseAlpha = (1 - dist / CONNECTION_DISTANCE) * 0.12 + mouseFactor * 0.3
        const alpha = Math.max(0, baseAlpha * (1 - scrollProgress * 1.5))

        // Cyan color: #00D4FF = (0, 0.831, 1)
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
      {/* Line connections */}
      <lineSegments ref={lineRef} geometry={lineGeometry} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={1} />
      </lineSegments>

      {/* Nodes */}
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
          <meshBasicMaterial
            color="#00D4FF"
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}
