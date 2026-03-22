import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollContext } from './ScrollContext'
import type { ScrollState } from '@/types'

gsap.registerPlugin(ScrollTrigger)

interface ScrollContainerProps {
  children: React.ReactNode
}

export function ScrollContainer({ children }: ScrollContainerProps) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    progress: 0,
    velocity: 0,
    direction: 0,
  })
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })

    lenisRef.current = lenis

    // Wire Lenis to GSAP ticker
    const onTick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    // Wire Lenis scroll events to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    // Update ScrollContext state
    lenis.on('scroll', ({ progress, velocity, direction }: {
      progress: number
      velocity: number
      direction: 1 | -1 | 0
    }) => {
      // Write to CSS vars — no re-renders for frame-level consumers
      document.documentElement.style.setProperty('--scroll-progress', String(progress))
      document.documentElement.style.setProperty('--scroll-velocity', String(Math.abs(velocity)))

      // Update React state for context consumers (coarse updates only)
      setScrollState({ progress, velocity, direction })
    })

    return () => {
      gsap.ticker.remove(onTick)
      lenis.destroy()
    }
  }, [])

  return (
    <ScrollContext.Provider value={scrollState}>
      <div id="scroll-container">
        {children}
      </div>
    </ScrollContext.Provider>
  )
}
