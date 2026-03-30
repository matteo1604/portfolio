---
name: section-build
description: Build a complete portfolio section from scratch, following the project's full architecture, motion system, and design language. Use this skill whenever starting a new section, implementing a major section feature, or when the task involves creating a substantial piece of the portfolio (Hero, About, Skills, Projects, Contact). Trigger on: "build the hero", "implement about section", "create the skills section", "build projects", "add contact section", "start a new section", "implement [section name]", or any message that involves constructing a substantial section of the portfolio from the ground up.
---

# Building a Portfolio Section

Each section in this portfolio is a self-contained unit that demonstrates a skill through its own implementation. Building one well means getting architecture, motion, design, accessibility, and performance right together. This skill walks through the full process.

## Before Writing Any Code — Decide the Motion Strategy

The first decision shapes everything else. For the section you're building, answer:

1. **What animation system drives the primary experience?**
   - Scroll-driven (parallax, reveal on scrub, pinned timeline) → GSAP + ScrollTrigger
   - Component state (mount/unmount, hover, layout shift) → Framer Motion
   - 3D / WebGL required → R3F inside the existing `<Canvas>`
   - Often: GSAP for scroll reveals + Framer for hover states on individual elements

2. **Does it need a pin?** (max 1 per section)

3. **Does it need 3D?** If yes, make sure it integrates with the existing `<Canvas>` in `App.tsx` — don't create a second canvas.

Write this decision down as a comment at the top of the section file before coding anything. It prevents drift.

## File Creation

```
src/components/sections/[SectionName]Section.tsx   ← main component
src/hooks/use[SectionName].ts                      ← section-specific logic (optional)
```

If the section needs shared data (project list, skill list), put it in:
```
src/data/[section-name].ts
```

Never put static data inside the component file.

## Component Anatomy

Every section follows this structure:

```tsx
// src/components/sections/HeroSection.tsx

// 1. Imports — external libs first, then internal
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useGSAP } from '@/hooks/useGSAP';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASING, DURATION, STAGGER } from '@/lib/animations';

// 2. Types — local types at the top
interface HeroSectionProps {
  // ...
}

// 3. Variants — Framer Motion variants defined outside the component
const headlineVariants = { ... };

// 4. Component
export function HeroSection({ }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  // 5. GSAP animations — scroll-driven only
  useGSAP(() => {
    if (reduced) return;
    // scroll-driven animation here
  }, { scope: sectionRef });

  // 6. JSX — semantic HTML
  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-label="Hero"
      style={{ minHeight: '100vh', padding: 'var(--space-section) 0' }}
    >
      {/* Framer Motion for state-driven animations */}
    </section>
  );
}
```

## Integration with ScrollContainer

The section must be registered in `App.tsx` inside the `<ScrollContainer>`:

```tsx
// App.tsx
<ScrollContainer>
  <HeroSection />
  <AboutSection />
  {/* ... */}
</ScrollContainer>
```

If using 3D, the `<Canvas>` sits outside `ScrollContainer` as a fixed overlay. The section communicates with it via a ref passed as a prop or via a shared context.

## GSAP Checklist (if used)

- [ ] Using `useGSAP` hook, not `useEffect`
- [ ] `scope: sectionRef` provided for automatic cleanup
- [ ] All easing values from `EASING` constants
- [ ] All duration values from `DURATION` constants
- [ ] All stagger values from `STAGGER` constants
- [ ] `usePrefersReducedMotion()` check at the top of the animation block
- [ ] Max 1 `pin: true` in this section
- [ ] ScrollTrigger `start`/`end` values use percentages or named positions, not pixel values

## Framer Motion Checklist (if used)

- [ ] All animations defined as `variants` objects, not inline props
- [ ] Easing uses cubic bezier arrays from `EASING` constants
- [ ] `AnimatePresence` wraps conditionally rendered elements
- [ ] `whileInView` uses `{ once: true }` for one-shot reveals
- [ ] No Framer Motion on elements GSAP already targets
- [ ] `usePrefersReducedMotion()` removes `y` transforms, keeps opacity fades

## Design Checklist

- [ ] Colors use CSS tokens (`var(--bg-surface)`, `var(--accent)`, etc.) — no hardcoded values
- [ ] Typography uses `var(--font-display)` / `var(--font-body)` / `var(--font-mono)`
- [ ] Font sizes use `var(--text-*)` scale or `clamp()` — no pixel font sizes
- [ ] Spacing uses `var(--space-*)` or `clamp()` — no pixel spacing
- [ ] Section has `var(--space-section)` vertical padding
- [ ] Content has a max-width and is centered

## Accessibility Checklist

- [ ] Section has `id` attribute (for skip-links and anchor navigation)
- [ ] Section has `aria-label` describing its purpose
- [ ] Heading hierarchy is correct (section uses `h2`, sub-sections `h3`)
- [ ] All interactive elements are keyboard navigable
- [ ] Reduced motion path exists for every animation
- [ ] No information conveyed by color alone

## Performance Checklist

- [ ] No `useState` / `useReducer` called on scroll frames — refs + CSS vars
- [ ] Images are lazy-loaded with `loading="lazy"` and have `alt` text
- [ ] If using Three.js objects: `dispose()` called on unmount
- [ ] Heavy imports (Three.js, large libs) are code-split with `React.lazy`
- [ ] No `will-change` left on permanently

## Section-Specific Notes

### Hero
The entry point — first impression. Combine R3F atmospheric background + GSAP char-split title entry. The 3D scene should react to mouse position via `useFrame`. Use `frameloop="always"` for the canvas here since it's constantly animated.

### About
Text-reveal showcase. GSAP ScrollTrigger with `scrub: 0.5` on split lines — each line reveals as you scroll through. The pacing of the reveal IS the design.

### Skills — The Lab
Interactive demos embedded inline. Each skill gets its own mini-component that demonstrates the skill (e.g., a GSAP animation you can trigger, a Three.js snippet you can rotate). Framer Motion for the card/panel interactions.

### Projects
Case study cards with GSAP-driven reveal. Consider a horizontal scroll or pinned timeline for the "cinematic" feel. Framer `layoutId` for card → detail expansion.

### Contact
Closing elegance. Framer Motion for the form reveal and submit feedback. Consider a subtle callback to the hero's 3D scene (same canvas, different camera position or scene state).

## Definition of Done

A section is complete when:
1. It renders without errors and TypeScript has no type complaints
2. All animations play correctly on first load and on scroll
3. Reduced motion mode shows all content without transform animations
4. No console warnings (especially GSAP/Three.js cleanup warnings)
5. It looks correct at 375px (mobile), 768px (tablet), and 1440px (desktop)
6. It passes the motion system rules (no GSAP + Framer on same element)
