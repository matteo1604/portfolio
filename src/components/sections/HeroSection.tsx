import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import { useGSAP } from '@/hooks/useGSAP'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { EASING, DURATION } from '@/lib/animations'
import { scrollToSection } from '@/lib/lenis'

gsap.registerPlugin(ScrollTrigger)

const STACK_LABELS = ['React', 'TypeScript', 'GSAP', 'WebGL'] as const

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const topLeftRef = useRef<HTMLDivElement>(null)
  const topRightRef = useRef<HTMLDivElement>(null)
  const supportRef = useRef<HTMLDivElement>(null)
  const supportLeadRef = useRef<HTMLParagraphElement>(null)
  const supportBodyRef = useRef<HTMLParagraphElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const scrollHintRef = useRef<HTMLDivElement>(null)
  const scrollLineRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')

  useGSAP(
    () => {
      if (prefersReducedMotion) {
        gsap.set(
          [
            topLeftRef.current,
            topRightRef.current,
            supportRef.current,
            supportLeadRef.current,
            supportBodyRef.current,
            stackRef.current,
            actionsRef.current,
            scrollHintRef.current,
          ],
          { opacity: 1, y: 0 },
        )
        return
      }

      const intro = gsap.timeline({ delay: 0.15 })

      intro
        .fromTo(
          [topLeftRef.current, topRightRef.current],
          { opacity: 0, y: -18 },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.normal,
            ease: `cubic-bezier(${EASING.smooth.join(',')})`,
            stagger: 0.08,
          },
        )
        .fromTo(
          supportRef.current,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.slow,
            ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
          },
          '-=0.15',
        )
        .fromTo(
          [supportLeadRef.current, supportBodyRef.current, stackRef.current, actionsRef.current],
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.normal,
            ease: `cubic-bezier(${EASING.smooth.join(',')})`,
            stagger: 0.08,
          },
          '-=0.35',
        )
        .fromTo(
          scrollHintRef.current,
          { opacity: 0 },
          { opacity: 1, duration: DURATION.normal, ease: 'power2.out' },
          '-=0.18',
        )

      if (scrollLineRef.current) {
        gsap.fromTo(
          scrollLineRef.current,
          { scaleY: 0.4, opacity: 0.2, transformOrigin: 'top center' },
          {
            scaleY: 1,
            opacity: 0.8,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'power2.inOut',
          },
        )
      }
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  useGSAP(
    () => {
      if (!sectionRef.current) return

      const skewSupport = supportRef.current
        ? gsap.quickTo(supportRef.current, 'skewY', { duration: 0.4, ease: 'power3.out' })
        : null

      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: '0% top',
        end: '18% top',
        scrub: true,
        onUpdate: (self) => {
          document.documentElement.style.setProperty('--hero-progress', String(self.progress))
          document.documentElement.style.setProperty('--hero-progress-pct', `${self.progress * 100}%`)

          if (sectionRef.current) {
            sectionRef.current.style.pointerEvents = self.progress > 0.95 ? 'none' : 'auto'
          }

          if (!prefersReducedMotion) {
            const velocity = self.getVelocity() / -1000
            skewSupport?.(velocity)
          }
        },
        onLeaveBack: () => {
          document.documentElement.style.setProperty('--hero-progress', '0')
          document.documentElement.style.setProperty('--hero-progress-pct', '0%')
        },
      })

      gsap.to(supportRef.current, {
        opacity: 0,
        y: -48,
        filter: 'blur(8px)',
        ease: 'power2.in',
        scrollTrigger: {
          trigger: '#global-scroll-track',
          start: '0% top',
          end: '14% top',
          scrub: true,
        },
      })

      gsap.to([topLeftRef.current, topRightRef.current], {
        opacity: 0,
        y: -24,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: '#global-scroll-track',
          start: '0% top',
          end: '10% top',
          scrub: true,
        },
      })

      gsap.to(scrollHintRef.current, {
        opacity: 0,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: '#global-scroll-track',
          start: '0% top',
          end: '10% top',
          scrub: true,
        },
      })
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--hero-progress')
      document.documentElement.style.removeProperty('--hero-progress-pct')
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-label="Hero"
      className="absolute inset-0 z-[1] pointer-events-auto"
    >
      <h1
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Matteo Raineri, Frontend Engineer and Creative Developer
      </h1>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: isMobile
            ? [
                'radial-gradient(circle at 50% 42%, rgba(10,10,11,0.04) 0%, rgba(10,10,11,0.12) 28%, rgba(10,10,11,0.78) 100%)',
                'linear-gradient(180deg, rgba(10,10,11,0.4) 0%, rgba(10,10,11,0.7) 64%, rgba(10,10,11,0.9) 100%)',
              ].join(',')
            : [
                'radial-gradient(circle at 50% 44%, rgba(10,10,11,0.02) 0%, rgba(10,10,11,0.08) 24%, rgba(10,10,11,0.72) 100%)',
                'radial-gradient(circle at 16% 80%, rgba(10,10,11,0.82) 0%, rgba(10,10,11,0.52) 32%, rgba(10,10,11,0) 70%)',
                'linear-gradient(180deg, rgba(10,10,11,0.44) 0%, rgba(10,10,11,0.16) 36%, rgba(10,10,11,0.72) 100%)',
              ].join(','),
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: isMobile ? '22% 8% 30%' : '16% 20% 24%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, rgba(0,212,255,0.03) 28%, rgba(10,10,11,0) 72%)',
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={topLeftRef}
        style={{
          position: 'absolute',
          top: 'clamp(1.25rem, 3vh, 2rem)',
          left: 'clamp(1rem, 3vw, 2.25rem)',
          zIndex: 3,
          opacity: prefersReducedMotion ? 1 : 0,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(232, 232, 236, 0.72)',
          }}
        >
          Frontend Engineer · Creative Developer
        </p>
      </div>

      <div
        ref={topRightRef}
        style={{
          position: 'absolute',
          top: 'clamp(1.1rem, 3vh, 1.9rem)',
          right: 'clamp(1rem, 3vw, 2.25rem)',
          zIndex: 3,
          opacity: prefersReducedMotion ? 1 : 0,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.7rem',
            padding: '0.65rem 0.95rem',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 10, 11, 0.38)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00FF88',
              boxShadow: '0 0 12px #00FF88',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            Available for work
          </span>
        </div>
      </div>

      <div
        ref={supportRef}
        style={{
          position: 'absolute',
          left: 'clamp(1rem, 3vw, 2.25rem)',
          bottom: 'clamp(1.25rem, 3vh, 2rem)',
          zIndex: 3,
          width: isMobile ? 'calc(100% - 2rem)' : 'min(27rem, 34vw)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
          padding: isMobile ? '1rem' : '1.05rem 1.15rem',
          borderRadius: '1.4rem',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(10, 10, 11, 0.34)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 0 32px rgba(0, 0, 0, 0.12)',
          opacity: prefersReducedMotion ? 1 : 0,
        }}
      >
        <p
          ref={supportLeadRef}
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 'clamp(1.22rem, 4.6vw, 1.55rem)' : 'clamp(1.4rem, 2vw, 1.85rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            maxWidth: '15ch',
          }}
        >
          Building interfaces with motion, clarity and depth.
        </p>

        <p
          ref={supportBodyRef}
          style={{
            margin: 0,
            fontSize: isMobile ? '0.88rem' : '0.94rem',
            lineHeight: 1.65,
            color: 'rgba(232, 232, 236, 0.7)',
          }}
        >
          Computer Engineering student crafting immersive frontend systems with React,
          TypeScript, GSAP and WebGL.
        </p>

        <div
          ref={stackRef}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.55rem',
          }}
        >
          {STACK_LABELS.map((label) => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.36rem 0.58rem',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.035)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(232, 232, 236, 0.68)',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div
          ref={actionsRef}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <motion.button
            onClick={() => scrollToSection('#about')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--bg-primary)',
              backgroundColor: 'var(--accent)',
              border: '1px solid var(--accent)',
              padding: '0.88rem 1.05rem',
              borderRadius: '999px',
              cursor: 'pointer',
              boxShadow: '0 0 28px rgba(0, 212, 255, 0.16)',
            }}
            whileHover={{ y: -2, boxShadow: '0 0 34px rgba(0, 212, 255, 0.28)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            Explore portfolio
          </motion.button>

          <motion.button
            onClick={() => scrollToSection('#contact')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '0.88rem 1.05rem',
              borderRadius: '999px',
              cursor: 'pointer',
            }}
            whileHover={{
              y: -2,
              borderColor: 'rgba(0, 212, 255, 0.35)',
              backgroundColor: 'rgba(0, 212, 255, 0.08)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            Start a conversation
          </motion.button>
        </div>
      </div>

      <div
        ref={scrollHintRef}
        style={{
          position: 'absolute',
          right: 'clamp(1rem, 3vw, 2.25rem)',
          bottom: 'clamp(1.25rem, 3vh, 2rem)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          zIndex: 3,
          opacity: prefersReducedMotion ? 1 : 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(232, 232, 236, 0.62)',
          }}
        >
          Scroll
        </span>
        <div
          ref={scrollLineRef}
          style={{
            width: '1px',
            height: '46px',
            background: 'linear-gradient(to bottom, var(--accent), transparent)',
          }}
        />
      </div>
    </section>
  )
}
