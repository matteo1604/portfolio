import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { EASING, DURATION } from '@/lib/animations'
import { scrollToSection } from '@/lib/lenis'
import { useState } from 'react'

gsap.registerPlugin(ScrollTrigger)

const TAGLINE_WORDS = ["I don't build websites.", 'I build experiences.'] as const

const ScrambleText = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState(text.replace(/./g, '_'))
  
  useEffect(() => {
    let iter = 0
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_'
    const interval = setInterval(() => {
      setDisplay(text.split('').map((c, i) => {
        if (i < iter) return c
        if (c === ' ') return ' '
        return chars[Math.floor(Math.random() * chars.length)]
      }).join(''))
      if (iter >= text.length) clearInterval(interval)
      iter += 1 / 3
    }, 30)
    return () => clearInterval(interval)
  }, [text])
  
  return <>{display}</>
}

export function HeroSection() {
  const sectionRef         = useRef<HTMLElement>(null)
  const contentRef         = useRef<HTMLDivElement>(null)
  const subtitleRef        = useRef<HTMLDivElement>(null)
  const taglineRef         = useRef<HTMLParagraphElement>(null)
  const taglineWordsRef    = useRef<(HTMLSpanElement | null)[]>([])
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const scrollLineRef      = useRef<HTMLDivElement>(null)
  const ctaWrapperRef      = useRef<HTMLDivElement>(null)      // GSAP: entry + scroll exit
  const hudTopLeftRef      = useRef<HTMLDivElement>(null)
  const hudTopRightRef     = useRef<HTMLDivElement>(null)
  const hudBottomLeftRef   = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isDesktop = !isMobile

  // ── Wait for --hero-animation-complete then run entry timeline ──────────
  useGSAP(
    () => {
      const hudEls = [hudTopLeftRef.current, hudTopRightRef.current, hudBottomLeftRef.current]

      if (prefersReducedMotion) {
        gsap.set(
          [subtitleRef.current, taglineRef.current, scrollIndicatorRef.current, ctaWrapperRef.current, ...hudEls],
          { opacity: 1, y: 0 },
        )
        gsap.set(taglineWordsRef.current.filter(Boolean), { opacity: 1, y: 0 })
        return
      }

      const runEntryTimeline = () => {
        const tl = gsap.timeline()

        tl.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.normal,
            ease: `cubic-bezier(${EASING.smooth.join(',')})`,
          },
        )

        tl.to(taglineRef.current, { opacity: 1, duration: 0.01 }, '-=0.2')

        tl.fromTo(
          taglineWordsRef.current.filter(Boolean),
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.normal,
            ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
            stagger: 0.18,
          },
          '<',
        )

        tl.fromTo(
          hudEls.filter(Boolean),
          { opacity: 0 },
          {
            opacity: 1,
            duration: DURATION.slow,
            ease: 'power2.out',
            stagger: 0.12,
          },
          '-=0.4',
        )

        tl.fromTo(
          scrollIndicatorRef.current,
          { opacity: 0 },
          { opacity: 1, duration: DURATION.normal, ease: 'power2.out' },
          '-=0.3',
        )

        tl.fromTo(
          ctaWrapperRef.current,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.normal,
            ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
          },
          '-=0.2',
        )

        if (scrollLineRef.current) {
          gsap.fromTo(
            scrollLineRef.current,
            { scaleY: 0.4, opacity: 0.2, transformOrigin: 'top center' },
            { scaleY: 1, opacity: 0.8, duration: 2.2, repeat: -1, yoyo: true, ease: 'power2.inOut' },
          )
        }
      }

      let rafId: number
      const poll = () => {
        const done = getComputedStyle(document.documentElement)
          .getPropertyValue('--hero-animation-complete').trim()
        if (done === '1') {
          runEntryTimeline()
        } else {
          rafId = requestAnimationFrame(poll)
        }
      }
      rafId = requestAnimationFrame(poll)
      return () => cancelAnimationFrame(rafId)
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  // ── Scroll exit ─────────────────────────────────────────────────────────
  useGSAP(
    () => {
      if (!sectionRef.current) return

      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: '0% top',
        end: '20% top',
        scrub: true,
        onUpdate: (self) => {
          document.documentElement.style.setProperty('--hero-progress', String(self.progress))
          document.documentElement.style.setProperty('--hero-progress-pct', `${self.progress * 100}%`)
          
          if (sectionRef.current) {
             sectionRef.current.style.pointerEvents = self.progress > 0.95 ? 'none' : 'auto'
          }
          
          // --- GLOBAL PARTICLE TRACKING ---
          // Hero owns the scroll from 0 to 1.
          document.documentElement.style.setProperty('--p-y', String(self.progress * -15)) // Move down
          document.documentElement.style.setProperty('--p-scale', String(1.0 - self.progress * 0.3)) // Scale down slightly
          // Hero is strictly the initial Sphere (Morph state 0)
          document.documentElement.style.setProperty('--p-morph', '0')
          document.documentElement.style.setProperty('--p-opacity', '1')
          
          if (!prefersReducedMotion) {
            const velocity = self.getVelocity()
            gsap.to([contentRef.current, ctaWrapperRef.current], {
              skewY: velocity / -1000,
              ease: 'power3.out',
              duration: 0.5,
              overwrite: 'auto'
            })
          }
        },
        onLeaveBack: () => {
          document.documentElement.style.setProperty('--hero-progress', '0')
          document.documentElement.style.setProperty('--hero-progress-pct', '0%')
          document.documentElement.style.setProperty('--p-y', '0')
          document.documentElement.style.setProperty('--p-scale', '1')
        },
      })

      if (prefersReducedMotion) return
      
      // Setup Magnetic Text Effect
      const wrappers = document.querySelectorAll('.hero-magnetic-wrapper')
      wrappers.forEach(wrapper => {
        const target = wrapper.querySelector('.hero-magnetic-target')
        if (!target) return
        
        const onMouseMove = (e: Event) => {
          const mouseEvent = e as MouseEvent
          const rect = wrapper.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          const distanceX = mouseEvent.clientX - centerX
          const distanceY = mouseEvent.clientY - centerY
          
          gsap.to(target, {
            x: distanceX * 0.3,
            y: distanceY * 0.3,
            scale: 1.05,
            rotation: distanceX * 0.05,
            color: '#00e5ff',
            duration: 0.6,
            ease: 'expo.out',
            overwrite: 'auto'
          })
        }
        
        const onMouseLeave = () => {
          gsap.to(target, { 
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

      gsap.to(contentRef.current, {
        opacity: 0,
        scale: 1.1,
        y: -40,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: '#global-scroll-track',
          start: '0% top',
          end: '15% top',
          scrub: true,
        },
      })

      const ctaEl = ctaWrapperRef.current
      if (ctaEl) {
        gsap.to(ctaEl, {
          opacity: 0,
          ease: 'power2.in',
          scrollTrigger: {
            trigger: '#global-scroll-track',
            start: '0% top',
            end: '10% top',
            scrub: true,
          },
        })
      }

      const hudEls = [hudTopLeftRef.current, hudTopRightRef.current, hudBottomLeftRef.current].filter(Boolean)
      if (hudEls.length) {
        gsap.to(hudEls, {
          opacity: 0,
          ease: 'power2.in',
          scrollTrigger: {
            trigger: '#global-scroll-track',
            start: '0% top',
            end: '10% top',
            scrub: true,
          },
        })
      }
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--hero-animation-complete')
      document.documentElement.style.removeProperty('--hero-progress')
      document.documentElement.style.removeProperty('--hero-progress-pct')
    }
  }, [])

  return (
    <>
      {prefersReducedMotion && (
        // ── Reduced motion: static left-aligned layout ─────────────────
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundColor: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: '8vw',
          }}
          aria-hidden="true"
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-hero)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            MATTEO<br />
            <span style={{ paddingLeft: '1.5ch' }}>RAINERI</span>
          </h1>
        </div>
      )}

      <section
        ref={sectionRef}
        id="hero"
        aria-label="Hero"
        className="absolute inset-0 z-[1] flex flex-col pointer-events-auto"
        style={{ paddingBottom: 'clamp(4rem, 8vh, 6rem)' }}
      >
        {/* ── HUD (desktop only) ─────────────────────────────────────── */}
        {isDesktop && (
          <>
            <div
              ref={hudTopLeftRef}
              style={{
                position: 'absolute',
                top: 'clamp(1.5rem, 3vh, 2.5rem)',
                left: 'clamp(1.5rem, 3vw, 2.5rem)',
                opacity: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-secondary)', opacity: 0.6 }}>
                45°28′N 9°10′E
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent)', opacity: 0.5 }}>
                MILANO, IT
              </span>
            </div>

            <div
              ref={hudTopRightRef}
              style={{
                position: 'absolute',
                top: 'clamp(1.5rem, 3vh, 2.5rem)',
                right: 'clamp(1.5rem, 3vw, 2.5rem)',
                opacity: 0,
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                alignItems: 'flex-end',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--text-secondary)', opacity: 0.6 }}>
                © 2025
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent)', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#00FF88', display: 'inline-block', boxShadow: '0 0 8px #00FF88' }} />
                AVAILABLE FOR WORK
              </span>
            </div>

            {/* Bottom-left: scroll progress bar */}
            <div
              ref={hudBottomLeftRef}
              style={{
                position: 'absolute',
                bottom: 'clamp(1.5rem, 3vh, 2.5rem)',
                left: 'clamp(1.5rem, 3vw, 2.5rem)',
                opacity: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div style={{ width: '4px', height: '3rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '100%',
                    height: 'var(--hero-progress-pct, 0%)',
                    backgroundColor: 'var(--accent)',
                    opacity: 0.6,
                    transition: 'height 0.1s linear',
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Main content: subtitle + tagline, bottom-left ───────────── */}
        <div
          ref={contentRef}
          style={{
            position: 'absolute',
            bottom: 'clamp(1.5rem, 3vh, 2rem)',
            left: 'clamp(3.5rem, 5vw, 4.5rem)',
            // No background or borders, just clean floating text like a terminal
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxWidth: '420px',
            pointerEvents: 'none',
          }}
        >
          {/* Terminal line */}
          <div
            ref={subtitleRef}
            className="hero-magnetic-wrapper"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', opacity: 0, position: 'relative', zIndex: 2, pointerEvents: 'auto', padding: '0.5rem 0' }}
          >
            <span className="hero-magnetic-target" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', color: 'var(--accent-magenta)', opacity: 0.9 }}>
                &gt;
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                COMPUTER ENGINEERING · FRONTEND &amp; CREATIVE DEV
              </span>
              <span
                className="hero-cursor"
                style={{ display: 'inline-block', width: '2px', height: '1.1em', backgroundColor: 'var(--accent)' }}
              />
            </span>
          </div>

          {/* Tagline */}
          <p
            ref={taglineRef}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              fontWeight: 500,
              letterSpacing: '0.05em',
              color: 'var(--accent)',
              margin: 0,
              opacity: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4em',
              textShadow: '0 0 8px rgba(0, 212, 255, 0.4)',
              textTransform: 'uppercase',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {TAGLINE_WORDS.map((word, i) => (
              <span
                key={word}
                ref={(el) => { taglineWordsRef.current[i] = el }}
                className="hero-magnetic-wrapper"
                style={{ display: 'block', opacity: 0, transform: 'translateY(12px)', pointerEvents: 'auto', paddingLeft: '2px' }}
              >
                <div className="hero-magnetic-target" style={{ display: 'inline-block' }}>
                  <ScrambleText text={word} />
                </div>
              </span>
            ))}
          </p>
        </div>

        {/* ── Scroll indicator + CTA: bottom-right ───────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: 'clamp(1.5rem, 3vh, 2rem)',
            right: 'clamp(1.5rem, 3vw, 2.5rem)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 'var(--space-lg)',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          {/* Scroll indicator */}
          <div
            ref={scrollIndicatorRef}
            className="flex flex-col items-center gap-2 opacity-0"
            aria-label="Scroll down"
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '3px', color: 'var(--text-secondary)', opacity: 0.8 }}>
              SCROLL
            </span>
            <div
              ref={scrollLineRef}
              className="w-px"
              style={{ height: '44px', background: 'linear-gradient(to bottom, var(--accent), transparent)' }}
            />
          </div>

          {/* CTA button — Holographic Hollow styled */}
          <div ref={ctaWrapperRef} className="hero-magnetic-wrapper" style={{ opacity: 0 }}>
            <motion.button
              className="hero-magnetic-target"
              onClick={() => scrollToSection('#contact')}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.15em',
                color: 'var(--accent)',
                backgroundColor: 'rgba(0, 212, 255, 0.03)',
                border: '1px solid var(--accent)',
                padding: '1rem 2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.2) inset, 0 0 20px rgba(0, 212, 255, 0.2)',
              }}
              whileHover={{
                backgroundColor: 'var(--accent)',
                color: 'var(--bg-primary)',
                boxShadow: '0 0 30px rgba(0, 212, 255, 0.6) inset, 0 0 40px rgba(0, 212, 255, 0.6)',
              }}
              transition={{ duration: 0.3 }}
            >
              <span style={{ opacity: 0.6, fontWeight: 700 }}>//</span>
              <span>INITIATE_CONTACT</span>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                style={{ fontWeight: 700 }}
              >
                _
              </motion.span>
            </motion.button>
          </div>
        </div>
      </section>
    </>
  )
}
