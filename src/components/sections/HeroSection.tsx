import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { EASING, DURATION } from '@/lib/animations'
import { scrollToSection } from '@/lib/lenis'
import { HeroCanvas } from '@/components/three/HeroCanvas'

gsap.registerPlugin(ScrollTrigger)

const TAGLINE_WORDS = ["I don't build websites.", 'I build experiences.'] as const

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
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          document.documentElement.style.setProperty('--hero-progress', String(self.progress))
          document.documentElement.style.setProperty('--hero-progress-pct', `${self.progress * 100}%`)
        },
        onLeaveBack: () => {
          document.documentElement.style.setProperty('--hero-progress', '0')
          document.documentElement.style.setProperty('--hero-progress-pct', '0%')
        },
      })

      if (prefersReducedMotion) return

      gsap.to(contentRef.current, {
        opacity: 0,
        y: -40,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '40% top',
          scrub: true,
        },
      })

      const ctaEl = ctaWrapperRef.current
      if (ctaEl) {
        gsap.to(ctaEl, {
          opacity: 0,
          ease: 'power2.in',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '35% top',
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
            trigger: sectionRef.current,
            start: 'top top',
            end: '30% top',
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
      {prefersReducedMotion ? (
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
      ) : (
        <HeroCanvas />
      )}

      <section
        ref={sectionRef}
        id="hero"
        aria-label="Hero"
        className="relative z-[1] flex min-h-screen flex-col"
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
                gap: '0.25rem',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', opacity: 0.4 }}>
                45°28′N 9°10′E
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--accent)', opacity: 0.3 }}>
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', opacity: 0.4 }}>
                © 2025
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--accent)', opacity: 0.3, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00FF88', display: 'inline-block', boxShadow: '0 0 6px #00FF88' }} />
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
            bottom: 'clamp(4rem, 8vh, 6rem)',
            left: 0,
            paddingLeft: '8vw',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}
        >
          {/* Terminal line */}
          <div
            ref={subtitleRef}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', opacity: 0 }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--accent)', opacity: 0.7 }}>
              &gt;
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              COMPUTER ENGINEERING · FRONTEND &amp; CREATIVE DEV
            </span>
            <span
              className="hero-cursor"
              style={{ display: 'inline-block', width: '2px', height: '1em', backgroundColor: 'var(--accent)' }}
            />
          </div>

          {/* Tagline */}
          <p
            ref={taglineRef}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 'var(--text-xl)' : 'var(--text-2xl)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              opacity: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.1em',
            }}
          >
            {TAGLINE_WORDS.map((word, i) => (
              <span
                key={word}
                ref={(el) => { taglineWordsRef.current[i] = el }}
                style={{ display: 'block', opacity: 0, transform: 'translateY(12px)' }}
              >
                {word}
              </span>
            ))}
          </p>
        </div>

        {/* ── Scroll indicator + CTA: bottom-right ───────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: 'clamp(4rem, 8vh, 6rem)',
            right: '8vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 'var(--space-lg)',
          }}
        >
          {/* Scroll indicator */}
          <div
            ref={scrollIndicatorRef}
            className="flex flex-col items-center gap-2 opacity-0"
            aria-label="Scroll down"
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '2.5px', color: 'var(--text-secondary)' }}>
              SCROLL
            </span>
            <div
              ref={scrollLineRef}
              className="w-px"
              style={{ height: '36px', background: 'linear-gradient(to bottom, var(--accent), transparent)' }}
            />
          </div>

          {/* CTA button — GSAP wrapper handles entry/exit, motion.button handles hover */}
          <div ref={ctaWrapperRef} style={{ opacity: 0 }}>
            <motion.button
              onClick={() => scrollToSection('#contact')}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 0,
                background: 'transparent',
                padding: 'var(--space-sm) var(--space-lg)',
                cursor: 'pointer',
              }}
              whileHover={{
                backgroundColor: 'var(--accent-dim)',
                boxShadow: '0 0 20px var(--accent-glow)',
              }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
                Get in touch
                <motion.span
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  →
                </motion.span>
              </span>
            </motion.button>
          </div>
        </div>
      </section>
    </>
  )
}
