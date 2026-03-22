import { useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { EASING, DURATION, STAGGER } from '@/lib/animations'
import { HeroCanvas } from '@/components/three/HeroCanvas'

gsap.registerPlugin(ScrollTrigger)

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const scrollLineRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()

  // Entry animation
  useGSAP(
    () => {
      if (prefersReducedMotion) {
        // Reduced motion: instant fade in, no transforms
        gsap.set(
          [overlayRef.current, nameRef.current, subtitleRef.current, taglineRef.current, scrollIndicatorRef.current],
          { opacity: 1, y: 0, clipPath: 'inset(0 0% 0 0)' },
        )
        return
      }

      const tl = gsap.timeline({ delay: 0.5 })

      // Container fade in
      tl.fromTo(
        overlayRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: DURATION.dramatic,
          ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
        },
      )

      // Name: clip-path reveal left to right
      tl.fromTo(
        nameRef.current,
        { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: DURATION.dramatic,
          ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
        },
        '-=0.8',
      )

      // Subtitle + tagline: staggered fade up
      tl.fromTo(
        [subtitleRef.current, taglineRef.current],
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: DURATION.slow,
          ease: `cubic-bezier(${EASING.smooth.join(',')})`,
          stagger: STAGGER.relaxed,
        },
        `-=${DURATION.normal}`,
      )

      // Scroll indicator fades in last
      tl.fromTo(
        scrollIndicatorRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: DURATION.normal,
          ease: 'power2.out',
        },
        '-=0.3',
      )

      // Scroll line loop animation
      if (scrollLineRef.current) {
        gsap.fromTo(
          scrollLineRef.current,
          { scaleY: 0, transformOrigin: 'top center' },
          {
            scaleY: 1,
            duration: 1.2,
            repeat: -1,
            ease: 'power2.inOut',
            yoyo: true,
          },
        )
      }
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  // Scroll-driven exit: pin section + fade out content, write --hero-progress CSS var
  useGSAP(
    () => {
      if (!sectionRef.current) return

      // Write --hero-progress (0→1) as user scrolls past the hero
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          document.documentElement.style.setProperty('--hero-progress', String(self.progress))
        },
        onLeaveBack: () => {
          document.documentElement.style.setProperty('--hero-progress', '0')
        },
      })

      if (prefersReducedMotion) return

      // Fade out overlay content as user scrolls
      gsap.to(overlayRef.current, {
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
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  return (
    <>
      {/* 3D Canvas — fixed, behind everything, hidden when reduced motion */}
      {!prefersReducedMotion && <HeroCanvas />}

      {/* Hero section — 100vh, sits above fixed canvas */}
      <section
        ref={sectionRef}
        id="hero"
        aria-label="Hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        {/* Glassmorphism overlay — full-screen, nearly transparent */}
        <div
          ref={overlayRef}
          style={{
            opacity: 0, // animated in by GSAP
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.25rem',
            padding: 'clamp(2rem, 5vw, 4rem) clamp(2.5rem, 6vw, 5rem)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(10, 10, 11, 0.3)',
            maxWidth: '900px',
            width: '100%',
          }}
        >
          {/* Name */}
          <h1
            ref={nameRef}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.5rem, 10vw, 7rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.05,
              opacity: 0,
              margin: 0,
              textShadow: '0 0 60px rgba(0,212,255,0.15)',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            Matteo Raineri
          </h1>

          {/* Study subtitle */}
          <p
            ref={subtitleRef}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xl)',
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              opacity: 0,
              margin: 0,
            }}
          >
            Studente di Ingegneria Informatica
          </p>

          {/* Tagline */}
          <p
            ref={taglineRef}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xl)',
              fontWeight: 500,
              color: 'var(--accent)',
              opacity: 0,
              margin: 0,
            }}
          >
            Creo esperienze digitali
          </p>
        </div>

        {/* Scroll indicator — animated line + text */}
        <div
          ref={scrollIndicatorRef}
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0,
          }}
          aria-label="Scorri verso il basso"
        >
          <motion.div
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
            }}
            onClick={() => {
              const next = document.getElementById('about')
              next?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}
            >
              scroll
            </span>

            {/* Animated vertical line */}
            <div
              ref={scrollLineRef}
              style={{
                width: '1px',
                height: '40px',
                background: 'var(--accent)',
                opacity: 0.6,
              }}
            />
          </motion.div>
        </div>
      </section>
    </>
  )
}
