import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

// ── Shaders ────────────────────────────────────────────────────────────────

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  // Value noise — independent hash per corner avoids tiling artefacts
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i,               vec2(127.1, 311.7))) * 43758.545);
    float b = fract(sin(dot(i + vec2(1, 0),  vec2(269.5, 183.3))) * 43758.545);
    float c = fract(sin(dot(i + vec2(0, 1),  vec2(419.2,  71.9))) * 43758.545);
    float d = fract(sin(dot(i + vec2(1, 1),  vec2( 17.3, 537.1))) * 43758.545);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // FBM — 5 octaves
  float fbm(vec2 p) {
    float v = 0.0, w = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      v += w * noise(p);
      p  = rot * p * 2.1 + vec2(1.7, 9.2);
      w *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= 2.2;

    // Slow warp
    vec2 q = uv + vec2(uTime * 0.00045, uTime * 0.00025);
    vec2 warp = vec2(fbm(q * 1.4), fbm(q * 1.4 + 1.9));
    float n = fbm(q * 1.1 + warp * 0.45);

    // Galactic band — dense along equator
    float band  = exp(-uv.y * uv.y * 4.8);
    float cloud = smoothstep(0.36, 0.64, n) * band;
    float glow  = smoothstep(0.12, 0.52, n) * band * 0.45;

    // Colours
    vec3 deepBlue  = vec3(0.02, 0.04, 0.17);
    vec3 nebViolet = vec3(0.07, 0.02, 0.21);
    vec3 cyanTrace = vec3(0.00, 0.14, 0.22);

    vec3 col = mix(deepBlue, nebViolet, cloud);
    col = mix(col, cyanTrace, glow * 0.28);

    float alpha = (cloud * 0.14 + glow * 0.04) * uOpacity;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.20));
  }
`

// ── Component ──────────────────────────────────────────────────────────────

export function NebulaBackground() {
  const reducedMotion = usePrefersReducedMotion()

  const geometry = useMemo(() => new THREE.PlaneGeometry(128, 64), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader:   VERT,
        fragmentShader: FRAG,
        transparent:    true,
        depthWrite:     false,
        blending:       THREE.AdditiveBlending,
        uniforms: {
          uTime:    { value: 0 },
          uOpacity: { value: 1 },
        },
      }),
    [],
  )

  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  useFrame((state) => {
    const scrollProgress = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0',
    )
    material.uniforms.uOpacity.value = Math.max(0, 1 - scrollProgress / 0.8)
    if (!reducedMotion) material.uniforms.uTime.value = state.clock.elapsedTime
  })

  // Slight tilt — galactic planes are never perfectly horizontal
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, 0, -28]}
      rotation={[0.06, 0.03, 0]}
      renderOrder={-1}
    />
  )
}
