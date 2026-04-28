import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SECTION_SCROLL, toScrollTrigger } from '@/lib/scrollPhases'

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
  const contentRef = useRef<HTMLDivElement>(null)
  
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
        if (containerRef.current) {
          containerRef.current.style.opacity = '1'
          containerRef.current.style.pointerEvents = 'auto'
        }
        if (contentRef.current) {
          gsap.set(contentRef.current, { opacity: 1, y: 0, filter: 'blur(0px)' })
        }
        textRefs.current.forEach(el => {
          if (el) gsap.set(el, { opacity: 1, y: 0 })
        })
        return
      }

      // Use CSS height of section instead of JS window calculations
      // Section is set to 400vh below.

      // --- Pre-created quickSetters per item (single DOM-binding, reusable each tick) ---
      const listYSet = listRef.current ? gsap.quickSetter(listRef.current, 'y', 'px') : null
      const contentYSet = contentRef.current ? gsap.quickSetter(contentRef.current, 'y', 'px') : null
      const contentOpacitySet = contentRef.current ? gsap.quickSetter(contentRef.current, 'opacity') : null
      const contentBlurSet = contentRef.current ? gsap.quickSetter(contentRef.current, 'filter') : null
      const itemSetters = textRefs.current.map(el => el ? {
        opacity: gsap.quickSetter(el, 'opacity'),
        x:       gsap.quickSetter(el, 'x', 'px'),
        scale:   gsap.quickSetter(el, 'scale'),
        filter:  gsap.quickSetter(el, 'filter'),
        color:   gsap.quickSetter(el, 'color'),
      } : null)
      const ease = gsap.parseEase('power3.out')

      const applyItemsAt = (progress: number) => {
        textRefs.current.forEach((el, index) => {
          if (!el) return
          const s = itemSetters[index]
          if (!s) return
          const center = index * 0.5
          const dist = Math.abs(progress - center)
          const intensity = Math.max(0, 1.0 - dist * 3.5)
          const easeIntensity = ease(intensity)
          s.opacity(Math.max(0.1, intensity))
          s.color(intensity > 0.5 ? 'var(--text-primary)' : 'var(--text-secondary)')
          s.x(isMobile ? 0 : easeIntensity * 30)
          s.scale(1.0 + easeIntensity * 0.05)
          s.filter(`blur(${(1.0 - intensity) * 2}px)`)
        })
      }

      // --- INITIAL STATE SETUP ---
      if (listYSet) listYSet((0.5 - 0) * (isMobile ? 240 : 380))
      if (contentYSet) contentYSet(48)
      if (contentOpacitySet) contentOpacitySet(0)
      if (contentBlurSet) contentBlurSet('blur(18px)')
      applyItemsAt(0)

      // --- ENTRY 41→44% : let About fully resolve before Skills copy becomes legible ---
      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: toScrollTrigger(SECTION_SCROLL.skills.ambientStart),
        end: toScrollTrigger(SECTION_SCROLL.skills.ambientEnd),
        scrub: true,
        onUpdate: (self) => {
          if (containerRef.current) {
             const eased = gsap.parseEase('power2.out')(self.progress)
             containerRef.current.style.opacity = String(eased * 0.7)
             containerRef.current.style.pointerEvents = eased > 0.85 ? 'auto' : 'none'
          }
          document.documentElement.style.setProperty('--p-opacity', String(0.62 + self.progress * 0.18))
        }
      })

      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: toScrollTrigger(SECTION_SCROLL.skills.copyStart),
        end: toScrollTrigger(SECTION_SCROLL.skills.copyEnd),
        scrub: true,
        onUpdate: (self) => {
          const eased = gsap.parseEase('power3.out')(self.progress)
          if (containerRef.current) {
            containerRef.current.style.opacity = String(0.7 + eased * 0.3)
            containerRef.current.style.pointerEvents = eased > 0.4 ? 'auto' : 'none'
          }
          if (contentOpacitySet) contentOpacitySet(eased)
          if (contentYSet) contentYSet((1 - eased) * 48)
          if (contentBlurSet) contentBlurSet(`blur(${(1 - eased) * 18}px)`)
        }
      })

      // --- ANIMATION 47→70% : list/text only. No morph writes — morph stays at 2.0 (grid) ---
      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: toScrollTrigger(SECTION_SCROLL.skills.focusStart),
        end: toScrollTrigger(SECTION_SCROLL.skills.focusEnd),
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress

          // Flash on segment lock-in (map progress → 0..2 index)
          const activeIndex = Math.round(p * 2.0)
          if (activeIndex !== lastActiveRef.current) {
             lastActiveRef.current = activeIndex
             document.documentElement.style.setProperty('--p-flash', '1')
             setTimeout(() => document.documentElement.style.setProperty('--p-flash', '0'), 100)
          }

          if (listYSet) listYSet((0.5 - p) * (isMobile ? 240 : 380))
          applyItemsAt(p)
        }
      })

      // --- EXIT 70→72% : fade-out section via direct-write (same pattern as entry) ---
      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: toScrollTrigger(SECTION_SCROLL.skills.exitStart),
        end: toScrollTrigger(SECTION_SCROLL.skills.exitEnd),
        scrub: true,
        onUpdate: (self) => {
          if (containerRef.current) {
             containerRef.current.style.opacity = String(1 - self.progress)
          }
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
      className="absolute inset-0 z-[3] w-full h-full pointer-events-none"
      style={{ opacity: 0 }}
    >
      <div 
        ref={pinRef} 
        className="w-full h-full overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        
        {/* RIGHT (Background on mobile): The Global Canvas presence (handled globally) */}
        <div className="absolute inset-0 md:static md:w-3/5 h-full flex items-center justify-center z-0 md:order-2">
           {/* Particles fly into this area automatically via layout globals */}
        </div>
        
        {/* LEFT (Foreground on mobile): The UI Blocks */}
        <div
          ref={contentRef}
          className="md:w-2/5 h-full flex flex-col justify-center px-8 md:px-16 z-10 md:order-1 select-none will-change-transform"
        >
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
