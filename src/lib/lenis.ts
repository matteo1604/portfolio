// src/lib/lenis.ts
// Minimal Lenis singleton — allows any component to trigger smooth scrolls
// without threading Lenis through React context.
import type Lenis from 'lenis'

let _lenis: Lenis | null = null

export function setLenis(instance: Lenis): void {
  _lenis = instance
}

export function scrollToSection(target: string | number | HTMLElement): void {
  _lenis?.scrollTo(target as string)
}
