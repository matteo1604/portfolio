import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  isMobile?: boolean
}

// Configurable constants
const SPHERE_Z = -8           
const ROTATION_SPEED = 0.05   

// --- SHADER HELPERS ---
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

const coreVertexShader = `
  ${snoiseFunc}

  uniform float uTime;
  uniform vec2 uMouse;
  
  varying float vDepth;
  varying float vNoise;
  varying float vInteraction;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    float twistStrength = 0.25; 
    float angle = position.y * twistStrength;
    float s = sin(angle);
    float c = cos(angle);
    vec3 twistedPos = vec3(
      position.x * c - position.z * s,
      position.y,
      position.x * s + position.z * c
    );
    
    vec3 dir = normalize(twistedPos);
    
    // Slow, large, majestic rolling noise (Liquid Nebula look)
    float n1 = snoise(twistedPos * 0.15 + uTime * 0.15);
    float n2 = snoise(twistedPos * 0.35 - uTime * 0.10);
    float totalNoise = n1 + (n2 * 0.4);
    
    vec3 fluidWarp = vec3(
        snoise(twistedPos * 0.10 + vec3(uTime * 0.1, 0.0, 0.0)),
        snoise(twistedPos * 0.10 + vec3(0.0, uTime * 0.1, 0.0)),
        snoise(twistedPos * 0.10 + vec3(0.0, 0.0, uTime * 0.1))
    );
    
    // Smooth gentle displacement
    float displacementAmount = 0.6; 
    vec3 displacedPos = twistedPos + (dir * totalNoise * displacementAmount) + (fluidWarp * displacementAmount * 0.3);
    
    vec4 worldPos = modelMatrix * vec4(displacedPos, 1.0);
    
    // === VORTEX HOLE (Parts the Nebula) ===
    float distToMouse = length(worldPos.xy - uMouse);
    float interactionRadius = smoothstep(6.0, 0.0, distToMouse);
    
    // Pushes the vertices violently AWAY radially to create a physical opening
    vec2 repelVec = normalize(worldPos.xy - uMouse + vec2(0.0001));
    worldPos.xy += repelVec * pow(interactionRadius, 1.5) * 4.0;
    
    // Sink the geometry inwards to add depth to the hole
    worldPos.z -= interactionRadius * 2.0; 
    
    // Extremely strong vortex twist locally around the mouse hole
    float vortexAngle = interactionRadius * 2.5;
    float sa = sin(vortexAngle);
    float ca = cos(vortexAngle);
    vec2 vortexXY = worldPos.xy - uMouse;
    worldPos.x = uMouse.x + (vortexXY.x * ca - vortexXY.y * sa);
    worldPos.y = uMouse.y + (vortexXY.x * sa + vortexXY.y * ca);
    
    vNoise = totalNoise;
    vInteraction = interactionRadius;
    
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;
    
    vDepth = -mvPosition.z; 
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;
  }
`

const coreFragmentShader = `
  uniform float uGlobalAlpha;
  
  varying float vDepth;
  varying float vNoise;
  varying float vInteraction;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
    float rim = smoothstep(0.4, 0.9, fresnel);
    
    float fluidAlpha = smoothstep(-0.4, 1.0, vNoise) + (vInteraction * 0.5);
    float depthFadeFadeOutBackWall = 1.0 - smoothstep(14.0, 23.0, vDepth);
    
    float corePresence = 0.15;
    float finalAlpha = (rim * 1.8 + corePresence) * fluidAlpha * uGlobalAlpha * depthFadeFadeOutBackWall * 0.9;
    
    // === MOUSE HOLE EFFECT ===
    // vInteraction goes from 0 (edge) to 1.0 (exact cursor)
    // 1. Erase opacity at the very center (The Hole)
    float holeMask = 1.0 - smoothstep(0.4, 0.9, vInteraction);
    finalAlpha *= holeMask;
    
    // 2. Light up the rim of the parted gas
    // Peak highlight lies tightly around interaction = 0.4
    float holeEdgeGlow = smoothstep(0.1, 0.4, vInteraction) * (1.0 - smoothstep(0.4, 0.8, vInteraction));
    
    // Original Brand Colors
    vec3 col1 = vec3(0.0, 1.0, 0.53); // Seafoam Green
    vec3 col2 = vec3(0.0, 0.8, 1.0);  // Ice Cyan
    vec3 col3 = vec3(0.05, 0.15, 0.6); // Deep Blue
    
    float n = vNoise * 0.5 + 0.5; 
    vec3 fluidColor = mix(col3, col2, smoothstep(0.1, 0.6, n));
    fluidColor = mix(fluidColor, col1, smoothstep(0.7, 1.0, n));
    
    vec3 rimOverlay = mix(fluidColor, vec3(0.8, 0.95, 1.0), rim * 0.8);
    
    // The burning aura on the edge of the separated gas
    vec3 hoverGlow = vec3(0.0, 0.9, 1.0); 
    rimOverlay = mix(rimOverlay, hoverGlow, holeEdgeGlow * 1.5);
    rimOverlay = mix(rimOverlay, vec3(1.0, 1.0, 1.0), pow(holeEdgeGlow, 3.0) * 1.5);
    
    gl_FragColor = vec4(rimOverlay, finalAlpha);
  }
`

export function ParticleSphere({ isMobile }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const solidRef = useRef<THREE.Mesh>(null)
  
  const mouse = useRef({ x: 0, y: 0 })
  const targetRotation = useRef({ x: 0, y: 0 })
  
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion || isMobile) return
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [reducedMotion, isMobile])

  const { radiusCore } = useMemo(() => {
    return { radiusCore: isMobile ? 6.5 : 12.0 }
  }, [isMobile])

  const uniformsCore = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, -20) },
    uGlobalAlpha: { value: 1.0 },
  }), [])

  useFrame((_, delta) => {
    const scrollProgress = parseFloat(
      document.documentElement.style.getPropertyValue('--hero-progress') || '0'
    )
    const currentAlpha = Math.max(0, 1 - scrollProgress * 1.5)
    
    const targetMouseWorldX = mouse.current.x * 12
    const targetMouseWorldY = mouse.current.y * 12

    uniformsCore.uTime.value += delta
    uniformsCore.uGlobalAlpha.value = currentAlpha
    uniformsCore.uMouse.value.x += (targetMouseWorldX - uniformsCore.uMouse.value.x) * 0.15
    uniformsCore.uMouse.value.y += (targetMouseWorldY - uniformsCore.uMouse.value.y) * 0.15

    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED * delta
      if (!isMobile) {
        const MAX_TILT = 0.08
        targetRotation.current.x = mouse.current.y * MAX_TILT
        targetRotation.current.y = mouse.current.x * MAX_TILT
        
        groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * 0.05
        groupRef.current.rotation.z += (-targetRotation.current.y * 0.5 - groupRef.current.rotation.z) * 0.05
      }
    }
  })

  // Retain the high-segment SphereGeometry to prevent moire tearing
  const segments = isMobile ? 64 : 128 

  return (
    <group position={[0, 0, SPHERE_Z]}>
      <group ref={groupRef}>
        <mesh ref={solidRef} renderOrder={-1}>
          <sphereGeometry args={[radiusCore, segments, segments]} />
          <shaderMaterial 
            vertexShader={coreVertexShader}
            fragmentShader={coreFragmentShader}
            uniforms={uniformsCore}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            /* DoubleSide OFF to prevent internal geometry rendering/moire artifacts */
          />
        </mesh>
      </group>
    </group>
  )
}
