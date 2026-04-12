import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'

gsap.registerPlugin(ScrollTrigger)

const SKILLS_DATA = [
  {
    prefix: '01',
    title: 'FRONTEND ARCHITECTURE',
    desc: 'Costruisco interfacce pixel-perfect e architetture scalabili. Solidità strutturale guidata dai dati e matematica.'
  },
  {
    prefix: '02',
    title: 'CREATIVE DEV & WEBGL',
    desc: 'Trasformo il DOM e sfrutto le GPU tridimensionali per programmare esperienze visive e fluidodinamiche che sfidano la gravità.'
  },
  {
    prefix: '03',
    title: 'BACKEND & SYSTEMS',
    desc: 'Ingegnerizzo griglie logiche occulte. API veloci, sistemi distribuiti rigidi e reti in grado di reggere carichi esplosivi.'
  }
]

export function SkillsSection() {
  const containerRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  
  const textRefs = useRef<(HTMLDivElement | null)[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const lastActiveRef = useRef(-1)

  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')

  // ── GSAP Pinned Scroll ───────────────────────────────────────────────────────────
  useGSAP(
    () => {
      if (!containerRef.current || !pinRef.current) return
      
      if (prefersReducedMotion) {
        // Fallback for reduced motion: just list the texts naturally
        textRefs.current.forEach(el => {
          if (el) gsap.set(el, { opacity: 1, y: 0 })
        })
        return
      }

      // Use CSS height of section instead of JS window calculations
      // Section is set to 400vh below.

      // --- CONTINUOUS WHEEL PHYSICS: ABOUT -> SKILLS TRANSITION ---
      // This trigger runs exactly when the section is sliding up the screen (unpinned physical scroll gap)
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top bottom', // When Skills starts entering from bottom
        end: 'top top',      // When Skills hits the top and locks
        scrub: true,
        onUpdate: (self) => {
          // Interpolate Morph: Grid (2.0) -> Sphere (0.0)
          document.documentElement.style.setProperty('--p-morph', String(2.0 - self.progress * 2.0))
          
          // Interpolate Scale: Massive background (2.5) -> Normal (1.2 / 0.8)
          const targetScale = isMobile ? 0.8 : 1.2
          const scale = 2.5 - (self.progress * (2.5 - targetScale))
          document.documentElement.style.setProperty('--p-scale', String(scale))
          
          // Interpolate Depth: Background (-10) -> Foreground (0)
          const z = -10 + (self.progress * 10)
          document.documentElement.style.setProperty('--p-z', String(z))
          
          // Interpolate Opacity: Faint (0.15) -> Solid (1.0)
          const opacity = 0.15 + (self.progress * 0.85)
          document.documentElement.style.setProperty('--p-opacity', String(opacity))
          
          // Interpolate Position Y: Slightly low (5) -> Centered (0)
          const y = 5 - (self.progress * 5)
          document.documentElement.style.setProperty('--p-y', String(y))
          
          // Interpolate Position X: Offset Left (-12 or -5) -> Target Right (12 or 0)
          const startX = isMobile ? -5 : -12
          const targetX = isMobile ? 0 : 12
          const x = startX + (self.progress * (targetX - startX))
          document.documentElement.style.setProperty('--p-x', String(x))
        }
      })
      
      ScrollTrigger.create({
        trigger: containerRef.current,
        pin: pinRef.current,
        start: 'top top',
        end: '+=300%',
        pinSpacing: false,
        scrub: 0.5, // Reduced from 1.2 to 0.5: tighter control, less floaty lag
        snap: {
          snapTo: [0, 0.5, 1],
          duration: { min: 0.4, max: 0.8 },
          delay: 0.3, // Wait 300ms before taking over, preventing accidental autoscrolling
          inertia: false,
          ease: "sine.inOut"
        },
        onUpdate: (self) => {
          // --- GLOBAL PARTICLE TRACKING ---
          const targetShaderState = self.progress * 2.0
          document.documentElement.style.setProperty('--p-morph', String(targetShaderState))
          document.documentElement.style.setProperty('--p-opacity', '1') // Restore full brightness
          document.documentElement.style.setProperty('--p-z', '0') // Bring back to front
          document.documentElement.style.setProperty('--p-y', '0') // Center vertically
          document.documentElement.style.setProperty('--p-scale', isMobile ? '0.8' : '1.2')
          document.documentElement.style.setProperty('--p-x', isMobile ? '0' : '12') // Push right on desktop
          
          // Flash Trigger Math: pulse the GlobalCanvas Bloom when state locks in
          const activeIndex = Math.round(targetShaderState)
          if (activeIndex !== lastActiveRef.current) {
             lastActiveRef.current = activeIndex
             document.documentElement.style.setProperty('--p-flash', '1')
             // Reset quickly to allow future triggers
             setTimeout(() => document.documentElement.style.setProperty('--p-flash', '0'), 100)
          }
          
          // Auto-Center Layout: Shifts the text list up/down dynamically
          if (listRef.current) {
             // Calculate optical shift. Approx 380px is the total span between first and last item on desktop.
             const shiftY = (0.5 - self.progress) * (isMobile ? 240 : 380)
             gsap.set(listRef.current, { y: shiftY })
          }
          
          // Animate text blocks opacity based on segments
          // segment 0 = 0 to 0.33
          // segment 1 = 0.33 to 0.66
          // segment 2 = 0.66 to 1.0
          
          textRefs.current.forEach((el, index) => {
            if (!el) return
            
            // Define active zone for this block
            const center = index * 0.5 // 0.0, 0.5, 1.0
            
            // Distance from current scroll progress to the block's ideal center point
            const dist = Math.abs(self.progress - center)
            
            // Smooth curve for geometric transformations
            const intensity = Math.max(0, 1.0 - dist * 3.5)
            const easeIntensity = gsap.parseEase("power3.out")(intensity)
            
            const highlightColor = intensity > 0.5 ? 'var(--text-primary)' : 'var(--text-secondary)'
            
            gsap.set(el, {
               opacity: Math.max(0.1, intensity),
               color: highlightColor,
               x: isMobile ? 0 : easeIntensity * 30, // Smooth continuous slide forward
               scale: 1.0 + easeIntensity * 0.05,    // Smooth continuous scaling
               filter: `blur(${(1.0 - intensity) * 2}px)` // Cinematic depth of field
            })
          })
        }
      })
    },
    { scope: containerRef, dependencies: [prefersReducedMotion, isMobile] }
  )

  return (
    <section
      ref={containerRef}
      id="skills"
      aria-label="Core Architectures"
      className="relative w-full"
      style={{
         height: prefersReducedMotion ? 'auto' : '400vh',
         marginTop: prefersReducedMotion ? '0' : '30vh' 
      }}
    >
      <div 
        ref={pinRef} 
        className="w-full h-screen overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        
        {/* RIGHT (Background on mobile): The Global Canvas presence (handled globally) */}
        <div className="absolute inset-0 md:static md:w-3/5 h-full flex items-center justify-center z-0 md:order-2">
           {/* Particles fly into this area automatically via layout globals */}
        </div>
        
        {/* LEFT (Foreground on mobile): The UI Blocks */}
        <div className="md:w-2/5 h-full flex flex-col justify-center px-8 md:px-16 z-10 md:order-1 select-none">
           <div className="flex flex-col gap-12 md:gap-20" ref={listRef}>
             {SKILLS_DATA.map((skill, idx) => (
               <div 
                 key={idx} 
                 ref={el => textRefs.current[idx] = el}
                 className="flex flex-col gap-2 origin-left transition-colors duration-300"
                 style={{ opacity: idx === 0 ? 1 : 0.1 }} // Initial state
               >
                 <span className="font-mono text-sm tracking-[0.2em] text-[var(--accent)] font-bold">
                    // {skill.prefix}
                 </span>
                 <h2 className="font-display text-4xl md:text-5xl font-bold uppercase leading-tight tracking-tight">
                    {skill.title}
                 </h2>
                 <p className="font-mono text-xs md:text-sm text-[var(--text-secondary)] max-w-[320px] leading-relaxed opacity-80 mt-2">
                    {skill.desc}
                 </p>
               </div>
             ))}
           </div>
        </div>

      </div>
    </section>
  )
}
