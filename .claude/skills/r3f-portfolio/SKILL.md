---
name: r3f-portfolio
description: Build Three.js / React Three Fiber components for this portfolio project. Use this skill whenever creating 3D scenes, WebGL effects, shaders, post-processing, or any R3F work. Trigger on: "add 3D", "Three.js", "R3F", "WebGL", "shader", "canvas scene", "particle system", "post-processing", "bloom", "depth of field", "3D background", "three fiber". Enforces canvas isolation rules and performance constraints for this project.
---

# R3F Portfolio Components

All 3D work in this project lives inside a single `<Canvas>`. It never leaks into the React DOM. The canvas overlays the page — it doesn't displace content.

## Canvas Setup

```tsx
// src/components/three/Scene.tsx
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

export function Scene() {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
      camera={{ position: [0, 0, 5], fov: 75 }}
      dpr={[1, 1.5]}              // cap at 1.5 — don't burn mobile GPUs
      frameloop="demand"          // only render when something changes
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        {/* all 3D content here */}
      </Suspense>
    </Canvas>
  );
}
```

Place `<Scene />` in `App.tsx` before the scroll container so it sits behind content. The canvas is `position: fixed` and `pointerEvents: none` by default — re-enable pointer events only on meshes that need interaction.

## R3F Hooks

Use R3F's own hooks — never import from Three.js directly inside components:

```tsx
import { useFrame, useThree } from '@react-three/fiber';

function MyMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport } = useThree();

  // Frame loop — runs every frame, keep it lean
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.5;
  });

  return <mesh ref={meshRef}><boxGeometry /><meshStandardMaterial /></mesh>;
}
```

`useFrame` is the only place for per-frame logic. If you only update on user interaction, consider `invalidate()` from `useThree` with `frameloop="demand"`.

## Drei Abstractions

Prefer `@react-three/drei` helpers over manual Three.js setup:

```tsx
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Float,
  Text,
  useGLTF,
  useTexture,
  Stars,
  Sparkles,
} from '@react-three/drei';
```

Common patterns:
- `<Float>` — gentle floating animation without writing `useFrame`
- `<Environment>` — IBL lighting from HDRI
- `<Stars>` — particle field for atmospheric backgrounds

## Interactivity

Use R3F's event system — not DOM events on the canvas:

```tsx
<mesh
  onClick={(e) => { e.stopPropagation(); handleClick(); }}
  onPointerEnter={() => setHovered(true)}
  onPointerLeave={() => setHovered(false)}
>
```

Set `pointerEvents: 'auto'` on the canvas style when 3D objects need interaction. Re-add `cursor` styling via `document.body.style.cursor`.

## Communicating with React

The 3D scene and React DOM are isolated. Bridge them via refs and callbacks, not state:

```tsx
// Pass a ref the scene can write to
const scrollProgress = useRef(0);

// In your Lenis/ScrollTrigger setup
lenis.on('scroll', ({ progress }) => {
  scrollProgress.current = progress;
});

// Inside R3F
function SceneContent({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  useFrame(() => {
    // read scrollProgress.current — no React re-render
    camera.position.z = 5 - scrollProgress.current * 3;
  });
}
```

## Post-Processing

Use `@react-three/postprocessing` (wraps pmndrs/postprocessing):

```tsx
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';

// Inside Canvas
<EffectComposer>
  <Bloom
    luminanceThreshold={0.2}
    luminanceSmoothing={0.9}
    intensity={1.5}
    mipmapBlur
  />
  <Vignette eskil={false} offset={0.1} darkness={0.8} />
</EffectComposer>
```

Keep effects minimal — each effect has GPU cost. Profile with `stats.js` or the browser's GPU timeline.

## Dispose on Unmount

Every geometry, material, and texture must be disposed when the component unmounts:

```tsx
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  };
}, []);
```

For GLTF models, use `useGLTF.preload()` and let drei handle disposal. For manually created Three.js objects, always dispose explicitly.

## Shaders

For custom shaders, use `shaderMaterial` from drei or raw `THREE.ShaderMaterial`:

```tsx
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const WaveMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#00D4FF') },
  /* vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* fragment */ `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(uColor, sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5);
    }
  `
);

extend({ WaveMaterial });
```

Accent color is `#00D4FF` — use it for emissive/glow effects.

## Performance Rules

- `dpr={[1, 1.5]}` — always, no exceptions
- `frameloop="demand"` when scene is mostly static; `"always"` for animated scenes
- Lazy-load the entire Canvas with `React.lazy` — Three.js is heavy
- Merge geometries when rendering many static objects (instanced mesh)
- Avoid creating objects inside `useFrame` — allocate once, mutate in the loop

```tsx
// Code split the whole 3D module
const Scene = React.lazy(() => import('./components/three/Scene'));

// In App.tsx
<Suspense fallback={null}>
  <Scene />
</Suspense>
```

## Reduced Motion

When `prefers-reduced-motion: reduce` is active, stop animations but keep the static scene:

```tsx
const reduced = usePrefersReducedMotion();

useFrame((state, delta) => {
  if (reduced) return; // freeze frame loop
  mesh.current.rotation.y += delta * 0.5;
});
```

## What NOT to do

- No Three.js objects outside `<Canvas>`
- No DOM manipulation from inside R3F components
- No React state for per-frame values — use refs
- No post-processing without profiling first on mid-range hardware
- No textures without `dispose()` on unmount
- No `dpr` above 1.5
