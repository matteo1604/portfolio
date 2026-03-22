# CLAUDE.md — Portfolio Project

## Project Overview

Portfolio personale immersivo. Filosofia: "Non te lo spiego, te lo faccio vivere."
Ogni sezione dimostra una competenza attraverso la propria implementazione.

**Stack:** React 18 + Vite + TypeScript (strict) + Tailwind CSS 4
**Motion:** GSAP + ScrollTrigger | Framer Motion | Three.js / R3F
**Scroll:** Lenis
**Atmosphere:** Dark, cinematico, elegante — accent cyan `#00D4FF`

---

## Current Phase: PHASE 1 — FOUNDATIONS

Build the project skeleton with all systems wired correctly before any visual work.

### Phase 1 Checklist
- [ ] Vite + React + TypeScript strict setup
- [ ] Tailwind CSS 4 configured with design tokens
- [ ] CSS custom properties (tokens.css) — palette, typography scale, spacing
- [ ] Lenis smooth scroll initialized
- [ ] GSAP + ScrollTrigger integrated with Lenis
- [ ] ScrollContext provider (exposes scroll position + velocity)
- [ ] useGSAP hook with automatic cleanup
- [ ] usePrefersReducedMotion hook
- [ ] Layout shell: ScrollContainer wrapping 5 empty sections
- [ ] Fonts loaded: Clash Display (Fontshare), Inter (Google), JetBrains Mono (Google)
- [ ] Base typography styles applied
- [ ] Basic section structure visible on scroll

---

## Architecture Rules

### File Structure
```
src/
├── components/
│   ├── layout/           # ScrollContainer, Header, Footer
│   ├── sections/          # Hero, About, Skills, Projects, Contact
│   ├── ui/                # Button, Text, Card, Link
│   └── three/             # Scene, Effects, Geometries (R3F only)
├── hooks/
│   ├── useScrollVelocity.ts
│   ├── useGSAP.ts
│   ├── useMediaQuery.ts
│   └── usePrefersReducedMotion.ts
├── lib/
│   ├── animations.ts      # EASING constants, duration presets, stagger values
│   ├── registry.ts        # ScrollTrigger registry for cleanup
│   └── utils.ts           # cn(), general utilities
├── styles/
│   ├── tokens.css         # CSS custom properties ONLY — no component styles
│   └── base.css           # Reset, global typography, Tailwind directives
├── types/
│   └── index.ts
├── App.tsx                # Composes layout + sections
└── main.tsx               # Entry point, Lenis init
```

### Naming Conventions
- Components: PascalCase (`HeroSection.tsx`)
- Hooks: camelCase with `use` prefix (`useGSAP.ts`)
- Utilities: camelCase (`animations.ts`)
- CSS files: kebab-case (`tokens.css`)
- Types: PascalCase, suffix with purpose (`ProjectData`, `ScrollState`)

---

## Motion System — CRITICAL RULES

### Separation of Concerns (NEVER violate this)

| System | Responsibility | When to use |
|--------|---------------|-------------|
| **GSAP + ScrollTrigger** | Scroll-driven animations, pinning, scrubbing, cross-section timelines | Anything tied to scroll position |
| **Framer Motion** | Component mount/unmount, hover, tap, layout animations, variants | Local component state changes |
| **Three.js / R3F** | 3D rendering, shaders, post-processing | Inside `<Canvas>` only |

**Rule:** These three systems NEVER animate the same element. If GSAP handles an element's scroll animation, Framer Motion does NOT also animate that element.

### GSAP Rules
- Always use the `useGSAP` hook — never raw `gsap.to()` in useEffect
- Every ScrollTrigger must be killed on unmount
- Use `gsap.context()` for scoped cleanup
- Pin sparingly — maximum 1 pin per section
- Scrub values: `true` for tight sync, `0.5-1` for smooth lag
- GSAP writes to CSS custom properties, React reads them (no re-renders)

### Framer Motion Rules
- Use `motion` components for enter/exit animations
- Define `variants` objects, don't inline animation props
- Use `whileHover`, `whileInView` for interaction states
- Never use Framer for scroll-linked animations (that's GSAP's job)

### Three.js / R3F Rules
- All 3D lives inside a single `<Canvas>` component
- Canvas is positioned fixed or absolute — overlays the page, doesn't displace it
- Use `@react-three/fiber` hooks (`useFrame`, `useThree`)
- Use `@react-three/drei` for common abstractions
- Performance: `frameloop="demand"` when possible, `dpr={[1, 1.5]}`
- Pointer events: Use R3F's event system, not DOM events

### Animation Constants (use these everywhere)
```typescript
// lib/animations.ts
export const EASING = {
  smooth: [0.25, 0.46, 0.45, 0.94],
  dramatic: [0.16, 1, 0.3, 1],
  snappy: [0.87, 0, 0.13, 1],
} as const;

export const DURATION = {
  fast: 0.3,
  normal: 0.6,
  slow: 1.0,
  dramatic: 1.4,
} as const;

export const STAGGER = {
  tight: 0.03,
  normal: 0.08,
  relaxed: 0.15,
} as const;
```

---

## Design Tokens

### Colors
```css
--bg-primary: #0A0A0B;
--bg-elevated: #141416;
--bg-surface: #1A1A1F;
--border-subtle: rgba(255, 255, 255, 0.06);
--border-hover: rgba(0, 212, 255, 0.2);
--text-primary: #E8E8EC;
--text-secondary: #6B6B76;
--accent: #00D4FF;
--accent-dim: rgba(0, 212, 255, 0.15);
--accent-glow: rgba(0, 212, 255, 0.4);
```

### Typography
```css
--font-display: 'Clash Display', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 2rem;      /* 32px */
--text-4xl: 2.5rem;    /* 40px */
--text-5xl: 3.5rem;    /* 56px */
--text-hero: clamp(3rem, 8vw, 6rem);
```

### Spacing
```css
--space-xs: 0.25rem;
--space-sm: 0.5rem;
--space-md: 1rem;
--space-lg: 2rem;
--space-xl: 4rem;
--space-2xl: 8rem;
--space-section: clamp(6rem, 15vh, 10rem);
```

---

## Sections

| # | Section | Status | Key Tech |
|---|---------|--------|----------|
| 1 | Hero | 🔲 Not started | R3F, GSAP timeline |
| 2 | About | 🔲 Not started | GSAP ScrollTrigger, text split |
| 3 | Skills (Lab) | 🔲 Not started | Interactive demos, creative coding |
| 4 | Projects | 🔲 Not started | GSAP, Framer Motion |
| 5 | Contact | 🔲 Not started | Framer Motion |

---

## Performance Rules

- No React state for frame-level updates — use refs + CSS vars
- `will-change` only on actively animating elements, remove after
- Images: lazy load, use WebP/AVIF, proper `srcset`
- Three.js: dispose geometries/materials/textures on unmount
- Bundle: code-split Three.js and heavy sections with `React.lazy`
- Target: 60fps scroll on mid-range devices

---

## Accessibility

- `prefers-reduced-motion: reduce` → disable parallax, reduce animation to opacity-only fades
- Semantic HTML: proper heading hierarchy, landmarks
- Keyboard navigation works for all interactive elements
- Color contrast: text on dark backgrounds meets WCAG AA
- Alt text for all meaningful images
- Skip-to-content link

---

## Code Quality

- TypeScript strict mode — no `any` unless absolutely necessary
- ESLint + Prettier configured
- No inline styles except for dynamic GSAP-driven values
- Components under 150 lines — extract hooks/utils when growing
- Meaningful commit messages following conventional commits

---

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint check
npx tsc --noEmit   # Type check
```

---

## What NOT to do

- ❌ Don't use Next.js patterns (no getServerSideProps, no API routes, no app router)
- ❌ Don't mix GSAP and Framer Motion on the same element
- ❌ Don't put 3D outside the Canvas
- ❌ Don't use React state for scroll position (use refs + CSS vars)
- ❌ Don't use `useEffect` for GSAP — use the `useGSAP` hook
- ❌ Don't install unnecessary dependencies — each one needs justification
- ❌ Don't skip TypeScript types — no `any`
- ❌ Don't animate without `prefers-reduced-motion` fallback
- ❌ Don't use pixel values for responsive sizing — use clamp/rem/vw