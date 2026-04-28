import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface EnvelopeShellProps {
  isMobile?: boolean
  reducedMotion?: boolean
}

const SHELL_VERTEX = `
  attribute float aSize;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uVelocity;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Slow organic drift per-particle
    float drift = sin(uTime * 0.15 + position.x * 0.04 + position.z * 0.03) * 0.8;
    pos.y += drift;

    // Velocity streak: slightly elongate along Y when scrolling fast
    pos.y += sign(pos.y) * uVelocity * 0.6;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = 0.15 + 0.25 * abs(sin(uTime * 0.3 + position.x));
    gl_PointSize = (aSize + uVelocity * 0.5) * uPixelRatio * (60.0 / -mvPosition.z);
  }
`

const SHELL_FRAGMENT = `
  uniform float uProgress;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float t = clamp(uProgress, 0.0, 4.0);
    // Color shifts with morph state — stays desaturated
    vec3 col1 = vec3(0.0, 0.5, 0.6);   // cyan-ish
    vec3 col2 = vec3(0.1, 0.2, 0.5);   // blue-ish
    vec3 col3 = vec3(0.0, 0.5, 0.3);   // green-ish
    vec3 col4 = vec3(0.4, 0.0, 0.5);   // magenta-ish

    vec3 color;
    float seg = t / 4.0;
    if (seg < 0.25)      color = mix(col1, col2, seg * 4.0);
    else if (seg < 0.5)  color = mix(col2, col3, (seg - 0.25) * 4.0);
    else if (seg < 0.75) color = mix(col3, col4, (seg - 0.5) * 4.0);
    else                 color = col4;

    float alpha = vAlpha * (1.0 - dist * 1.6) * 0.4;
    gl_FragColor = vec4(color, alpha);
  }
`

const buildShellPoints = (count: number, radius: number) => {
  const pos = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const phi   = Math.acos(-1 + (2 * i) / count)
    const theta = Math.sqrt(count * Math.PI) * phi
    const jitter = (Math.random() - 0.5) * radius * 0.12
    pos[i * 3]     = (radius + jitter) * Math.cos(theta) * Math.sin(phi)
    pos[i * 3 + 1] = (radius + jitter) * Math.sin(theta) * Math.sin(phi)
    pos[i * 3 + 2] = (radius + jitter) * Math.cos(phi)
    sizes[i] = 0.8 + Math.random() * 1.2
  }
  return { pos, sizes }
}

export function EnvelopeShell({ isMobile = false, reducedMotion = false }: EnvelopeShellProps) {
  const groupRef = useRef<THREE.Group>(null)

  const count  = isMobile ? 900 : 2200
  const radius = isMobile ? 42  : 52

  const { pos, sizes } = useMemo(() => buildShellPoints(count, radius), [count, radius])

  const uniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uProgress:  { value: 0 },
    uVelocity:  { value: 0 },
    uPixelRatio:{ value: Math.min(window.devicePixelRatio, 2) },
  }), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    uniforms.uTime.value += dt

    const rawMorph    = parseFloat(document.documentElement.style.getPropertyValue('--p-morph')    || '0')
    const rawVelocity = parseFloat(document.documentElement.style.getPropertyValue('--scroll-velocity') || '0')

    uniforms.uProgress.value += (rawMorph - uniforms.uProgress.value) * 0.05
    uniforms.uVelocity.value  += (Math.min(rawVelocity * 0.1, 3.0) - uniforms.uVelocity.value) * 0.08

    if (groupRef.current && !reducedMotion) {
      const baseSpeed = isMobile ? 0.008 : 0.014
      const velBoost  = isMobile ? 0 : uniforms.uVelocity.value * 0.01
      groupRef.current.rotation.y += dt * (baseSpeed + velBoost)
      groupRef.current.rotation.x += dt * 0.005
    }
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={pos}   itemSize={3} />
          <bufferAttribute attach="attributes-aSize"    count={count} array={sizes} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={SHELL_VERTEX}
          fragmentShader={SHELL_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
