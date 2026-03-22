import { useGSAP as useGSAPLib } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Re-export of @gsap/react's useGSAP with plugins pre-registered.
 * Always use this hook — never raw gsap.to() in useEffect.
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null)
 * useGSAP(() => {
 *   gsap.from('.item', { opacity: 0, y: 40, stagger: STAGGER.normal })
 * }, { scope: containerRef })
 */
export const useGSAP = useGSAPLib

export { gsap, ScrollTrigger }
