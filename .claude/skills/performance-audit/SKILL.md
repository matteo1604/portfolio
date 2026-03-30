---
name: performance-audit
description: Audit and fix performance issues in this portfolio project. Use this skill when animations are dropping frames, the page feels janky, bundle size is too large, Three.js is slow, Lighthouse scores are low, or before deploying to production. Trigger on: "it's lagging", "animations are choppy", "optimize performance", "bundle is too big", "Lighthouse score", "60fps", "reduce bundle", "Three.js slow", "too many re-renders", "performance check", "before deploy", "optimize", "it feels slow", "frame drop". This project targets 60fps scroll on mid-range devices — use this skill to get there.
---

# Performance Audit

This portfolio is animation and 3D heavy. Performance problems fall into three buckets: **render** (frame drops during animation), **load** (initial bundle too large), and **React** (unnecessary re-renders). Work through the relevant sections below.

## 1. Frame Rate — Animation Budget

Target: 60fps on mid-range devices. Every frame has a 16ms budget.

### Diagnose first
Open Chrome DevTools → Performance → record while scrolling. Look for:
- Long tasks (>50ms) — usually JS doing too much per frame
- Layout/style recalc triggered by animation — means you're animating non-composited properties
- Paint flashing — means something is repainting that shouldn't be

### Composited properties only
GSAP and Framer Motion should animate only `transform` and `opacity` — these run on the GPU compositor thread and don't trigger layout or paint:

```typescript
// Composited — fast
gsap.to(el, { x: 40, opacity: 0.5 });
gsap.to(el, { scale: 1.05 });

// Triggers layout — slow, avoid
gsap.to(el, { width: '200px', top: 40, marginLeft: 20 });
```

If you need to animate a non-composited property (like `height`), use `clip-path` or `scale` as a visual stand-in.

### will-change — use surgically
`will-change: transform` promotes an element to its own compositor layer. This is helpful for elements that animate continuously, but wasteful if overused (each promoted layer costs GPU memory):

```typescript
// Set before animation, remove after
el.style.willChange = 'transform';
gsap.to(el, {
  x: 200,
  onComplete: () => { el.style.willChange = 'auto'; }
});
```

Never set `will-change` in CSS on static elements — it promotes them permanently.

### Three.js frame budget
Check the R3F canvas with `stats.js` or the browser GPU timeline:

```tsx
import { Stats } from '@react-three/drei';

// Add temporarily inside Canvas for debugging
<Stats />
```

Common R3F performance fixes:
- `frameloop="demand"` — only render when `invalidate()` is called. Use for mostly-static scenes
- `dpr={[1, 1.5]}` — never exceed 1.5 device pixel ratio
- Merge static geometries into `InstancedMesh` if rendering many identical objects
- Reduce post-processing effects — each effect (Bloom, DOF, etc.) costs significant GPU time on mobile
- Lower Bloom `luminanceThreshold` or disable it on mobile via `useMediaQuery`

```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

<EffectComposer>
  {!isMobile && <Bloom intensity={1.5} />}
  <Vignette />
</EffectComposer>
```

## 2. Bundle Size — Load Performance

### Analyze the bundle
```bash
npm run build
npx vite-bundle-visualizer
```

This shows which modules take up space. Three.js and its ecosystem are typically the biggest offenders.

### Code-split Three.js
The `<Canvas>` and all R3F code should be behind `React.lazy`:

```tsx
// App.tsx
const Scene = React.lazy(() => import('./components/three/Scene'));

<Suspense fallback={null}>
  <Scene />
</Suspense>
```

This keeps Three.js out of the initial bundle. The 3D scene loads async — the page is interactive immediately.

### Code-split heavy sections
Any section with large dependencies (heavy animation libs, syntax highlighting, etc.) should also lazy-load:

```tsx
const SkillsSection = React.lazy(() => import('./components/sections/SkillsSection'));
```

### Tree-shake GSAP
Only import what you use:

```typescript
// Good — only registers what's needed
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// Bad — imports everything
import gsap from 'gsap/all';
```

### Fonts — display swap
Fonts should use `font-display: swap` in `@font-face` so text renders immediately in a fallback font, then swaps when the custom font loads. Verify in `src/styles/base.css`.

## 3. React Re-renders

Scroll-driven values must never go through React state. If they do, every scroll frame triggers a re-render cascade.

### Check for scroll state
```bash
# Find useState calls that might update on scroll
grep -r "useState" src/ --include="*.tsx" -n
```

Any `useState` that sets a value on every scroll tick is a problem. Replace with a ref + CSS custom property:

```typescript
// Before — triggers re-render on every frame
const [scrollY, setScrollY] = useState(0);
lenis.on('scroll', ({ scroll }) => setScrollY(scroll));

// After — zero re-renders
const scrollRef = useRef(0);
lenis.on('scroll', ({ scroll }) => {
  scrollRef.current = scroll;
  document.documentElement.style.setProperty('--scroll-y', `${scroll}px`);
});
```

### Check for expensive in-render computations
If a component renders frequently (due to parent re-renders), make sure it's not doing expensive work inline. Move constants and computed values outside the component or into `useMemo`.

## 4. Images and Assets

- Use WebP or AVIF for all images
- Add `loading="lazy"` to all `<img>` elements not in the initial viewport
- Add explicit `width` and `height` attributes to prevent layout shift (CLS)
- Use `srcset` for responsive images

```tsx
<img
  src="project-cover.webp"
  alt="Project name"
  width={800}
  height={450}
  loading="lazy"
/>
```

## 5. Pre-Deploy Checklist

Run these before shipping:

```bash
npm run build          # must succeed with zero errors
npx tsc --noEmit       # zero TypeScript errors
npm run lint           # zero ESLint errors
npm run preview        # test the production build locally
```

Then in the browser on the production build:
- [ ] Lighthouse score: Performance ≥ 90, Accessibility ≥ 95
- [ ] No console errors or warnings
- [ ] Animations play at 60fps on Chrome (check Performance tab)
- [ ] Page loads and is interactive in < 3s on a simulated mid-range device (Lighthouse throttling)
- [ ] Three.js scene loads without blocking the initial render
- [ ] Reduced motion mode: all content visible, no transform animations

## Quick Wins Checklist

If you're in a hurry, these fixes have the highest impact/effort ratio:

- [ ] `React.lazy` on `<Scene>` (Three.js out of initial bundle)
- [ ] `frameloop="demand"` on Canvas if the scene isn't constantly moving
- [ ] `dpr={[1, 1.5]}` on Canvas (if not already set)
- [ ] Remove post-processing effects on mobile
- [ ] Replace any scroll-state with refs + CSS vars
- [ ] `will-change: auto` after animations complete
