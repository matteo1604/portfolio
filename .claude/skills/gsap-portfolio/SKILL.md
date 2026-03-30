---
name: gsap-portfolio
description: Implement GSAP + ScrollTrigger animations in this portfolio project. Use this skill whenever adding scroll-driven animations, parallax effects, pinning sections, creating timelines, scrub effects, or integrating GSAP with Lenis smooth scroll. Trigger on: "animate on scroll", "add parallax", "pin section", "scroll timeline", "stagger reveal", "ScrollTrigger", "scroll-driven", "useGSAP". This skill enforces the project's motion system rules — use it to avoid architecture violations.
---

# GSAP Portfolio Animations

This project uses **GSAP + ScrollTrigger** exclusively for scroll-driven animations. Framer Motion handles component state (mount/unmount/hover). They never animate the same element.

## The useGSAP Hook (non-negotiable)

Always use the `useGSAP` hook from `src/hooks/useGSAP.ts` — never raw `gsap.to()` inside `useEffect`. The hook provides automatic `gsap.context()` scoping and cleanup on unmount.

```tsx
import { useGSAP } from '@/hooks/useGSAP';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function MySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = sectionRef.current;
    if (!el) return;

    gsap.fromTo(el.querySelector('.headline'),
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: DURATION.normal,
        ease: EASING.dramatic,
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          end: 'top 40%',
          scrub: false,   // false = snaps to final value on enter
        }
      }
    );
  }, { scope: sectionRef });  // scope = cleanup context

  return <section ref={sectionRef}>...</section>;
}
```

## Animation Constants

Always import from `src/lib/animations.ts` — never hardcode values:

```typescript
import { EASING, DURATION, STAGGER } from '@/lib/animations';

// EASING.smooth    → [0.25, 0.46, 0.45, 0.94]  (general entries)
// EASING.dramatic  → [0.16, 1, 0.3, 1]          (hero reveals)
// EASING.snappy    → [0.87, 0, 0.13, 1]          (UI interactions)

// DURATION.fast    → 0.3
// DURATION.normal  → 0.6
// DURATION.slow    → 1.0
// DURATION.dramatic → 1.4

// STAGGER.tight    → 0.03
// STAGGER.normal   → 0.08
// STAGGER.relaxed  → 0.15
```

## Lenis Integration

Lenis normalizes scroll events. ScrollTrigger must use Lenis as its scroll proxy — this is already wired in `src/main.tsx`. You don't need to do anything extra; ScrollTrigger will receive the correct scroll position.

If you create a ScrollTrigger inside a component and it feels offset, check that `ScrollTrigger.refresh()` is called after Lenis initialization (already handled globally).

## ScrollTrigger Patterns

### Fade-up reveal (most common)
```typescript
gsap.fromTo(elements,
  { opacity: 0, y: 40 },
  {
    opacity: 1, y: 0,
    duration: DURATION.normal,
    ease: EASING.dramatic,
    stagger: STAGGER.normal,
    scrollTrigger: {
      trigger: container,
      start: 'top 75%',
    }
  }
);
```

### Scrub parallax
```typescript
gsap.to(el, {
  y: -80,
  ease: 'none',
  scrollTrigger: {
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,   // tight sync — use 0.5-1 for smooth lag
  }
});
```

### Section pin
```typescript
ScrollTrigger.create({
  trigger: sectionRef.current,
  start: 'top top',
  end: '+=200%',
  pin: true,
  scrub: 1,
});
// Maximum 1 pin per section — use sparingly
```

### Char split (hero titles only)
```typescript
import SplitType from 'split-type';

const split = new SplitType(titleEl, { types: 'chars' });
gsap.fromTo(split.chars,
  { opacity: 0, y: '100%' },
  {
    opacity: 1, y: '0%',
    duration: DURATION.slow,
    ease: EASING.dramatic,
    stagger: STAGGER.tight,
    scrollTrigger: { trigger: titleEl, start: 'top 85%' }
  }
);
// Clean up: split.revert() inside the useGSAP cleanup
```

## GSAP → CSS Custom Properties Bridge

For frame-level updates that React reads (no re-renders):

```typescript
// GSAP writes
gsap.to(el, {
  '--glow-opacity': 1,
  ease: 'none',
  scrollTrigger: { scrub: true, ... }
});

// CSS reads
// .element { box-shadow: 0 0 40px rgba(0,212,255, var(--glow-opacity)); }
```

This is the preferred pattern when animating visual properties that other elements need to react to. Never use React state for scroll-driven values.

## Cleanup Checklist

The `useGSAP` hook handles context cleanup automatically when `scope` is provided. For manually created ScrollTriggers or timelines outside the hook pattern, store and kill them explicitly:

```typescript
useGSAP(() => {
  const tl = gsap.timeline({ ... });
  const st = ScrollTrigger.create({ ... });

  return () => {
    tl.kill();
    st.kill();
  };
}, { scope: sectionRef });
```

## Reduced Motion

Always check `usePrefersReducedMotion` and provide a fallback:

```typescript
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const reduced = usePrefersReducedMotion();

useGSAP(() => {
  if (reduced) {
    gsap.set(el, { opacity: 1 }); // skip animation, just show
    return;
  }
  // full animation
}, { scope: ref, dependencies: [reduced] });
```

## What NOT to do

- No `gsap.to()` inside `useEffect` — always `useGSAP`
- No `will-change` left on after animation completes
- No more than 1 `pin: true` per section
- No hardcoded easing strings — use `EASING` constants
- No animating elements that Framer Motion already owns
