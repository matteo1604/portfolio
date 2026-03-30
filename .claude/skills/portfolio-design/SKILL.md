---
name: portfolio-design
description: Enforce the design system and visual language of this portfolio project. Use this skill whenever building UI components, styling elements, choosing colors or typography, setting spacing, or making any visual decisions. Trigger on: "build a component", "style this", "add a card", "button component", "typography", "spacing", "add a UI element", "design a section", "how should this look", "layout", "make it look good", "visual", "dark theme", "colors". This skill ensures every pixel respects the project's design tokens, typography scale, and visual principles.
---

# Portfolio Design System

This portfolio has a specific visual identity: **cinematic dark, elegant, minimal**. Accent color is electric cyan `#00D4FF`. Every visual decision should reinforce this identity. When in doubt, ask: "Does this look like it belongs in a high-end creative portfolio, or does it look generic?"

## Color Tokens — Use These, Never Hardcode

```css
/* Backgrounds */
--bg-primary:   #0A0A0B   /* Page background */
--bg-elevated:  #141416   /* Elevated surfaces, sidebars */
--bg-surface:   #1A1A1F   /* Cards, panels, inputs */

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.06)  /* Default borders */
--border-hover:  rgba(0, 212, 255, 0.2)     /* On hover/focus */

/* Text */
--text-primary:   #E8E8EC  /* Main readable text */
--text-secondary: #6B6B76  /* Labels, captions, meta */

/* Accent */
--accent:      #00D4FF                /* Primary accent */
--accent-dim:  rgba(0, 212, 255, 0.15)  /* Tinted backgrounds */
--accent-glow: rgba(0, 212, 255, 0.4)   /* Glow, bloom effects */
```

In Tailwind classes, use the CSS var pattern:
```tsx
// Preferred
<div className="bg-[--bg-surface] border border-[--border-subtle]">

// Or via inline style for dynamic values
style={{ background: 'var(--bg-surface)' }}
```

Never hardcode `#0A0A0B` or `rgba(0, 212, 255, 0.15)` — if the token changes, everything should update.

## Typography — Three Fonts, Clear Roles

| Font | CSS Var | Role | Weight |
|------|---------|------|--------|
| Clash Display | `--font-display` | Section titles, hero | 500–700 |
| Inter | `--font-body` | Body text, descriptions | 400–500 |
| JetBrains Mono | `--font-mono` | Code labels, tech tags, numbers | 400 |

```tsx
// Section title
<h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>

// Body paragraph
<p style={{ fontFamily: 'var(--font-body)' }}>

// Tech tag / code element
<span style={{ fontFamily: 'var(--font-mono)' }}>
```

### Type Scale

```css
--text-xs:   0.75rem    /* 12px — fine print, badges */
--text-sm:   0.875rem   /* 14px — secondary labels */
--text-base: 1rem       /* 16px — body default */
--text-lg:   1.125rem   /* 18px — comfortable reading */
--text-xl:   1.25rem    /* 20px — card titles */
--text-2xl:  1.5rem     /* 24px — sub-section headers */
--text-3xl:  2rem       /* 32px — section subtitles */
--text-4xl:  2.5rem     /* 40px — section titles */
--text-5xl:  3.5rem     /* 56px — major headings */
--text-hero: clamp(3rem, 8vw, 6rem)  /* Hero — fluid */
```

Use `clamp()` and `vw` units for fluid sizes, not fixed pixel breakpoints. The hero size already demonstrates the pattern — apply it to other prominent elements.

## Spacing — Use the Scale

```css
--space-xs:      0.25rem   /* 4px */
--space-sm:      0.5rem    /* 8px */
--space-md:      1rem      /* 16px */
--space-lg:      2rem      /* 32px */
--space-xl:      4rem      /* 64px */
--space-2xl:     8rem      /* 128px */
--space-section: clamp(6rem, 15vh, 10rem)  /* Section vertical padding */
```

No pixel values for spacing. No magic numbers. If a value isn't on the scale, reconsider — or add a token with justification.

## The Four Visual Principles

These aren't abstract guidelines — they translate to concrete decisions:

### 1. Space as Luxury
More margin means more confidence. Crowded layouts read as cheap. When something feels visually tight, the fix is almost always more space, not less. Default section padding: `var(--space-section)` top and bottom. Default content max-width: ~1200px centered.

### 2. Movement as Language
Every animation must communicate something (attention, hierarchy, causality) — not just "look cool". Before adding any animation, answer: what does this motion tell the viewer? If the answer is "nothing", remove it.

### 3. Cinematic Contrast
This is not flat design. Use shadows, glows, and depth:
- Elevated surfaces cast subtle shadows
- Accent elements glow: `box-shadow: 0 0 24px var(--accent-glow)`
- Text hierarchy is pronounced — don't use similar opacities for everything
- The background is near-black, not grey

### 4. Details that Reward Attention
Micro-interactions should exist — but they should be discovered, not announced. A border that shifts to `--border-hover` on hover, a subtle scale on a card, a cursor change on interactive elements. These don't need to be obvious.

## Component Patterns

### Card
```tsx
<div
  className="rounded-lg p-6 transition-all duration-300"
  style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  }}
  // On hover: border transitions to --border-hover via Framer or CSS transition
>
```

### Section Header
```tsx
<div className="mb-16">
  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>
    01 — label
  </span>
  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', color: 'var(--text-primary)' }}>
    Section Title
  </h2>
</div>
```

### Accent line / divider
```tsx
<div style={{ width: '2px', height: '40px', background: 'var(--accent)', opacity: 0.6 }} />
```

### Tech tag / badge
```tsx
<span
  style={{
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-xs)',
    color: 'var(--accent)',
    background: 'var(--accent-dim)',
    padding: '2px 8px',
    borderRadius: '4px',
  }}
>
  TypeScript
</span>
```

## Responsive Sizing

No pixel breakpoints for typography or spacing. Use `clamp()`:

```css
font-size: clamp(1.5rem, 4vw, 2.5rem);   /* Fluid between 24px and 40px */
padding: clamp(2rem, 8vw, 6rem);          /* Fluid section padding */
```

For layout, use CSS Grid or Flexbox with `min()` / `max()` — not fixed breakpoints that create jarring jumps.

## Component Size Limit

Keep components under 150 lines. If a component grows beyond this, extract:
- Complex animation logic → a custom hook
- Repeated sub-structures → a sub-component
- Static data (project list, skill list) → a separate data file in `src/data/`

This keeps components readable and testable.

## What NOT to do

- No hardcoded hex colors or rgba values — use tokens
- No pixel units for spacing or type sizes — use the scale or clamp()
- No grey backgrounds — the palette is near-black (`--bg-*`), not grey
- No decorative animations without semantic purpose
- No light-mode styles unless explicitly requested — this is a dark-only portfolio
- No font-weight outside 400–700 for the defined fonts
- No border-radius above `12px` for main containers — this isn't a rounded-corners-everywhere aesthetic
