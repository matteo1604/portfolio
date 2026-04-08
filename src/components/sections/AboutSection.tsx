import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { ABOUT_SLIDES, tokenizePhrase } from '@/data/about-slides'
gsap.registerPlugin(ScrollTrigger)

const SECTION_HEIGHT = '300vh'
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

// ── Particle Canvas ──
interface Particle {
  x: number; y: number; vx: number; vy: number; radius: number; opacity: number;
}
function createParticles(w: number, h: number, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      radius: 1 + Math.random() * 1.5, opacity: 0.08 + Math.random() * 0.12,
    })
  }
  return particles
}
function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>, reducedMotion: boolean) {
  useEffect(() => {
    if (reducedMotion || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number, w = 0, h = 0, particles: Particle[] = []
    
    const mouse = { x: -1000, y: -1000 }
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top
    }
    const onMouseLeave = () => { mouse.x = -1000; mouse.y = -1000 }
    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      w = rect.width; h = rect.height
      canvas.width = w * devicePixelRatio; canvas.height = h * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      particles = createParticles(w, h, 40)
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        
        const dx = p.x - mouse.x, dy = p.y - mouse.y, distSq = dx * dx + dy * dy
        if (distSq < 20000) {
           const force = (20000 - distSq) / 20000
           p.x += dx * force * 0.08; p.y += dy * force * 0.08
        }

        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`
        ctx.fill()
      }
      
      ctx.lineWidth = 0.3
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - dist / 120) * 0.04})`
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [canvasRef, reducedMotion])
}

// ── Component ──
export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const bgWrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const stageRefs = useRef<(HTMLDivElement | null)[]>([])
  const ideLineRefs = useRef<(HTMLDivElement | null)[]>([])
  
  const setStageRef = useCallback((i: number) => (el: HTMLDivElement | null) => { stageRefs.current[i] = el }, [])
  const setIdeRef = useCallback((i: number) => (el: HTMLDivElement | null) => { ideLineRefs.current[i] = el }, [])
  
  const prefersReducedMotion = usePrefersReducedMotion()
  
  useParticleCanvas(canvasRef, prefersReducedMotion)

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

    // Animate the fixed background crossfade
    if (bgWrapperRef.current && !prefersReducedMotion) {
      gsap.fromTo(bgWrapperRef.current, 
        { opacity: 0 }, 
        { opacity: 1, 
          ease: 'power1.inOut', 
          scrollTrigger: {
             trigger: sectionRef.current,
             start: 'top 80%', 
             end: 'top 20%',
             scrub: true
          }
        }
      )
    }

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

    // Intro Animations when scrolling into the section
    const stage0 = stageRefs.current[0]
    if (stage0) {
      const numberEl = stage0.querySelector('.bg-number')
      const words = stage0.querySelectorAll('.stage-word')
      const subEl = stage0.querySelector('.stage-sub')

      gsap.fromTo(words, { y: 60 }, {
        y: 0, duration: 0.8, stagger: 0.05, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 60%', toggleActions: "play none none reverse" }
      })
      gsap.fromTo(numberEl, { y: 100, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 60%', toggleActions: "play none none reverse" }
      })
      gsap.fromTo(subEl, { x: -30, opacity: 0 }, {
        x: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 60%', toggleActions: "play none none reverse" }
      })
      gsap.to(ideLineRefs.current.slice(firstSlide.startLine - 1, firstSlide.endLine), {
        opacity: 1, duration: 0.5,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 60%', toggleActions: "play none none reverse" }
      })
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        pin: pinRef.current,
        pinSpacing: false,
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
        tl.fromTo(cursorRef.current, { 
            top: (slide.startLine - 1) * LINE_HEIGHT, 
            height: (slide.endLine - slide.startLine + 1) * LINE_HEIGHT
        }, { 
            top: (nextSlide.startLine - 1) * LINE_HEIGHT, 
            height: (nextSlide.endLine - nextSlide.startLine + 1) * LINE_HEIGHT,
            duration: 1, 
            ease: 'expo.inOut' 
        }, exitTime)
        
        tl.fromTo(ideLineRefs.current.slice(slide.startLine - 1, slide.endLine), 
          { opacity: 1 }, { opacity: 0.3, duration: 0.5 }, exitTime)
          
        tl.fromTo(ideLineRefs.current.slice(nextSlide.startLine - 1, nextSlide.endLine), 
          { opacity: 0.3 }, { opacity: 1, duration: 0.5 }, enterTime)
        
        // 2. FADE OUT current stage with downward stagger & parallax
        tl.fromTo(words, { y: 0, opacity: 1 }, { y: 60, opacity: 0, stagger: { amount: 0.15, from: "end" }, ease: 'power2.in', duration: 0.5 }, exitTime)
        tl.fromTo(numberEl, { y: 0, opacity: 1 }, { y: 60, opacity: 0, ease: 'power3.in', duration: 0.5 }, exitTime)
        tl.fromTo(subEl, { x: 0, opacity: 1 }, { opacity: 0, x: -20, ease: 'power2.in', duration: 0.4 }, exitTime)
        
        // Hide old stage, show new stage containers (to prevent invisible animating text or lingering hitboxes)
        tl.set(stageEl, { opacity: 0, pointerEvents: 'none' }, exitTime + 0.5)
        tl.set(nextStageEl, { opacity: 1, pointerEvents: 'auto' }, exitTime + 0.5)
        
        // 3. FADE IN next stage with upward staggering
        tl.fromTo(nextWords, { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, ease: 'back.out(1.7)', duration: 0.8 }, enterTime)
        tl.fromTo(nextNumberEl, { y: 100, opacity: 0 }, { y: 0, opacity: 1, ease: 'power3.out', duration: 1 }, enterTime)
        tl.fromTo(nextSubEl, { x: 30, opacity: 0 }, { x: 0, opacity: 1, ease: 'power2.out', duration: 0.8 }, enterTime + 0.2)
    }

  }, { scope: sectionRef, dependencies: [prefersReducedMotion] })

  return (
    <section ref={sectionRef} id="about" style={{ height: SECTION_HEIGHT, position: 'relative' }}>
      
      {/* GLOBAL FIXED BACKGROUND FOR ABOUT SECTION */}
      {/* We use a fixed wrapper and fade it in via GSAP to prevent any sliding hard edges! */}
      <div ref={bgWrapperRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        
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

        {/* 2. Particle Background */}
        {!prefersReducedMotion && (
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
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

      {/* Pinned Viewport */}
      <div
        ref={pinRef}
        className="flex flex-col w-full relative"
        style={{ height: '100vh', zIndex: 2 }}
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
                      <span key={token.index} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingRight: '0.2em', paddingBottom: '0.1em' }}>
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
