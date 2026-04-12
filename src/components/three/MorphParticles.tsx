import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MorphParticlesProps {
  isMobile?: boolean
}

const PARTICLE_COUNT = 8000

// --- ALGORITHMIC SHAPE GENERATORS ---

// 1. FRONTEND: Perfect Structured Sphere Shell (Fibonacci lattice)
const getSpherePoints = (count: number, radius: number) => {
  const pts = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count)
    const theta = Math.sqrt(count * Math.PI) * phi
    pts[i * 3]     = radius * Math.cos(theta) * Math.sin(phi)
    pts[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi)
    pts[i * 3 + 2] = radius * Math.cos(phi)
  }
  return pts
}

// 2. CREATIVE DEV/WEBGL: Chaotic Galaxy Torus
const getTorusPoints = (count: number, R: number, r: number) => {
  const pts = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2
    const v = Math.random() * Math.PI * 2

    // Less extreme spread: elegant galaxy shape instead of a confusing cloud
    const spreadX = (Math.random() - 0.5) * 1.5
    const spreadY = (Math.random() - 0.5) * 1.5
    const spreadZ = (Math.random() - 0.5) * 3.0

    const x = (R + r * Math.cos(v)) * Math.cos(u) + spreadX
    const y = (R + r * Math.cos(v)) * Math.sin(u) + spreadY
    const z = r * Math.sin(v) + spreadZ

    pts[i * 3]     = x
    pts[i * 3 + 1] = z // Swap Y and Z to lay flat
    pts[i * 3 + 2] = y
  }
  return pts
}

// 3. BACKEND/DATA: Precise Mathematical Data Grid
const getGridPoints = (count: number, size: number) => {
  const pts = new Float32Array(count * 3)
  const side = Math.ceil(Math.pow(count, 1 / 3))
  const step = size / side
  const offset = size / 2

  for (let i = 0; i < count; i++) {
    // Snap to grid intersections
    const ix = Math.floor(Math.random() * side)
    const iy = Math.floor(Math.random() * side)
    const iz = Math.floor(Math.random() * side)

    // Micro jitter for life
    const jx = (Math.random() - 0.5) * step * 0.1
    const jy = (Math.random() - 0.5) * step * 0.1
    const jz = (Math.random() - 0.5) * step * 0.1

    pts[i * 3]     = ix * step - offset + jx
    pts[i * 3 + 1] = iy * step - offset + jy
    pts[i * 3 + 2] = iz * step - offset + jz
  }
  return pts
}

const getRandomAttributes = (count: number) => {
  const aRandom = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) {
    aRandom[i] = Math.random()
  }
  return aRandom
}

// --- MORPH SHADER ---
const snoiseFunc = `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0; 
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
`

const vertexShader = `
  ${snoiseFunc}

  attribute vec3 aPosition2;
  attribute vec3 aPosition3;
  attribute vec3 aRandom;

  uniform float uProgress; 
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;

  varying vec3 vColorBias;
  varying float vInfluence;

  void main() {
    float state = clamp(uProgress, 0.0, 2.0);
    
    // Smooth interpolations between the 3 targets
    vec3 posBase;
    
    // Exponential ease for explosive transitions!
    float t1 = smoothstep(0.0, 1.0, state);
    float t2 = smoothstep(0.0, 1.0, state - 1.0);
    
    if (state <= 1.0) {
        posBase = mix(position, aPosition2, t1);
    } else {
        posBase = mix(aPosition2, aPosition3, t2);
    }
    
    // Add continuous noise based on current state
    // Phase 1 Torus uses gentle fluid ripples (1.2) rather than explosive shaking
    float noiseTarget1 = mix(0.2, 1.2, t1);  
    float noiseTarget2 = mix(1.2, 0.05, t2); // constrain to grid
    float noiseAmount = mix(noiseTarget1, noiseTarget2, t2);
    
    float pulse = sin(uTime * 2.0 + aRandom.x * 10.0) * 0.5 + 0.5;
    
    vec3 noise = vec3(
        snoise(posBase * 1.5 + uTime),
        snoise(posBase.zyx * 1.5 - uTime),
        snoise(posBase.xzy * 1.5)
    ) * noiseAmount * pulse;
    
    posBase += noise;

    // Optional spinning logic based on state
    // Frontend spins slow, Webgl spins fast, Backend static
    float spinSpeed = mix(
      mix(uTime * 0.2, uTime * 0.8, t1),
      mix(uTime * 0.8, uTime * 0.0, t2),
      t2
    );
    
    float s = sin(spinSpeed);
    float c = cos(spinSpeed);
    mat2 rotMat = mat2(c, -s, s, c);
    
    posBase.xz *= rotMat;
    
    // Additional Y tilt
    posBase.xy *= mat2(cos(0.2), -sin(0.2), sin(0.2), cos(0.2));

    // --- MOUSE REPULSION / INTERACTION / PHYSICS ---
    vec4 worldPos = modelMatrix * vec4(posBase, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vec4 projPos = projectionMatrix * viewPos;
    vec2 ndcPos = projPos.xy / projPos.w;
    
    float mouseDist = length(ndcPos - uMouse);
    float influence = smoothstep(0.4, 0.0, mouseDist); // 0.4 NDC radius

    // Default Spherical Push
    vec3 pushDir = normalize(posBase); 
    
    // FrontEnd: Scanner breathing
    float scanner = smoothstep(0.9, 1.0, sin(posBase.y * 0.5 - uTime * 3.0));
    float isFrontend = 1.0 - smoothstep(0.0, 1.0, state);
    
    // WebGL: Gravity well (pull instead of push)
    vec3 gravityPull = -pushDir + vec3(snoise(posBase)*0.5); 

    // Backend (Grid) Manhattan
    vec3 manhattanDir = vec3(0.0);
    float ax = abs(posBase.x);
    float ay = abs(posBase.y);
    float az = abs(posBase.z);
    if(ax > ay && ax > az) manhattanDir = vec3(sign(posBase.x), 0.0, 0.0);
    else if(ay > az) manhattanDir = vec3(0.0, sign(posBase.y), 0.0);
    else manhattanDir = vec3(0.0, 0.0, sign(posBase.z));

    vec3 interactionDir = mix(
        mix(pushDir, gravityPull, t1), 
        manhattanDir, 
        t2
    );

    // Dynamic strength
    float strength = mix(mix(2.5, 6.0, t1), 4.0, t2);
    posBase += interactionDir * influence * strength;

    // --- EXECUTE RENDER ---
    vec4 mvPosition = viewMatrix * modelMatrix * vec4(posBase, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    vColorBias = aRandom;
    vInfluence = influence;
    
    // Blinking logic for backend servers
    float blink = step(0.98, fract(sin(dot(posBase.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453 + uTime * 2.0));
    vColorBias.z = mix(aRandom.z, blink, t2); 
    
    gl_PointSize = (3.0 + aRandom.x * 6.0 + scanner * 12.0 * isFrontend) * uPixelRatio * (20.0 / -mvPosition.z);
  }
`

const fragmentShader = `
  uniform float uProgress;
  uniform float uOpacity;
  
  varying vec3 vColorBias;
  varying float vInfluence;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if(dist > 0.5) discard;
    
    // Override raw alpha logic when transitioning to Grid state
    float state = clamp(uProgress, 0.0, 2.0);
    float t2 = smoothstep(0.0, 1.0, state - 1.0);
    
    float shapeAlpha = pow(1.0 - (dist * 2.0), 3.0);
    float normalAlpha = shapeAlpha * (0.3 + vColorBias.y * 0.7) * uOpacity;
    
    // In grid state, vColorBias.z holds the blinking flag (0.0 or 1.0).
    // Ensure nodes remain faintly visible (0.2) and blink intensely (1.0).
    float gridAlpha = shapeAlpha * mix(0.15, 1.0, vColorBias.z) * uOpacity;
    
    float alpha = mix(normalAlpha, gridAlpha, t2);
    
    // Core brand colors
    vec3 colFront = vec3(0.0, 0.9, 1.0);   // Frontend Cyan
    vec3 colWeb   = vec3(0.0, 0.2, 1.0);   // WebGL Void Blue
    vec3 colBack  = vec3(0.0, 1.0, 0.53);  // Backend Seafoam Green
    
    float t1 = smoothstep(0.0, 1.0, state);
    
    vec3 baseColor;
    if (state <= 1.0) {
       baseColor = mix(colFront, colWeb, t1);
    } else {
       baseColor = mix(colWeb, colBack, t2);
    }
    
    // Pulse hot white spots
    vec3 color = mix(baseColor, vec3(1.0), smoothstep(0.7, 1.0, vColorBias.z));
    
    // State 1 Glitch: Emphasize Cyan & White near cursor (palette safe speed-of-light)
    float isTorus = clamp(state, 0.0, 1.0) - clamp(state - 1.0, 0.0, 1.0);
    vec3 glitchColor = mix(colFront, vec3(1.0), step(0.5, vColorBias.x)); 
    color = mix(color, glitchColor, isTorus * vInfluence * 0.8);
    
    gl_FragColor = vec4(color, alpha);
  }
`

export function MorphParticles({ isMobile }: MorphParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const groupRef = useRef<THREE.Group>(null)
  const baseRotationY = useRef(0)
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const targetMouseRef = useRef(new THREE.Vector2(0, 0))

  useEffect(() => {
    // Only apply active tracking on desktop/large screens
    if (isMobile) return
    const onMove = (e: PointerEvent) => {
      targetMouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      targetMouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [isMobile])

  const { p1, p2, p3, pRnd } = useMemo(() => {
    // Aumentato lo scale base da 1.0 a 1.4 per desktop
    const scale = isMobile ? 0.8 : 1.4
    return {
      p1: getSpherePoints(PARTICLE_COUNT, 10 * scale), // Raggio aumentato da 8 a 10
      p2: getTorusPoints(PARTICLE_COUNT, 12 * scale, 4 * scale), // Aumentato da 10 e 3
      p3: getGridPoints(PARTICLE_COUNT, 16 * scale), // Aumentato da 14
      pRnd: getRandomAttributes(PARTICLE_COUNT)
    }
  }, [isMobile])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0.0 },
    uOpacity: { value: 1.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  }), [])

  useFrame((_, delta) => {
    uniforms.uTime.value += delta
    
    // Read the CSS variables driven by the sections' GSAP ScrollTriggers globally
    const style = document.documentElement.style
    const rawProgress = style.getPropertyValue('--p-morph') || '0'
    const rawOpacity = style.getPropertyValue('--p-opacity') || '1'
    const rawX = style.getPropertyValue('--p-x') || '0'
    const rawY = style.getPropertyValue('--p-y') || '0'
    const rawZ = style.getPropertyValue('--p-z') || '0'
    const rawScale = style.getPropertyValue('--p-scale') || '1'

    // Smooth lerp for uniforms
    uniforms.uProgress.value += (parseFloat(rawProgress) - uniforms.uProgress.value) * 0.1
    uniforms.uOpacity.value += (parseFloat(rawOpacity) - uniforms.uOpacity.value) * 0.1

    // Apply physical transform tracking to the Group
    if (groupRef.current) {
        groupRef.current.position.x += (parseFloat(rawX) - groupRef.current.position.x) * 0.1
        groupRef.current.position.y += (parseFloat(rawY) - groupRef.current.position.y) * 0.1
        groupRef.current.position.z += (parseFloat(rawZ) - groupRef.current.position.z) * 0.1
        
        const targetScale = parseFloat(rawScale)
        groupRef.current.scale.x += (targetScale - groupRef.current.scale.x) * 0.1
        groupRef.current.scale.y += (targetScale - groupRef.current.scale.y) * 0.1
        groupRef.current.scale.z += (targetScale - groupRef.current.scale.z) * 0.1
    }
    
    // Interactive lerp for mouse and parallax
    mouseRef.current.lerp(targetMouseRef.current, 0.1)
    uniforms.uMouse.value.copy(mouseRef.current)

    // Apply continuous rotation and mouse parallax wrapper
    if (groupRef.current) {
       baseRotationY.current += delta * 0.05
       groupRef.current.rotation.y = baseRotationY.current + mouseRef.current.x * 0.4
       groupRef.current.rotation.x = -mouseRef.current.y * 0.3
    }
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={p1} itemSize={3} />
          <bufferAttribute attach="attributes-aPosition2" count={PARTICLE_COUNT} array={p2} itemSize={3} />
          <bufferAttribute attach="attributes-aPosition3" count={PARTICLE_COUNT} array={p3} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={PARTICLE_COUNT} array={pRnd} itemSize={3} />
        </bufferGeometry>
        <shaderMaterial 
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
