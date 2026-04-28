import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMouseNDC } from '@/hooks/useMouseNDC'

interface MorphParticlesProps {
  isMobile?: boolean
}

const PARTICLE_COUNT_DESKTOP = 5600
const PARTICLE_COUNT_MOBILE = 3600

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

// 4. PROJECTS/FORGE: Vortex Ring — particles spiral in a tight helix around a central axis
const getVortexPoints = (count: number, radius: number, height: number) => {
  const pts = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const t = i / count
    
    // 85% of particles form the helix ring shell
    // 15% form a subtle inner energy column
    if (t < 0.85) {
      // Helix ring: particles spiral upward in a cylinder shell
      const angle = t * Math.PI * 2 * 10 // 10 full rotations for elegant helix
      const y = (t / 0.85 - 0.5) * height
      const r = radius * (0.85 + Math.sin(t * Math.PI * 6) * 0.15) // Breathing radius
      
      // Add subtle randomness for organic feel
      const rJitter = (Math.random() - 0.5) * radius * 0.12
      const yJitter = (Math.random() - 0.5) * height * 0.04
      
      pts[i * 3]     = Math.cos(angle) * (r + rJitter)
      pts[i * 3 + 1] = y + yJitter
      pts[i * 3 + 2] = Math.sin(angle) * (r + rJitter)
    } else {
      // Inner energy column: sparse vertical stream through the center
      const innerT = (t - 0.85) / 0.15
      const y = (innerT - 0.5) * height * 0.6
      const innerR = radius * 0.08 * Math.random()
      const angle = Math.random() * Math.PI * 2
      
      pts[i * 3]     = Math.cos(angle) * innerR
      pts[i * 3 + 1] = y
      pts[i * 3 + 2] = Math.sin(angle) * innerR
    }
  }
  return pts
}

// 5. CONTACT: The Singularity Core — dense event horizon and pulsar center
const getSingularityPoints = (count: number, radius: number) => {
  const pts = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const t = i / count
    if (t < 0.6) {
      // Dense ultra-compact spherical core
      const phi = Math.acos(-1 + (2 * t) / 0.6)
      const theta = Math.sqrt(0.6 * count * Math.PI) * phi
      const r = radius * 0.25 * Math.pow(Math.random(), 0.5)
      pts[i * 3]     = r * Math.cos(theta) * Math.sin(phi)
      pts[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi)
      pts[i * 3 + 2] = r * Math.cos(phi)
    } else {
      // Orbital rings collapsing into the center (accretion disk)
      const angle = Math.random() * Math.PI * 2
      const r = radius * (0.25 + 0.75 * Math.pow(Math.random(), 2))
      const y = (Math.random() - 0.5) * radius * 0.05
      pts[i * 3]     = Math.cos(angle) * r
      pts[i * 3 + 1] = y
      pts[i * 3 + 2] = Math.sin(angle) * r
    }
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
  attribute vec3 aPosition4;
  attribute vec3 aPosition5;
  attribute vec3 aRandom;

  uniform float uProgress; 
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;

  varying vec3 vColorBias;
  varying float vInfluence;
  varying float vState;

  void main() {
    float state = clamp(uProgress, 0.0, 4.0);
    vState = state;
    
    // Smooth interpolations between the 5 targets
    vec3 posBase;
    
    // Exponential ease for explosive transitions!
    float t1 = smoothstep(0.0, 1.0, state);
    float t2 = smoothstep(0.0, 1.0, state - 1.0);
    float t3 = smoothstep(0.0, 1.0, state - 2.0);
    float t4 = smoothstep(0.0, 1.0, state - 3.0);
    
    if (state <= 1.0) {
        posBase = mix(position, aPosition2, t1);
    } else if (state <= 2.0) {
        posBase = mix(aPosition2, aPosition3, t2);
    } else if (state <= 3.0) {
        posBase = mix(aPosition3, aPosition4, t3);
    } else {
        posBase = mix(aPosition4, aPosition5, t4);
    }
    
    // Add continuous noise based on current state
    float noiseTarget1 = mix(0.2, 1.2, t1);  
    float noiseTarget2 = mix(1.2, 0.05, t2); 
    float noiseTarget3 = mix(0.05, 0.4, t3); 
    float noiseTarget4 = mix(0.4, 0.8, t4); // Singularity: high turbulence in the core
    float noiseAmount;
    if (state <= 1.0) {
      noiseAmount = noiseTarget1;
    } else if (state <= 2.0) {
      noiseAmount = mix(noiseTarget1, noiseTarget2, t2);
    } else if (state <= 3.0) {
      noiseAmount = mix(noiseTarget2, noiseTarget3, t3);
    } else {
      noiseAmount = mix(noiseTarget3, noiseTarget4, t4);
    }
    
    float pulse = sin(uTime * 2.0 + aRandom.x * 10.0) * 0.5 + 0.5;
    float noiseA = snoise(posBase * 1.25 + vec3(uTime));
    float noiseB = snoise(posBase.zxy * 1.25 - vec3(uTime * 0.85));
    vec3 noise = vec3(noiseA, noiseB, (noiseA + noiseB) * 0.5) * noiseAmount * pulse;
    
    posBase += noise;

    // Optional spinning logic based on state
    float spinSpeed;
    if (state <= 1.0) {
      spinSpeed = mix(uTime * 0.2, uTime * 0.8, t1);
    } else if (state <= 2.0) {
      spinSpeed = mix(uTime * 0.8, uTime * 0.0, t2);
    } else if (state <= 3.0) {
      spinSpeed = mix(uTime * 0.0, uTime * 0.3, t3); 
    } else {
      spinSpeed = mix(uTime * 0.3, uTime * 1.5, t4); // Singularity: fast dizzying spin
    }
    
    float s = sin(spinSpeed);
    float c = cos(spinSpeed);
    mat2 rotMat = mat2(c, -s, s, c);
    
    posBase.xz *= rotMat;
    
    float tiltAmount;
    if (state <= 3.0) {
       tiltAmount = mix(0.2, 0.05, t3);
    } else {
       tiltAmount = mix(0.05, 0.4, t4); // Tilt for Singularity accretion disk
    }
    posBase.xy *= mat2(cos(tiltAmount), -sin(tiltAmount), sin(tiltAmount), cos(tiltAmount));

    // --- MOUSE REPULSION / INTERACTION / PHYSICS ---
    vec4 worldPos = modelMatrix * vec4(posBase, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vec4 projPos = projectionMatrix * viewPos;
    vec2 ndcPos = projPos.xy / projPos.w;
    
    float mouseDist = length(ndcPos - uMouse);
    float influence = smoothstep(0.4, 0.0, mouseDist); // 0.4 NDC radius

    // Default Spherical Push
    vec3 pushDir = normalize(posBase); 
    
    // FrontEnd: gentle breathing (removed horizontal scan-line artifact)
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

    // Vortex: Tangential swirl — particles push perpendicular to their radius
    vec3 radialXZ = normalize(vec3(posBase.x, 0.0, posBase.z));
    vec3 tangent = cross(radialXZ, vec3(0.0, 1.0, 0.0));
    vec3 vortexDir = tangent + vec3(0.0, snoise(posBase * 2.0 + uTime) * 0.3, 0.0);

    // Singularity: Extreme gravity pull to the center point
    vec3 singularityDir = -pushDir + tangent * 0.5;

    vec3 interactionDir;
    if (state <= 1.0) {
      interactionDir = mix(pushDir, gravityPull, t1);
    } else if (state <= 2.0) {
      interactionDir = mix(gravityPull, manhattanDir, t2);
    } else if (state <= 3.0) {
      interactionDir = mix(manhattanDir, vortexDir, t3);
    } else {
      interactionDir = mix(vortexDir, singularityDir, t4);
    }

    // Dynamic strength
    float strength;
    if (state <= 1.0) {
      strength = mix(2.5, 6.0, t1);
    } else if (state <= 2.0) {
      strength = mix(6.0, 4.0, t2);
    } else if (state <= 3.0) {
      strength = mix(4.0, 5.0, t3); 
    } else {
      strength = mix(5.0, 8.0, t4); // Singularity: intense mouse reaction
    }
    posBase += interactionDir * influence * strength;

    // --- EXECUTE RENDER ---
    vec4 mvPosition = viewMatrix * modelMatrix * vec4(posBase, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    vColorBias = aRandom;
    vInfluence = influence;
    
    float blink = step(0.98, fract(sin(dot(posBase.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453 + uTime * 2.0));
    vColorBias.z = mix(aRandom.z, blink, t2 * (1.0 - t3)); 
    
    // Vortex / Singularity Energy pulse
    float centerDist = length(posBase.xz);
    float energyPulse = smoothstep(2.0, 0.0, centerDist) * t3 * 0.5;
    vColorBias.y = mix(vColorBias.y, energyPulse + 0.3, t3);
    
    // Size logic
    float vortexSize = mix(0.0, smoothstep(3.0, 0.0, centerDist) * 2.0, t3);
    float singularitySize = mix(0.0, smoothstep(2.0, 0.0, centerDist) * 4.0 + (aRandom.y * 3.0), t4);
    
    float frontendPulse = (0.5 + 0.5 * sin(uTime * 1.2 + aRandom.x * 6.28)) * isFrontend * 2.0;
    gl_PointSize = (3.0 + aRandom.x * 6.0 + frontendPulse + vortexSize + singularitySize) * uPixelRatio * (20.0 / -mvPosition.z);
  }
`

const fragmentShader = `
  uniform float uProgress;
  uniform float uOpacity;
  
  varying vec3 vColorBias;
  varying float vInfluence;
  varying float vState;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if(dist > 0.5) discard;
    
    // Override raw alpha logic when transitioning
    float state = clamp(uProgress, 0.0, 4.0);
    float t2 = smoothstep(0.0, 1.0, state - 1.0);
    float t3 = smoothstep(0.0, 1.0, state - 2.0);
    float t4 = smoothstep(0.0, 1.0, state - 3.0);
    
    float shapeAlpha = pow(1.0 - (dist * 2.0), 3.0);
    float normalAlpha = shapeAlpha * (0.3 + vColorBias.y * 0.7) * uOpacity;
    float gridAlpha = shapeAlpha * mix(0.15, 1.0, vColorBias.z) * uOpacity;
    float vortexAlpha = shapeAlpha * (0.25 + vColorBias.y * 0.35) * uOpacity;
    float singularityAlpha = shapeAlpha * (0.1 + vColorBias.y * 0.8) * uOpacity; // High contrast
    
    float alpha;
    if (state <= 2.0) {
      alpha = mix(normalAlpha, gridAlpha, t2);
    } else if (state <= 3.0) {
      alpha = mix(gridAlpha, vortexAlpha, t3);
    } else {
      alpha = mix(vortexAlpha, singularityAlpha, t4);
    }
    
    // Core brand colors
    vec3 colFront = vec3(0.0, 0.9, 1.0);   // Frontend Cyan
    vec3 colWeb   = vec3(0.0, 0.2, 1.0);   // WebGL Void Blue
    vec3 colBack  = vec3(0.0, 1.0, 0.53);  // Backend Seafoam Green
    vec3 colForge = vec3(0.0, 0.85, 1.0);  // Forge Reactor Cyan
    vec3 colContact = vec3(1.0, 0.1, 0.5); // Singularity hot Magenta/Pink
    
    float t1 = smoothstep(0.0, 1.0, state);
    
    vec3 baseColor;
    if (state <= 1.0) {
       baseColor = mix(colFront, colWeb, t1);
    } else if (state <= 2.0) {
       baseColor = mix(colWeb, colBack, t2);
    } else if (state <= 3.0) {
       baseColor = mix(colBack, colForge, t3);
    } else {
       baseColor = mix(colForge, colContact, t4);
    }
    
    // Pulse hot white spots
    vec3 color = mix(baseColor, vec3(1.0), smoothstep(0.7, 1.0, vColorBias.z));
    
    // State 1 Glitch: Emphasize Cyan & White near cursor (palette safe speed-of-light)
    float isTorus = clamp(state, 0.0, 1.0) - clamp(state - 1.0, 0.0, 1.0);
    vec3 glitchColor = mix(colFront, vec3(1.0), step(0.5, vColorBias.x)); 
    color = mix(color, glitchColor, isTorus * vInfluence * 0.8);
    
    // State 3 Forge: Energy particles near center glow with subtle warmth
    vec3 forgeHot = mix(colForge, vec3(0.8, 0.95, 1.0), vColorBias.y * 0.4);
    color = mix(color, forgeHot, t3 * (1.0 - t4) * vColorBias.y * 0.6); // Fade out as t4 kicks in
    
    // State 4 Singularity: Super hot white/orange core
    vec3 coreHot = mix(colContact, vec3(1.0, 0.9, 0.8), vColorBias.y * 0.8);
    color = mix(color, coreHot, t4 * vColorBias.y * 0.9);

    
    gl_FragColor = vec4(color, alpha);
  }
`

export function MorphParticles({ isMobile }: MorphParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const groupRef = useRef<THREE.Group>(null)
  const baseRotationY = useRef(0)
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const mouseNDC = useMouseNDC()
  const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP

  const { p1, p2, p3, p4, p5, pRnd } = useMemo(() => {
    const scale = isMobile ? 0.8 : 1.4
    return {
      p1: getSpherePoints(particleCount, 10 * scale),
      p2: getTorusPoints(particleCount, 12 * scale, 4 * scale),
      p3: getGridPoints(particleCount, 16 * scale),
      p4: getVortexPoints(particleCount, 10 * scale, 14 * scale),
      p5: getSingularityPoints(particleCount, 8 * scale),
      pRnd: getRandomAttributes(particleCount)
    }
  }, [isMobile, particleCount])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0.0 },
    uOpacity: { value: 1.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  }), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    uniforms.uTime.value += dt
    
    const style = document.documentElement.style
    const rawProgress = style.getPropertyValue('--p-morph')   || '0'
    const rawOpacity  = style.getPropertyValue('--p-opacity') || '1'

    uniforms.uProgress.value += (parseFloat(rawProgress) - uniforms.uProgress.value) * 0.1
    uniforms.uOpacity.value  += (parseFloat(rawOpacity)  - uniforms.uOpacity.value)  * 0.1
    
    // Interactive lerp for mouse and parallax — desktop only
    if (!isMobile) mouseRef.current.lerp(mouseNDC.current, 0.1)
    uniforms.uMouse.value.copy(mouseRef.current)

    // Apply continuous rotation and mouse parallax wrapper
    if (groupRef.current) {
       baseRotationY.current += dt * 0.05
       groupRef.current.rotation.y = baseRotationY.current + mouseRef.current.x * 0.4
       groupRef.current.rotation.x = -mouseRef.current.y * 0.3
    }
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} array={p1} itemSize={3} />
          <bufferAttribute attach="attributes-aPosition2" count={particleCount} array={p2} itemSize={3} />
          <bufferAttribute attach="attributes-aPosition3" count={particleCount} array={p3} itemSize={3} />
          <bufferAttribute attach="attributes-aPosition4" count={particleCount} array={p4} itemSize={3} />
          <bufferAttribute attach="attributes-aPosition5" count={particleCount} array={p5} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={particleCount} array={pRnd} itemSize={3} />
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
