import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { ABOUT_SLIDES, tokenizePhrase } from '@/data/about-slides'
gsap.registerPlugin(ScrollTrigger)

const LINE_HEIGHT = 28 // height per IDE line in pixels

const SYNTAX = {
  keyword: { color: '#ff2a85', textShadow: '0 0 10px rgba(255, 42, 133, 0.4)' },
  entity: { color: '#00e5ff', textShadow: '0 0 10px rgba(0, 229, 255, 0.3)' },
  string: { color: '#00ffaa', textShadow: '0 0 10px rgba(0, 255, 170, 0.3)' },
  comment: { color: '#7a7a7a', fontStyle: 'italic' },
  method: { color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.3)' },
  bracket: { color: '#8892b0' },
  property: { color: '#b974ff', textShadow: '0 0 8px rgba(185, 116, 255, 0.3)' },
}

const IDE_LINES = [
  { text: <span style={SYNTAX.comment}>{'/**'}</span>, type: 'comment' },
  { text: <span style={SYNTAX.comment}>{' * @name      Matteo Raineri'}</span>, type: 'comment' },
  { text: <span style={SYNTAX.comment}>{' * @role      Computer Engineering Student'}</span>, type: 'comment' },
  { text: <span style={SYNTAX.comment}>{' * @status    Building Frontend Ecosystems'}</span>, type: 'comment' },
  { text: <span style={SYNTAX.comment}>{' */'}</span>, type: 'comment' },
  { text: <><span style={SYNTAX.keyword}>export class</span> <span style={SYNTAX.entity}>Matteo</span> <span style={SYNTAX.keyword}>implements</span> <span style={SYNTAX.entity}>Engineer</span> <span style={SYNTAX.bracket}>{'{'}</span></>, type: 'code' },
  { text: '', type: 'empty' },
  { text: <><span style={SYNTAX.keyword}>  public readonly</span> <span style={SYNTAX.property}>focus</span> <span style={SYNTAX.bracket}>= {'{'}</span></>, type: 'code' },
  { text: <><span style={SYNTAX.property}>    logic</span><span style={SYNTAX.bracket}>:</span> <span style={SYNTAX.string}>"Engineering"</span><span style={SYNTAX.bracket}>,</span></>, type: 'code' },
  { text: <><span style={SYNTAX.property}>    execution</span><span style={SYNTAX.bracket}>:</span> <span style={SYNTAX.string}>"Creative"</span></>, type: 'code' },
  { text: <><span style={SYNTAX.bracket}>  {'}'};</span></>, type: 'code' },
  { text: '', type: 'empty' },
  { text: <><span style={SYNTAX.keyword}>  public get</span> <span style={SYNTAX.method}>philosophy</span><span style={SYNTAX.bracket}>():</span> <span style={SYNTAX.entity}>Paradigm</span> <span style={SYNTAX.bracket}>{'{'}</span></>, type: 'code' },
  { text: <><span style={SYNTAX.keyword}>    return new</span> <span style={SYNTAX.entity}>Algorithm</span><span style={SYNTAX.bracket}>({'{'}</span> <span style={SYNTAX.property}>style</span><span style={SYNTAX.bracket}>:</span> <span style={SYNTAX.string}>"Pure Art"</span> <span style={SYNTAX.bracket}>{'}'});</span></>, type: 'code' },
  { text: <><span style={SYNTAX.bracket}>  {'}'}</span></>, type: 'code' },
  { text: '', type: 'empty' },
  { text: <><span style={SYNTAX.keyword}>  public</span> <span style={SYNTAX.property}>stack</span><span style={SYNTAX.bracket}>:</span> <span style={SYNTAX.entity}>Tech[]</span> <span style={SYNTAX.bracket}>= [</span></>, type: 'code' },
  { text: <><span style={SYNTAX.string}>    "React"</span><span style={SYNTAX.bracket}>,</span> <span style={SYNTAX.string}>"Three.js"</span><span style={SYNTAX.bracket}>,</span> <span style={SYNTAX.string}>"GSAP"</span></>, type: 'code' },
  { text: <><span style={SYNTAX.bracket}>  ];</span></>, type: 'code' },
  { text: '', type: 'empty' },
  { text: <><span style={SYNTAX.keyword}>  public</span> <span style={SYNTAX.method}>execute</span><span style={SYNTAX.bracket}>():</span> <span style={SYNTAX.entity}>void</span> <span style={SYNTAX.bracket}>{'{'}</span></>, type: 'code' },
  { text: <><span style={SYNTAX.entity}>    System</span><span style={SYNTAX.bracket}>.</span><span style={SYNTAX.method}>override</span><span style={SYNTAX.bracket}>(</span><span style={SYNTAX.entity}>DOM</span><span style={SYNTAX.bracket}>.</span><span style={SYNTAX.property}>rules</span><span style={SYNTAX.bracket}>);</span></>, type: 'code' },
  { text: <><span style={SYNTAX.keyword}>    this</span><span style={SYNTAX.bracket}>.</span><span style={SYNTAX.method}>startShowing</span><span style={SYNTAX.bracket}>();</span></>, type: 'code' },
  { text: <><span style={SYNTAX.bracket}>  {'}'}</span></>, type: 'code' },
  { text: <><span style={SYNTAX.bracket}>{'}'}</span></>, type: 'code' },
]

// ── Data Core Scene ──

// ── Component ──
export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const bgWrapperRef = useRef<HTMLDivElement>(null)
  const scrollProgressRef = useRef(0)
  const cursorRef = useRef<HTMLDivElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const stageRefs = useRef<(HTMLDivElement | null)[]>([])
  const ideLineRefs = useRef<(HTMLDivElement | null)[]>([])
  
  const setStageRef = useCallback((i: number) => (el: HTMLDivElement | null) => { stageRefs.current[i] = el }, [])
  const setIdeRef = useCallback((i: number) => (el: HTMLDivElement | null) => { ideLineRefs.current[i] = el }, [])
  
  const prefersReducedMotion = usePrefersReducedMotion()

  // Spotlight mouse effect
  useEffect(() => {
    if (prefersReducedMotion) return
    const onMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = '1'
        spotlightRef.current.style.left = `${e.clientX}px`
        spotlightRef.current.style.top = `${e.clientY}px`
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [prefersReducedMotion])

  useGSAP(() => {
    if (!pinRef.current || !sectionRef.current) return

    if (bgWrapperRef.current && !prefersReducedMotion) {
      gsap.fromTo(bgWrapperRef.current, 
        { opacity: 0 }, 
        { opacity: 1, 
          ease: 'power1.inOut', 
          scrollTrigger: {
             trigger: '#global-scroll-track',
             start: '12% top', 
             end: '16% top',
             scrub: true
          }
        }
      )
    }
    
    // Manage Pointer Events and Exit Opacity
    ScrollTrigger.create({
      trigger: '#global-scroll-track',
      start: '12% top',
      end: '40% top',
      onUpdate: (self) => {
         if (sectionRef.current) {
            sectionRef.current.style.pointerEvents = (self.progress > 0 && self.progress < 0.95) ? 'auto' : 'none'
         }
      }
    })

    // Entry Transition (12% to 16%)
    gsap.fromTo(sectionRef.current, 
       { clipPath: 'circle(0% at 50% 50%)', opacity: 0 }, 
       { clipPath: 'circle(150% at 50% 50%)', opacity: 1, ease: 'power2.inOut', 
         scrollTrigger: { trigger: '#global-scroll-track', start: '12% top', end: '16% top', scrub: true } 
       }
    )

    // Exit Transition (40% to 42%)
    gsap.fromTo(sectionRef.current, 
       { opacity: 1 }, 
       { opacity: 0, ease: 'power2.inOut', immediateRender: false,
         scrollTrigger: { trigger: '#global-scroll-track', start: '40% top', end: '42% top', scrub: true } 
       }
    )


    if (prefersReducedMotion) {
      gsap.set(stageRefs.current, { opacity: 0 })
      gsap.set(stageRefs.current[0], { opacity: 1 })
      return
    }

    // Initialize first stage setup independently from scrub timeline
    gsap.set(stageRefs.current, { opacity: 0, pointerEvents: 'none' })
    gsap.set(stageRefs.current[0], { opacity: 1, pointerEvents: 'auto' })
    gsap.set(ideLineRefs.current, { opacity: 0.3 })

    const firstSlide = ABOUT_SLIDES[0]
    gsap.set(cursorRef.current, { 
      top: (firstSlide.startLine - 1) * LINE_HEIGHT, 
      height: (firstSlide.endLine - firstSlide.startLine + 1) * LINE_HEIGHT 
    })

    // Setup Magnetic Text Effect
    if (!prefersReducedMotion) {
      const wrappers = gsap.utils.toArray<HTMLElement>('.word-wrapper')
      wrappers.forEach(wrapper => {
        const word = wrapper.querySelector('.stage-word')
        if (!word) return
        
        const onMouseMove = (e: MouseEvent) => {
          const rect = wrapper.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          const distanceX = e.clientX - centerX
          const distanceY = e.clientY - centerY
          
          gsap.to(word, {
            x: distanceX * 0.3,
            y: distanceY * 0.3,
            scale: 1.05,
            rotation: distanceX * 0.05,
            color: '#00e5ff',
            duration: 0.6,
            ease: 'expo.out',
            overwrite: 'auto' // ensure previous leaving animation doesn't conflict
          })
        }
        
        const onMouseLeave = () => {
          gsap.to(word, { 
            x: 0, 
            y: 0, 
            scale: 1, 
            rotation: 0, 
            color: '', // reverts to inline style color
            duration: 1.2, 
            ease: 'elastic.out(1.2, 0.4)',
            overwrite: 'auto'
          })
        }
        
        wrapper.addEventListener('mousemove', onMouseMove)
        wrapper.addEventListener('mouseleave', onMouseLeave)
      })
    }

    // Intro Animations when scrolling into the section
    const stage0 = stageRefs.current[0]
    if (stage0) {
      const numberEl = stage0.querySelector('.bg-number')
      const words = stage0.querySelectorAll('.stage-word')
      const subEl = stage0.querySelector('.stage-sub')

      gsap.fromTo(words, { y: 60 }, {
        y: 0, duration: 0.8, stagger: 0.05, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '#global-scroll-track', start: '14% top', toggleActions: "play none none reverse" }
      })
      gsap.fromTo(numberEl, { y: 100, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: '#global-scroll-track', start: '14% top', toggleActions: "play none none reverse" }
      })
      gsap.fromTo(subEl, { x: -30, opacity: 0 }, {
        x: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3,
        scrollTrigger: { trigger: '#global-scroll-track', start: '14% top', toggleActions: "play none none reverse" }
      })
      gsap.to(ideLineRefs.current.slice(firstSlide.startLine - 1, firstSlide.endLine), {
        opacity: 1, duration: 0.5,
        scrollTrigger: { trigger: '#global-scroll-track', start: '14% top', toggleActions: "play none none reverse" }
      })
    }

    const switchToGrid = () => {
      document.documentElement.style.setProperty('--p-flash', '1')
      setTimeout(() => document.documentElement.style.setProperty('--p-flash', '0'), 150)
      
      const currentMorph = parseFloat(document.documentElement.style.getPropertyValue('--p-morph') || '0')
      const currentScale = parseFloat(document.documentElement.style.getPropertyValue('--p-scale') || '0.7')
      const currentZ = parseFloat(document.documentElement.style.getPropertyValue('--p-z') || '0')
      const currentOpacity = parseFloat(document.documentElement.style.getPropertyValue('--p-opacity') || '1')
      
      const proxy = { morph: currentMorph, scale: currentScale, z: currentZ, opacity: currentOpacity }
      gsap.to(proxy, {
          morph: 2.0, // Force Grid Phase
          scale: 2.5, // Gigantic layout to wrap IDE
          z: -10, // Back off to behave as background
          opacity: 0.15, // Extremely faint subtle dust
          duration: 2.0, 
          ease: 'expo.out',
          overwrite: 'auto',
          onUpdate: () => {
              document.documentElement.style.setProperty('--p-morph', String(proxy.morph))
              document.documentElement.style.setProperty('--p-scale', String(proxy.scale))
              document.documentElement.style.setProperty('--p-z', String(proxy.z))
              document.documentElement.style.setProperty('--p-opacity', String(proxy.opacity))
          }
      })
    }
    
    const revertToHero = () => {
      const currentMorph = parseFloat(document.documentElement.style.getPropertyValue('--p-morph') || '2.0')
      const currentScale = parseFloat(document.documentElement.style.getPropertyValue('--p-scale') || '2.5')
      
      const proxy = { morph: currentMorph, scale: currentScale, z: -10, opacity: 0.15 }
      gsap.to(proxy, {
          morph: 0, // Force Sphere
          scale: 0.7, // End of Hero scaling
          z: 0,
          opacity: 1.0,
          duration: 1.5, 
          ease: 'power3.inOut',
          overwrite: 'auto',
          onUpdate: () => {
              document.documentElement.style.setProperty('--p-morph', String(proxy.morph))
              document.documentElement.style.setProperty('--p-scale', String(proxy.scale))
              document.documentElement.style.setProperty('--p-z', String(proxy.z))
              document.documentElement.style.setProperty('--p-opacity', String(proxy.opacity))
          }
      })
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#global-scroll-track',
        start: '16% top',
        end: '40% top',
        scrub: 1,
        onEnter: switchToGrid,
        onEnterBack: switchToGrid,
        onLeaveBack: revertToHero,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress
          
          // --- GLOBAL PARTICLE TRACKING ---
          // Pan the grid mechanically based on scroll reading
          document.documentElement.style.setProperty('--p-x', String(-self.progress * 12))
          document.documentElement.style.setProperty('--p-y', String(-5 + self.progress * 10))
          
          if (!prefersReducedMotion) {
            // Apply a slight physical skew to all text stages based on scroll velocity
            const velocity = self.getVelocity()
            gsap.to(stageRefs.current, {
              skewY: velocity / -1000, // adjust divisor for intensity
              y: velocity / 500,
              ease: 'power3.out',
              duration: 0.5,
              overwrite: 'auto'
            })
          }
        }
      }
    })

    const slideCount = ABOUT_SLIDES.length
    for (let i = 0; i < slideCount - 1; i++) {
        const slide = ABOUT_SLIDES[i]
        const nextSlide = ABOUT_SLIDES[i + 1]
        
        const stageEl = stageRefs.current[i]
        const nextStageEl = stageRefs.current[i + 1]
        
        if (!stageEl || !nextStageEl) continue

        const words = stageEl.querySelectorAll('.stage-word')
        const numberEl = stageEl.querySelector('.bg-number')
        const subEl = stageEl.querySelector('.stage-sub')

        const nextWords = nextStageEl.querySelectorAll('.stage-word')
        const nextNumberEl = nextStageEl.querySelector('.bg-number')
        const nextSubEl = nextStageEl.querySelector('.stage-sub')
        
        const exitTime = i * 2 + 1
        const enterTime = exitTime + 0.5
        
        // 1. Move cursor & toggle IDE code opacity
        tl.to(cursorRef.current, { 
            top: (nextSlide.startLine - 1) * LINE_HEIGHT, 
            height: (nextSlide.endLine - nextSlide.startLine + 1) * LINE_HEIGHT,
            duration: 1, 
            ease: 'expo.inOut' 
        }, exitTime)
        
        tl.to(ideLineRefs.current.slice(slide.startLine - 1, slide.endLine), 
          { opacity: 0.3, duration: 0.5 }, exitTime)
          
        tl.to(ideLineRefs.current.slice(nextSlide.startLine - 1, nextSlide.endLine), 
          { opacity: 1, duration: 0.5 }, enterTime)
        
        // 2. FADE OUT current stage with downward stagger & parallax
        tl.to(words, { y: 60, opacity: 0, stagger: { amount: 0.15, from: "end" }, ease: 'power2.in', duration: 0.5 }, exitTime)
        tl.to(numberEl, { y: 60, opacity: 0, ease: 'power3.in', duration: 0.5 }, exitTime)
        tl.to(subEl, { opacity: 0, x: -20, ease: 'power2.in', duration: 0.4 }, exitTime)
        
        // Hide old stage, show new stage containers (to prevent invisible animating text or lingering hitboxes)
        tl.set(stageEl, { opacity: 0, pointerEvents: 'none' }, exitTime + 0.5)
        tl.set(nextStageEl, { opacity: 1, pointerEvents: 'auto' }, exitTime + 0.5)
        
        // 3. FADE IN next stage with upward staggering
        // Since these are explicitly initially invisible, we can use fromTo but with immediateRender: false
        tl.fromTo(nextWords, { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, ease: 'back.out(1.7)', duration: 0.8, immediateRender: false }, enterTime)
        tl.fromTo(nextNumberEl, { y: 100, opacity: 0 }, { y: 0, opacity: 1, ease: 'power3.out', duration: 1, immediateRender: false }, enterTime)
        tl.fromTo(nextSubEl, { x: 30, opacity: 0 }, { x: 0, opacity: 1, ease: 'power2.out', duration: 0.8, immediateRender: false }, enterTime + 0.2)
    }

  }, { scope: sectionRef, dependencies: [prefersReducedMotion] })

  return (
    <section ref={sectionRef} id="about" className="absolute inset-0 z-[2] w-full h-full pointer-events-none" style={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}>
      
      {/* GLOBAL BACKGROUND FOR ABOUT SECTION */}
      <div ref={bgWrapperRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        
        {/* 1. Cosmic Nebula Background */}
        {!prefersReducedMotion && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1], x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', top: '10%', left: '20%', width: '50vw', height: '50vw',
                background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
                opacity: 0.08, filter: 'blur(80px)', borderRadius: '50%',
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.5, 1], x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', bottom: '10%', right: '10%', width: '60vw', height: '60vw',
                background: 'radial-gradient(circle, var(--accent-magenta) 0%, transparent 70%)',
                opacity: 0.08, filter: 'blur(100px)', borderRadius: '50%',
              }}
            />
          </div>
        )}

        {/* 2. Particle Background placeholder (handled globally now) */}
        {!prefersReducedMotion && (
          <div className="absolute inset-0 z-[-1]" />
        )}

        {/* 3. Mouse Spotlight */}
        {!prefersReducedMotion && (
          <div 
            ref={spotlightRef}
            style={{ 
              position: 'fixed', top: '-1000px', left: '-1000px', width: '800px', height: '800px', 
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(0, 212, 255, 0.05) 0%, transparent 60%)',
              mixBlendMode: 'screen', opacity: 0
            }} 
          />
        )}
      </div>

      {/* Viewport */}
      <div
        ref={pinRef}
        className="flex flex-col w-full h-full relative"
        style={{ zIndex: 2 }}
      >
        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center w-full max-w-[1400px] mx-auto px-6 py-12 lg:p-16 gap-8 lg:gap-16 relative z-10">
          
          {/* Left Side: IDE Compiler */}
          <div className="ide-container w-full lg:w-1/2 min-w-[300px] lg:max-w-none max-w-[600px] bg-[#0a0a0c]/80 border border-white/5 rounded-xl backdrop-blur-xl relative overflow-hidden shadow-[0_0_50px_rgba(0,212,255,0.05)] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            
            {/* Mac Title Bar */}
            <div className="flex items-center px-4 py-3 border-b border-white/5 bg-white/[0.02]">
               <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                 <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                 <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
               </div>
               <div className="flex-1 text-center text-white/30 text-[10px] sm:text-xs font-mono tracking-wider pr-10">
                 ~/src/class/Matteo.ts
               </div>
            </div>

            {/* IDE Content */}
            <div className="relative py-6 lg:py-8 flex-1">
              {/* Animated Highlight Cursor */}
              <div ref={cursorRef} className="absolute left-0 w-full bg-gradient-to-r from-cyan-400/10 to-transparent border-l-[3px] border-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.3)] pointer-events-none transition-none" />
              
              <div className="relative z-10 font-mono text-[11px] sm:text-[12px] lg:text-[13px]" style={{ lineHeight: `${LINE_HEIGHT}px` }}>
                {IDE_LINES.map((line, i) => (
                  <div key={i} ref={setIdeRef(i)} className="flex px-4 lg:px-6 opacity-30 transition-opacity duration-300">
                    <span className="w-8 lg:w-10 text-white/20 select-none text-right pr-3 lg:pr-4">{i + 1}</span>
                    <span className="text-white/90 whitespace-pre overflow-hidden text-ellipsis w-full">{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Output Visuals */}
          <div className="output-container w-full lg:w-1/2 relative h-[250px] lg:h-[400px] max-w-[600px] lg:max-w-none">
            
            {ABOUT_SLIDES.map((slide, index) => {
              const tokens = tokenizePhrase(slide.phrase)
              return (
              <div key={index} ref={setStageRef(index)} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* Giant Background Number */}
                <span className="bg-number absolute top-1/2 left-0 -translate-y-1/2 text-[20vw] lg:text-[14vw] font-display font-black text-white/[0.02] select-none pointer-events-none mix-blend-overlay">
                  0{index + 1}
                </span>

                <div className="relative z-10 flex flex-col gap-6">
                  <h2 className="font-display text-[clamp(40px,5vw,64px)] leading-[1.05] tracking-tight m-0 mix-blend-normal">
                    {tokens.map((token) => (
                      <span key={token.index} className="word-wrapper" style={{ display: 'inline-block', overflow: 'visible', verticalAlign: 'bottom', paddingRight: '0.2em', paddingBottom: '0.1em' }}>
                        <span className="stage-word" style={{ 
                          display: 'inline-block',
                          color: token.accent ? 'var(--accent)' : 'inherit', 
                          textShadow: token.accent ? '0 0 25px rgba(0,212,255,0.4), 0 0 50px rgba(0,212,255,0.1)' : 'none',
                        }}>
                          {token.word}
                        </span>
                      </span>
                    ))}
                  </h2>
                  <div className="stage-sub flex gap-4 items-start relative before:absolute before:left-0 before:top-2 before:-bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-cyan-400 before:to-transparent before:opacity-70">
                    <p className="font-mono text-[clamp(13px,1.2vw,14px)] leading-relaxed text-white/60 m-0 max-w-[480px] pl-5">
                      {slide.sub}
                    </p>
                  </div>
                </div>
              </div>
            )})}

          </div>

        </div>
      </div>
    </section>
  )
}
