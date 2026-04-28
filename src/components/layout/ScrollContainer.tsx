import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setLenis } from '@/lib/lenis'

gsap.registerPlugin(ScrollTrigger)

interface ScrollContainerProps {
  children: React.ReactNode
}

export function ScrollContainer({ children }: ScrollContainerProps) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })

    setLenis(lenis)
    lenisRef.current = lenis

    const onTick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    lenis.on('scroll', ScrollTrigger.update)

    lenis.on('scroll', ({ progress, velocity }: { progress: number; velocity: number }) => {
      document.documentElement.style.setProperty('--scroll-progress', String(progress))
      document.documentElement.style.setProperty('--scroll-velocity', String(Math.abs(velocity)))
    })

    return () => {
      gsap.ticker.remove(onTick)
      lenis.destroy()
    }
  }, [])

  return <div id="scroll-container">{children}</div>
}
