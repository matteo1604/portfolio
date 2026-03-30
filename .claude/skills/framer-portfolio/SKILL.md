---
name: framer-portfolio
description: Implement Framer Motion animations in this portfolio project. Use this skill whenever adding component enter/exit transitions, hover effects, tap feedback, layout animations, staggered list reveals driven by component state (not scroll), or AnimatePresence. Trigger on: "hover animation", "entrance animation", "fade in component", "AnimatePresence", "layout animation", "component transition", "whileHover", "whileInView", "motion component", "animate on mount". This skill enforces the project's motion system — Framer Motion owns component state, GSAP owns scroll. They never overlap on the same element.
---

# Framer Motion Portfolio Patterns

Framer Motion handles **state-driven** animations in this project: component mount/unmount, hover/tap interactions, layout shifts, and in-view reveals that aren't tied to scroll position. If the animation is triggered by scroll progress — that's GSAP territory.

## Core Rule

> One element, one animation system. Framer Motion animates a component, GSAP does not touch it. If GSAP has a ScrollTrigger on an element, remove Framer Motion from it.

## Always Use Variants

Define animation states as `variants` objects, never inline animation props. Variants are readable, reusable, and composable across parent/child relationships.

```tsx
// Good
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }  // EASING.dramatic
  },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } }
};

<motion.div variants={cardVariants} initial="hidden" animate="visible" exit="exit">

// Bad — inline props everywhere
<motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
```

## Easing — Match the Project Constants

The three curves from `lib/animations.ts` translate to Framer Motion like this:

```tsx
// EASING.smooth  → [0.25, 0.46, 0.45, 0.94]  — general entries
// EASING.dramatic → [0.16, 1, 0.3, 1]          — hero reveals, important moments
// EASING.snappy   → [0.87, 0, 0.13, 1]          — UI interactions, hover responses

const transition = {
  duration: 0.6,        // DURATION.normal
  ease: [0.16, 1, 0.3, 1],  // EASING.dramatic
};
```

Never use Framer's string easings (`"easeOut"`, `"spring"`) — they don't match the project's visual language.

## Component Entry with AnimatePresence

Wrap conditionally rendered components in `AnimatePresence` so exit animations play before unmount:

```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="panel"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

`mode="wait"` exits the old element before entering the new one — good for page-level transitions or content swaps.

## Hover and Tap States

Use `whileHover` and `whileTap` for interaction feedback — they automatically revert on pointer leave:

```tsx
const buttonVariants = {
  rest: { scale: 1, borderColor: 'rgba(255,255,255,0.06)' },
  hover: {
    scale: 1.02,
    borderColor: 'rgba(0, 212, 255, 0.2)',  // --border-hover
    transition: { duration: 0.3, ease: [0.87, 0, 0.13, 1] }  // EASING.snappy
  },
  tap: { scale: 0.98 }
};

<motion.button
  variants={buttonVariants}
  initial="rest"
  whileHover="hover"
  whileTap="tap"
>
```

For subtle glow effects on hover, animate `boxShadow` with the project's accent color:

```tsx
whileHover={{
  boxShadow: '0 0 24px rgba(0, 212, 255, 0.2)',  // --accent-glow at low opacity
  transition: { duration: 0.3 }
}}
```

## Staggered List Reveals

When a list of items appears (not scroll-triggered), use parent `staggerChildren`:

```tsx
const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,  // STAGGER.normal
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

<motion.ul variants={listVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.li key={item.id} variants={itemVariants}>{item.label}</motion.li>
  ))}
</motion.ul>
```

The child variants inherit the parent's trigger — clean and composable.

## whileInView (component-level reveals)

For elements that should reveal when entering the viewport, but the reveal isn't tied to scroll position (e.g., a card in a grid that just needs to appear once):

```tsx
<motion.div
  variants={cardVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: '-80px' }}
>
```

`once: true` means it only animates in — it won't reverse when scrolling back up. Use `margin` to trigger slightly before the element is fully visible.

**When to use `whileInView` vs GSAP ScrollTrigger:**
- `whileInView` — simple one-shot reveal, not tied to scroll progress, no scrubbing
- GSAP ScrollTrigger — scrub, parallax, pinned timelines, cross-section coordination

## Layout Animations

For elements that change size/position (e.g., a card expanding, a filter reshuffling a grid):

```tsx
<motion.div layout layoutId="card-content">
  {/* content */}
</motion.div>
```

`layoutId` enables shared-element transitions between two different positions in the DOM — useful for project card → detail view expansions.

## Design Language in Motion

This portfolio has a cinematic dark aesthetic. Framer animations should feel:
- **Purposeful** — every animation communicates something, nothing is decorative
- **Grounded** — elements land with weight (slight overshoot is acceptable but not bubbly)
- **Dark-first** — shadows, glows, and border-hover cues reinforce the dark theme

Prefer `y` movement over `x` — vertical reveals feel more natural for scroll-adjacent content. Keep `y` values small (16–40px) — large y values feel cheap.

## Reduced Motion

```tsx
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

function AnimatedCard() {
  const reduced = usePrefersReducedMotion();

  const variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0.15 : 0.6 } }
  };
  // ...
}
```

When reduced motion is active: keep opacity transitions (they aid comprehension) but remove all transform animations.

## What NOT to do

- No Framer Motion on elements that GSAP ScrollTrigger already targets
- No string easings (`"easeOut"`, `"spring"`) — use the cubic bezier arrays
- No `animate` prop with object literals for values that should be `variants`
- No `useAnimation` unless you need imperative control — `variants` + state is cleaner
- No Framer for scroll-linked animations — that belongs to GSAP
