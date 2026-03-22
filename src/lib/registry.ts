import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Kill all ScrollTrigger instances associated with a given id or element.
 * Call this in cleanup functions (useGSAP scope handles this automatically,
 * but this helper is available for manual cleanup when needed).
 */
export function killScrollTriggers(id: string) {
  const triggers = ScrollTrigger.getAll().filter((t) => t.vars.id === id)
  triggers.forEach((t) => t.kill())
}

export function killAllScrollTriggers() {
  ScrollTrigger.killAll()
}
