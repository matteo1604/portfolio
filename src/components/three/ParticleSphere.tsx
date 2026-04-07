import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  isMobile?: boolean
}

// Configurable constants
const SPHERE_Z = -8           
const ROTATION_SPEED = 0.05   

const vertexShader = `
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
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  
  varying vec2 vMvPositionXY;
  varying float vDepth;
  varying float vNoise;
  varying float vInteraction;

  void main() {
    // === UPGRADE 1: GALACTIC TWIST ===
    // We apply a rotational torsion to the sphere based on its Y (vertical) coordinate.
    // The top and bottom will stretch in opposite directions forming spiral bands.
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
    
    // Very soft, large rolling fluid distortion (low frequency)
    float noiseVal = snoise(twistedPos * 0.08 + uTime * 0.15);
    vec3 displacedPos = twistedPos + dir * (noiseVal * 1.5);
    
    // Convert to World Space FIRST, so mouse interaction ignores object rotation
    vec4 worldPos = modelMatrix * vec4(displacedPos, 1.0);
    
    // Electromagnetic Repulsion + Vortex Swirl in World Space
    vec2 mouseRepelDir = worldPos.xy - uMouse;
    float distToMouse = length(mouseRepelDir);
    float repulsionStrength = smoothstep(7.0, 0.0, distToMouse) * 3.0; 
    
    vec2 swirlDir = vec2(-mouseRepelDir.y, mouseRepelDir.x);
    
    worldPos.xy += normalize(mouseRepelDir + vec2(0.001)) * repulsionStrength;
    worldPos.xy += normalize(swirlDir + vec2(0.001)) * repulsionStrength * 1.5;
    worldPos.z -= repulsionStrength * 1.5;
    
    // Expose the raw noise and intense localized interaction 
    vNoise = noiseVal - (repulsionStrength * 0.2); 
    vInteraction = smoothstep(4.0, 0.0, distToMouse); 
    
    // Apply View and Projection transforms (equivalent to modelViewMatrix)
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;
    
    vMvPositionXY = mvPosition.xy;
    vDepth = -mvPosition.z; 
    
    // Base size increased slightly to make bokeh overlaps buttery smooth
    float baseSize = 4.0;
    gl_PointSize = baseSize * uPixelRatio * (15.0 / -mvPosition.z);
  }
`

const fragmentShader = `
  uniform float uGlobalAlpha;
  varying vec2 vMvPositionXY;
  varying float vDepth;
  varying float vNoise;
  varying float vInteraction;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if(dist > 0.5) discard;
    
    // === UPGRADE 2: BOKEH DEPTH OF FIELD ===
    // Macro focal point set specifically to the front tip of the sphere (~13.0) for extreme cinematic effect
    float blurAmount = smoothstep(2.0, 6.0, abs(vDepth - 13.0));
    
    // An in-focus particle has a sharp drop-off (0.5 to 0.4)
    // A blurred particle has a massive smooth drop-off (0.5 to 0.0)
    float edgeSoftness = mix(0.1, 0.5, blurAmount); 
    float particleAlpha = smoothstep(0.5, 0.5 - edgeSoftness, dist);
    
    // Deeply blurred particles also dim in opacity to simulate expanding out of focus
    float bokehDim = mix(1.0, 0.4, blurAmount);
    
    // Rim lighting (Center mask)
    float centerDist = length(vMvPositionXY);
    // Increased core brightness (0.35) so the Glass Text has something radiant to refract!
    float rimAlpha = mix(0.35, 1.0, smoothstep(3.5, 9.5, centerDist));
    
    // Total geometric fading
    float depthFadeFadeOutBackWall = 1.0 - smoothstep(14.0, 23.0, vDepth);
    float finalAlpha = rimAlpha * particleAlpha * uGlobalAlpha * depthFadeFadeOutBackWall * bokehDim;
    
    // === UPGRADE 3: FLUID IRIDESCENCE ===
    // Tech-Brand Palette (Neon Green / Cyan / Deep Blue)
    // Matches the HUD #00FF88 and builds a professional tech gradient!
    vec3 col1 = vec3(0.0, 1.0, 0.53); // Seafoam Green
    vec3 col2 = vec3(0.0, 0.8, 1.0);  // Ice Cyan
    vec3 col3 = vec3(0.05, 0.15, 0.6); // Deep Midnight Blue
    
    // Map the fluid noise generated in vertex shader
    // vNoise ranges roughly -0.8 to 0.8
    float n = vNoise * 0.5 + 0.5; // normalized 0..1 roughly
    
    // Lerp colors based on local noise flow
    vec3 fluidColor = mix(col3, col2, smoothstep(0.1, 0.6, n));
    fluidColor = mix(fluidColor, col1, smoothstep(0.7, 1.0, n));
    
    // Further punch out the outer rim purely in bright cyan for a clean silhouette
    vec3 rimOverlay = mix(fluidColor, vec3(0.6, 0.9, 1.0), smoothstep(7.5, 9.5, centerDist));
    
    // Add explosive white glow directly under the cursor/interaction point
    vec3 interactionColor = mix(rimOverlay, vec3(1.0, 1.0, 1.0), vInteraction * 1.2);
    
    gl_FragColor = vec4(interactionColor, finalAlpha);
  }
`

export function ParticleSphere({ isMobile }: Props) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
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

  // Geometry attributes (Colors removed because Iridescence natively maps them in fragment)
  const { positions } = useMemo(() => {
    const count = isMobile ? 25000 : 55000 
    const radius = isMobile ? 6.5 : 12.0  
    
    const pos = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / count)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i

      pos[i * 3]     = radius * Math.cos(theta) * Math.sin(phi)
      pos[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi)
      pos[i * 3 + 2] = radius * Math.cos(phi)
    }
    return { positions: pos }
  }, [isMobile])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uGlobalAlpha: { value: 1.0 },
    uMouse: { value: new THREE.Vector2(0, -20) } 
  }), [])

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
      
      const scrollProgress = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0'
      )
      materialRef.current.uniforms.uGlobalAlpha.value = Math.max(0, 1 - scrollProgress * 1.5)
      
      const targetMouseWorldX = mouse.current.x * 12
      const targetMouseWorldY = mouse.current.y * 12
      
      // Increased tracking speed (0.15) for snappier feeling
      materialRef.current.uniforms.uMouse.value.x += (targetMouseWorldX - materialRef.current.uniforms.uMouse.value.x) * 0.15
      materialRef.current.uniforms.uMouse.value.y += (targetMouseWorldY - materialRef.current.uniforms.uMouse.value.y) * 0.15
    }

    if (pointsRef.current) {
      if (!reducedMotion) {
        pointsRef.current.rotation.y += ROTATION_SPEED * delta
        
        if (!isMobile) {
          const MAX_TILT = 0.08
          targetRotation.current.x = mouse.current.y * MAX_TILT
          targetRotation.current.y = mouse.current.x * MAX_TILT
          
          pointsRef.current.rotation.x += (targetRotation.current.x - pointsRef.current.rotation.x) * 0.05
          pointsRef.current.rotation.z += (-targetRotation.current.y * 0.5 - pointsRef.current.rotation.z) * 0.05
        }
      }
    }
  })

  return (
    <points ref={pointsRef} position={[0, 0, SPHERE_Z]} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={positions.length / 3} 
          array={positions} 
          itemSize={3} 
        />
      </bufferGeometry>
      <shaderMaterial 
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
