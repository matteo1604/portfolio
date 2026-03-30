---
name: typescript-portfolio
description: Write TypeScript for this portfolio project in strict mode. Use this skill when defining types for components, hooks, animations, R3F scenes, GSAP callbacks, or when fixing TypeScript errors. Trigger on: "TypeScript error", "type this", "define types", "fix TS", "type for props", "how to type GSAP", "R3F types", "type the hook", "strict mode error", "no any", "type inference", "interface vs type", "discriminated union", "type the variants", "type the ref", "generic component". This project uses strict TypeScript — no `any`, no implicit types.
---

# TypeScript Patterns for This Portfolio

This project runs TypeScript in strict mode. No `any`, no `@ts-ignore` unless absolutely unavoidable with a comment explaining why. The goal is that types document the code — if you read the types, you understand the data flowing through the system.

## Core Types — `src/types/index.ts`

Shared types live here. Add to this file when a type is used in more than one component:

```typescript
// Scroll state — read from ScrollContext
export interface ScrollState {
  scrollY: number;
  velocity: number;
  direction: 'up' | 'down';
  progress: number;  // 0-1, normalized to document height
}

// Section IDs — ensures navigation stays in sync
export type SectionId = 'hero' | 'about' | 'skills' | 'projects' | 'contact';

// Project data shape
export interface ProjectData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  href?: string;
  coverImage: string;
  featured: boolean;
}

// Skill/tech item
export interface SkillItem {
  name: string;
  category: 'frontend' | 'backend' | 'tooling' | '3d' | 'animation';
  level: 'proficient' | 'experienced' | 'learning';
}
```

## Typing React Components

Use `interface` for props (they describe object shapes). Don't export props interfaces unless they're shared — keep them local to the component file:

```typescript
interface HeroSectionProps {
  onScrollStart?: () => void;
}

export function HeroSection({ onScrollStart }: HeroSectionProps) { ... }
```

For components that accept children, use `React.PropsWithChildren`:

```typescript
interface CardProps extends React.PropsWithChildren {
  elevated?: boolean;
  className?: string;
}
```

## Typing Refs

Always type refs explicitly — TypeScript can't infer what DOM element or Three.js object you'll attach:

```typescript
// DOM refs
const sectionRef = useRef<HTMLElement>(null);
const titleRef = useRef<HTMLHeadingElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);

// Three.js refs
import * as THREE from 'three';
const meshRef = useRef<THREE.Mesh>(null);
const groupRef = useRef<THREE.Group>(null);
const materialRef = useRef<THREE.ShaderMaterial>(null);
```

When calling GSAP on a ref, the null check is required:

```typescript
useGSAP(() => {
  if (!titleRef.current) return;
  gsap.fromTo(titleRef.current, { opacity: 0 }, { opacity: 1 });
}, { scope: sectionRef });
```

## Typing GSAP

GSAP is typed via `@types/gsap` (included with the package). Key patterns:

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ScrollTrigger vars — use the ScrollTrigger.Vars type
const stConfig: ScrollTrigger.Vars = {
  trigger: sectionRef.current,
  start: 'top 80%',
  end: 'bottom 20%',
  scrub: 0.5,
};

// Timeline
const tl: gsap.core.Timeline = gsap.timeline({ paused: true });

// Tween
const tween: gsap.core.Tween = gsap.to(el, { x: 100, duration: 0.6 });

// onComplete callback — access the tween via this
gsap.to(el, {
  opacity: 1,
  onComplete(this: gsap.core.Tween) {
    // this.targets() is available here
  }
});
```

## Typing Framer Motion

```typescript
import { Variants, Transition } from 'framer-motion';

// Variants — type them explicitly for reusable variant sets
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

// Transition
const smoothTransition: Transition = {
  duration: 0.6,
  ease: [0.16, 1, 0.3, 1],
};

// Custom motion component props
import { HTMLMotionProps } from 'framer-motion';

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  elevated?: boolean;
}
```

## Typing R3F / Three.js

```typescript
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

// Event handlers
function onMeshClick(e: ThreeEvent<MouseEvent>) {
  e.stopPropagation();
}

function onPointerEnter(e: ThreeEvent<PointerEvent>) { ... }

// useFrame state
import { RootState } from '@react-three/fiber';

useFrame((state: RootState, delta: number) => {
  const { clock, camera, size } = state;
});

// Shader uniforms — type them as a Record
interface WaveUniforms {
  uTime: { value: number };
  uColor: { value: THREE.Color };
  uIntensity: { value: number };
}
```

## Typing Custom Hooks

Return arrays using `as const` to preserve tuple types:

```typescript
// Without as const — TypeScript widens the type to (boolean | () => void)[]
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn(v => !v)] as const;
  //                                  ^^^^^^^^^^ preserves [boolean, () => void]
}

// Explicit return type for complex hooks
function useScrollVelocity(): { velocity: number; direction: 'up' | 'down' } {
  ...
}
```

## Animation Constants — Typed

The constants in `src/lib/animations.ts` use `as const` to preserve literal types:

```typescript
export const EASING = {
  smooth:   [0.25, 0.46, 0.45, 0.94],
  dramatic: [0.16, 1, 0.3, 1],
  snappy:   [0.87, 0, 0.13, 1],
} as const;

// This makes EASING.smooth type readonly [0.25, 0.46, 0.45, 0.94]
// instead of number[] — TypeScript will catch typos in easing values
```

## Discriminated Unions for Section Variants

When a component has meaningfully different states, a discriminated union is cleaner than boolean flags:

```typescript
// Instead of: featured?: boolean; compact?: boolean; loading?: boolean;
type CardState =
  | { variant: 'default' }
  | { variant: 'featured'; priority: boolean }
  | { variant: 'loading' }
  | { variant: 'compact'; hideImage: boolean };

interface ProjectCardProps {
  project: ProjectData;
  state: CardState;
}

// Usage — TypeScript narrows correctly in the switch
function ProjectCard({ project, state }: ProjectCardProps) {
  switch (state.variant) {
    case 'featured':
      return state.priority ? <FeaturedLarge /> : <FeaturedNormal />;
    case 'loading':
      return <Skeleton />;
    // ...
  }
}
```

## Common Strict Mode Issues

**Object possibly undefined:**
```typescript
// Error: Object is possibly 'null'
gsap.to(ref.current, { x: 100 });

// Fix: guard at the top of useGSAP
useGSAP(() => {
  if (!ref.current) return;
  gsap.to(ref.current, { x: 100 });
});
```

**Index signature:**
```typescript
// Error: Element implicitly has an 'any' type because...
const value = EASING[key];

// Fix: narrow the key type
type EasingKey = keyof typeof EASING;
const value = EASING[key as EasingKey];
```

**Event handler types:**
```typescript
// React synthetic events
function handleClick(e: React.MouseEvent<HTMLButtonElement>) { ... }
function handleChange(e: React.ChangeEvent<HTMLInputElement>) { ... }
function handleSubmit(e: React.FormEvent<HTMLFormElement>) { ... }
```

## What NOT to do

- No `any` — if you don't know the type, use `unknown` and narrow it
- No `@ts-ignore` without a comment explaining the specific reason
- No `as Type` casts that bypass actual type checking — use type guards instead
- No importing entire `* as THREE` just to use one type — import specifically
- No duplicating types — if a type is used in 2+ places, move it to `src/types/index.ts`
