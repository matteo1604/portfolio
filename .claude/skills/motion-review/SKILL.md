---
name: motion-review
description: Audit and fix motion system compliance in this portfolio project. Use this skill when reviewing animation code, checking for motion system violations, verifying GSAP/Framer Motion separation, auditing cleanup, or before marking animation work complete. Trigger on: "check animations", "review motion", "audit GSAP", "motion system", "animation cleanup", "verify animations", "check scroll animations", "motion audit", or after implementing any animation work in this project.
---

# Motion System Review

This portfolio enforces strict separation between three animation systems. Violations cause bugs, jank, and unpredictable behavior. Run this audit after any animation work.

## The Three Systems — Non-Overlapping

| System | Owns | Never touches |
|--------|------|---------------|
| **GSAP + ScrollTrigger** | Scroll-driven animations, pin, scrub, cross-section timelines | Component mount/unmount, hover states |
| **Framer Motion** | Mount/unmount transitions, hover, tap, layout animations | Scroll position, `transform` on scroll |
| **Three.js / R3F** | Everything inside `<Canvas>` | React DOM elements |

**The core rule:** If GSAP animates `transform` or `opacity` on an element on scroll, Framer Motion must not also animate `transform` or `opacity` on that same element for any reason.

## Audit Checklist

Work through each check. Flag any violation immediately.

### 1. Same-element conflicts
Search for elements that appear in both GSAP targets and Framer Motion `motion.*` components:

- Does any `<motion.div>` have a GSAP ScrollTrigger targeting the same DOM node?
- Does any element receive both a Framer `animate` prop and a `gsap.to()` call?
- Are `initial`/`animate` props on a `<motion.div>` fighting a GSAP `fromTo`?

**Fix:** Pick one system per element. Scroll-driven → GSAP. State-driven → Framer.

### 2. useGSAP hook usage
Verify all GSAP calls use `useGSAP` from `src/hooks/useGSAP.ts`:

```bash
# Should find zero matches
grep -r "useEffect" src/components --include="*.tsx" -l
# Then manually check if any of those useEffects contain gsap calls
```

Any `gsap.` inside a `useEffect` is a violation. Move to `useGSAP`.

### 3. Animation constants
All durations, easings, and stagger values must reference `src/lib/animations.ts`:

Look for:
- Hardcoded `duration: 0.6` → should be `duration: DURATION.normal`
- Hardcoded `ease: "power2.out"` → should be `ease: EASING.smooth` (or dramatic/snappy)
- Custom easing arrays → only the 3 defined curves are allowed

### 4. ScrollTrigger cleanup
Every ScrollTrigger and GSAP timeline must be killed on unmount. The `useGSAP` hook handles this automatically when `scope` is provided. Verify:

```tsx
// Good — scope ensures cleanup
useGSAP(() => { ... }, { scope: sectionRef });

// Needs explicit cleanup — no scope
useGSAP(() => {
  const tl = gsap.timeline();
  return () => tl.kill(); // explicit kill required
});
```

Check for any ScrollTrigger instances created outside `useGSAP` — they require manual cleanup.

### 5. Pin count
Maximum 1 `pin: true` per section. Count pins across all sections. If a section has 2+ pins, refactor to a single pinned timeline.

### 6. Three.js isolation
Verify that:
- All R3F components are inside `<Canvas>`
- No `THREE.*` object is instantiated outside a component inside `<Canvas>`
- No GSAP or Framer Motion target sits inside `<Canvas>`

### 7. CSS vars bridge
When GSAP drives a value that affects multiple elements or needs to be read by CSS, it should write to a CSS custom property, not a direct style:

```typescript
// Preferred — CSS reads the var, no re-renders
gsap.to(el, { '--accent-intensity': 1, scrollTrigger: { scrub: true } });

// Avoid — direct style mutation is fine but CSS vars are more composable
gsap.to(el, { boxShadow: '...', scrollTrigger: { scrub: true } });
```

This isn't a hard violation but flag it as a suggestion if the value is used in multiple places.

### 8. React state for scroll
No `useState` or `useReducer` should update on every scroll tick. Scroll-driven values go through refs + CSS vars.

```tsx
// Violation — causes re-renders on every scroll frame
const [scrollY, setScrollY] = useState(0);
lenis.on('scroll', ({ scroll }) => setScrollY(scroll));

// Correct — ref + CSS var, zero re-renders
const scrollRef = useRef(0);
lenis.on('scroll', ({ scroll }) => {
  scrollRef.current = scroll;
  document.documentElement.style.setProperty('--scroll-y', `${scroll}px`);
});
```

### 9. Reduced motion fallback
Every `useGSAP` block that runs animations must check `usePrefersReducedMotion()`:

```typescript
const reduced = usePrefersReducedMotion();
useGSAP(() => {
  if (reduced) {
    gsap.set(target, { opacity: 1 }); // show immediately
    return;
  }
  // full animation
}, { scope: ref, dependencies: [reduced] });
```

Flag any animation block missing this check.

### 10. will-change hygiene
`will-change` must not persist after an animation completes. Either:
- Set it just before animation starts, remove it in the `onComplete` callback
- Or don't use it at all (GSAP handles compositing hints automatically in most cases)

## Reporting Violations

For each violation found, report:
1. **File and line** where the violation occurs
2. **Which rule** it breaks
3. **Exact fix** to apply

Example:
```
VIOLATION: src/components/sections/About.tsx:45
Rule: useEffect contains gsap.to() — must use useGSAP
Fix: Wrap in useGSAP(() => { ... }, { scope: containerRef })
```

Apply all fixes before marking animation work complete.
