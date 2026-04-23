import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'

gsap.registerPlugin(ScrollTrigger)

// ── ScrambleText (same pattern as Hero) ───────────────────────────────────
const ScrambleText = ({ text, speed = 30 }: { text: string; speed?: number }) => {
  const [display, setDisplay] = useState(text.replace(/./g, '_'))

  useEffect(() => {
    let iter = 0
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_'
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((c, i) => {
            if (i < iter) return c
            if (c === ' ') return ' '
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      )
      if (iter >= text.length) clearInterval(interval)
      iter += 1 / 3
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return <>{display}</>
}

// ── Looping glitch text that never settles ────────────────────────────────
const GlitchLoop = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    const chars = '▓▒░█▄▀■□◆◇○●◎⊕⊗⊙'
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((c) => {
            if (c === ' ') return ' '
            if (Math.random() > 0.7) return chars[Math.floor(Math.random() * chars.length)]
            return c
          })
          .join('')
      )
    }, 80)
    return () => clearInterval(interval)
  }, [text])

  return <>{display}</>
}

// ── HUD Status Lines Data ─────────────────────────────────────────────────
const HUD_LINES = [
  { label: 'STATUS', value: 'FORGING', color: 'var(--accent)' },
  { label: 'ETA', value: 'Q3 2026', color: 'var(--accent)' },
  { label: 'CLEARANCE', value: 'PENDING', color: 'var(--accent-magenta)' },
  { label: 'REACTOR', value: 'ONLINE', color: '#00FF88' },
]

export function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const capsuleRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const hudLineRefs = useRef<(HTMLDivElement | null)[]>([])
  const subtextRef = useRef<HTMLParagraphElement>(null)
  const scanRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')

  // ── Capsule idle effects ──
  useEffect(() => {
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      // Scanning line
      if (scanRef.current) {
        gsap.to(scanRef.current, {
          top: '100%',
          duration: 2.5,
          repeat: -1,
          ease: 'none',
          onRepeat: () => {
            gsap.set(scanRef.current, { top: '-2%' })
          },
        })
      }
    })

    return () => ctx.revert()
  }, [prefersReducedMotion])

  // ── GSAP Scroll-driven entrance + particle morph ────────────────────────
  useGSAP(
    () => {
      if (!sectionRef.current) return

      if (prefersReducedMotion) {
        // Static fallback
        gsap.set([titleRef.current, capsuleRef.current, hudRef.current, subtextRef.current], {
          opacity: 1,
          y: 0,
        })
        return
      }

      // ── PARTICLE TRANSITION: Skills → Projects ──────────────────────
      // When scrolling from Skills (grid, morph=2.0) into Projects,
      // morph to vortex (3.0), center the particles, and scale appropriately.
      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: '70% top',
        end: '74% top',
        scrub: true,
        onUpdate: (self) => {
          if (sectionRef.current) {
             sectionRef.current.style.opacity = String(self.progress);
             sectionRef.current.style.pointerEvents = self.progress > 0.5 ? 'auto' : 'none';
          }
          // Morph: Grid (2.0) → Vortex (3.0)
          const morph = 2.0 + self.progress * 1.0
          document.documentElement.style.setProperty('--p-morph', String(morph))

          // Position: Move from Skills right-side (12, 0) to center (0, 0)
          const startX = isMobile ? 0 : 12
          const x = startX * (1 - self.progress)
          document.documentElement.style.setProperty('--p-x', String(x))
          document.documentElement.style.setProperty('--p-y', '0')

          // Scale: Compact vortex as atmospheric background behind capsule
          const targetScale = isMobile ? 0.35 : 0.5
          const startScale = isMobile ? 0.8 : 1.2
          const scale = startScale + (targetScale - startScale) * self.progress
          document.documentElement.style.setProperty('--p-scale', String(scale))

          // Opacity: Dim slightly so text remains readable
          const opacity = 1.0 - self.progress * 0.35
          document.documentElement.style.setProperty('--p-opacity', String(opacity))
          document.documentElement.style.setProperty('--p-z', '0')
        },
      })

      // ── PARTICLE STATE WHILE IN SECTION ─────────────────────────────
      // Keep the vortex state stable while the user is viewing the section
      ScrollTrigger.create({
        trigger: '#global-scroll-track',
        start: '72% top',
        end: '90% top',
        onEnter: () => {
          document.documentElement.style.setProperty('--p-morph', '3')
          document.documentElement.style.setProperty('--p-x', '0')
          document.documentElement.style.setProperty('--p-y', '0')
          document.documentElement.style.setProperty('--p-scale', isMobile ? '0.35' : '0.5')
          document.documentElement.style.setProperty('--p-opacity', '0.65')
          document.documentElement.style.setProperty('--p-z', '0')
          // Flash on entering
          document.documentElement.style.setProperty('--p-flash', '1')
          setTimeout(() => document.documentElement.style.setProperty('--p-flash', '0'), 150)
        },
        onEnterBack: () => {
          document.documentElement.style.setProperty('--p-morph', '3')
          document.documentElement.style.setProperty('--p-x', '0')
          document.documentElement.style.setProperty('--p-y', '0')
          document.documentElement.style.setProperty('--p-scale', isMobile ? '0.35' : '0.5')
          document.documentElement.style.setProperty('--p-opacity', '0.65')
          document.documentElement.style.setProperty('--p-z', '0')
        },
      })

      // ── DOM ELEMENT ANIMATIONS ──────────────────────────────────────

      // Section title reveal
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '#global-scroll-track',
            start: '71% top',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Capsule entrance — scale up from nothing
      gsap.fromTo(
        capsuleRef.current,
        { opacity: 0, scale: 0.6, y: 60 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.4,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: '#global-scroll-track',
            start: '72% top',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Ring reveal
      gsap.fromTo(
        ringRef.current,
        { opacity: 0, scale: 0.3, rotateX: 80 },
        {
          opacity: 1,
          scale: 1,
          rotateX: 0,
          duration: 1.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '#global-scroll-track',
            start: '74% top',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // HUD lines stagger
      gsap.fromTo(
        hudLineRefs.current.filter(Boolean),
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#global-scroll-track',
            start: '76% top',
            toggleActions: 'play none none reverse',
          },
        }
      )

      // Subtext
      gsap.fromTo(
        subtextRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#global-scroll-track',
            start: '78% top',
            toggleActions: 'play none none reverse',
          },
        }
      )
      
      // Exit Transition (90% to 92%)
      gsap.fromTo(sectionRef.current,
         { opacity: 1 },
         { opacity: 0, ease: 'power2.inOut', immediateRender: false,
           scrollTrigger: { trigger: '#global-scroll-track', start: '90% top', end: '92% top', scrub: true }
         }
      )
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion, isMobile] }
  )

  return (
    <section
      ref={sectionRef}
      id="projects"
      aria-label="Projects — Coming Soon"
      className="absolute inset-0 z-[4] w-full flex flex-col items-center justify-center overflow-hidden pointer-events-none"
      style={{
        opacity: 0,
        padding: isMobile ? 'var(--space-xl) var(--space-md)' : 'var(--space-2xl) var(--space-lg)',
      }}
    >
      {/* Background Gradient Atmosphere */}
      {!prefersReducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0, 212, 255, 0.06) 0%, transparent 70%)',
          }}
        />
      )}

      {/* ── Section Label ──────────────────────────────────────────── */}
      <div
        ref={titleRef}
        className="flex flex-col items-center gap-3 mb-12 md:mb-16"
        style={{ opacity: prefersReducedMotion ? 1 : 0 }}
      >
        <span
          className="font-mono text-sm tracking-[0.25em] font-bold"
          style={{ color: 'var(--accent)', opacity: 0.8 }}
        >
          // 04
        </span>
        <h2
          className="font-display text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Projects
        </h2>
        <span
          className="font-mono text-xs tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ScrambleText text="DEPLOYMENT IMMINENT" speed={40} />
        </span>
      </div>

      {/* ── The Forge — Capsule Assembly ────────────────────────────── */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: isMobile ? '280px' : '360px',
          height: isMobile ? '340px' : '440px',
          perspective: '800px',
        }}
      >
        {/* Orbiting Ring */}
        <div
          ref={ringRef}
          className="projects-ring absolute"
          style={{
            width: isMobile ? '260px' : '340px',
            height: isMobile ? '260px' : '340px',
            borderRadius: '50%',
            border: '1.5px dashed rgba(0, 212, 255, 0.25)',
            animation: prefersReducedMotion ? 'none' : 'forge-orbit 12s linear infinite',
            opacity: prefersReducedMotion ? 0.5 : 1,
          }}
        >
          {/* Orbiting Dot */}
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 12px var(--accent), 0 0 24px var(--accent-glow)',
            }}
          />
        </div>

        {/* Second ring — counter-rotation */}
        <div
          className="absolute"
          style={{
            width: isMobile ? '220px' : '290px',
            height: isMobile ? '220px' : '290px',
            borderRadius: '50%',
            border: '1px solid rgba(0, 212, 255, 0.1)',
            animation: prefersReducedMotion ? 'none' : 'forge-orbit-reverse 18s linear infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-magenta)',
              boxShadow: '0 0 10px var(--accent-magenta)',
            }}
          />
        </div>

        {/* Capsule Container */}
        <div
          ref={capsuleRef}
          className="relative flex items-center justify-center"
          style={{
            width: isMobile ? '160px' : '200px',
            height: isMobile ? '220px' : '280px',
            borderRadius: '100px',
            border: '1.5px solid rgba(0, 212, 255, 0.15)',
            background: 'rgba(0, 212, 255, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            boxShadow:
              '0 0 20px rgba(0, 212, 255, 0.05), inset 0 0 30px rgba(0, 212, 255, 0.1), 0 0 1px rgba(0, 212, 255, 0.2)',
            overflow: 'hidden',
            opacity: prefersReducedMotion ? 1 : 0,
          }}
        >
          {/* Scanline sweep */}
          {!prefersReducedMotion && (
            <div
              ref={scanRef}
              style={{
                position: 'absolute',
                top: '-2%',
                left: 0,
                width: '100%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                opacity: 0.6,
                zIndex: 5,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Capsule inner scanlines overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 212, 255, 0.02) 3px, rgba(0, 212, 255, 0.02) 4px)',
              pointerEvents: 'none',
              zIndex: 4,
              borderRadius: 'inherit',
            }}
          />

          {/* Top capsule cap glow */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.6), transparent)',
            }}
          />

          {/* Bottom capsule cap glow */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)',
            }}
          />

          {/* Vertical energy beams */}
          {!prefersReducedMotion && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  height: '100%',
                  background:
                    'linear-gradient(180deg, rgba(0, 212, 255, 0.3), transparent 30%, transparent 70%, rgba(0, 212, 255, 0.3))',
                  zIndex: 2,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  transform: 'translateY(-50%)',
                  width: '100%',
                  height: '1px',
                  background:
                    'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.15), transparent)',
                  zIndex: 2,
                }}
              />
            </>
          )}

          {/* Inner floating glitch text */}
          <div
            className="absolute font-mono text-center pointer-events-none select-none"
            style={{
              bottom: isMobile ? '24px' : '36px',
              left: 0,
              width: '100%',
              fontSize: '9px',
              letterSpacing: '0.15em',
              color: 'var(--accent)',
              opacity: 0.5,
              zIndex: 5,
            }}
          >
            <GlitchLoop text="FORGING" />
          </div>
        </div>

        {/* Corner brackets — top-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: isMobile ? '8px' : '12px',
            left: isMobile ? '8px' : '12px',
            width: '20px',
            height: '20px',
            borderTop: '1.5px solid rgba(0, 212, 255, 0.3)',
            borderLeft: '1.5px solid rgba(0, 212, 255, 0.3)',
          }}
        />
        {/* Corner brackets — top-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: isMobile ? '8px' : '12px',
            right: isMobile ? '8px' : '12px',
            width: '20px',
            height: '20px',
            borderTop: '1.5px solid rgba(0, 212, 255, 0.3)',
            borderRight: '1.5px solid rgba(0, 212, 255, 0.3)',
          }}
        />
        {/* Corner brackets — bottom-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: isMobile ? '8px' : '12px',
            left: isMobile ? '8px' : '12px',
            width: '20px',
            height: '20px',
            borderBottom: '1.5px solid rgba(0, 212, 255, 0.3)',
            borderLeft: '1.5px solid rgba(0, 212, 255, 0.3)',
          }}
        />
        {/* Corner brackets — bottom-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: isMobile ? '8px' : '12px',
            right: isMobile ? '8px' : '12px',
            width: '20px',
            height: '20px',
            borderBottom: '1.5px solid rgba(0, 212, 255, 0.3)',
            borderRight: '1.5px solid rgba(0, 212, 255, 0.3)',
          }}
        />
      </div>

      {/* ── HUD Status Readouts ────────────────────────────────────── */}
      <div
        ref={hudRef}
        className="flex flex-wrap justify-center gap-6 md:gap-10 mt-12 md:mt-16"
      >
        {HUD_LINES.map((line, i) => (
          <div
            key={line.label}
            ref={(el) => { hudLineRefs.current[i] = el }}
            className="flex flex-col items-center gap-1"
            style={{ opacity: prefersReducedMotion ? 1 : 0 }}
          >
            <span
              className="font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
            >
              {line.label}
            </span>
            <span
              className="font-mono text-sm font-bold tracking-[0.1em]"
              style={{ color: line.color, textShadow: `0 0 10px ${line.color}40` }}
            >
              {line.value === 'ONLINE' && (
                <span
                  className="inline-block mr-1.5"
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#00FF88',
                    boxShadow: '0 0 8px #00FF88',
                    verticalAlign: 'middle',
                  }}
                />
              )}
              {line.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Narrative Subtext ──────────────────────────────────────── */}
      <p
        ref={subtextRef}
        className="font-mono text-center max-w-md mt-10 md:mt-12 leading-relaxed"
        style={{
          fontSize: isMobile ? '0.8rem' : '0.85rem',
          color: 'var(--text-secondary)',
          opacity: prefersReducedMotion ? 0.7 : 0,
          letterSpacing: '0.02em',
        }}
      >
        New architectures are being forged inside the reactor.
        <br />
        Each project is engineered with the same obsession you see in this portfolio.
        <br />
        <span style={{ color: 'var(--accent)', opacity: 0.8 }}>
          Deployment is imminent.
        </span>
      </p>
    </section>
  )
}
