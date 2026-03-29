import { useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { EASING, DURATION } from '@/lib/animations'
import { HeroCanvas } from '@/components/three/HeroCanvas'

gsap.registerPlugin(ScrollTrigger)

const TECH_STACK = ['React', 'TypeScript', 'Three.js', 'GSAP', 'Tailwind'] as const

export function HeroSection() {
  const sectionRef        = useRef<HTMLElement>(null)
  const contentRef        = useRef<HTMLDivElement>(null)
  const prompt1Ref        = useRef<HTMLDivElement>(null)
  const nameRef           = useRef<HTMLHeadingElement>(null)
  const prompt2Ref        = useRef<HTMLDivElement>(null)
  const descBlockRef      = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const scrollLineRef     = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()

  // ── Entry animation timeline ──────────────────────────────────
  useGSAP(
    () => {
      if (prefersReducedMotion) {
        gsap.set(
          [prompt1Ref.current, nameRef.current, prompt2Ref.current,
           descBlockRef.current, scrollIndicatorRef.current],
          { opacity: 1, y: 0, clipPath: 'inset(0 0% 0 0)' },
        )
        return
      }

      const tl = gsap.timeline({ delay: 0.5 })

      // t=0 — primo prompt
      tl.fromTo(
        prompt1Ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' },
        0,
      )

      // t=0.3 — nome clip-path wipe da sinistra
      tl.fromTo(
        nameRef.current,
        { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: DURATION.dramatic,
          ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
        },
        0.3,
      )

      // t=1.6 — secondo prompt
      tl.fromTo(
        prompt2Ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' },
        1.6,
      )

      // t=1.9 — blocco descrizione fade-up
      tl.fromTo(
        descBlockRef.current,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
        },
        1.9,
      )

      // t=2.8 — scroll indicator
      tl.fromTo(
        scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        2.8,
      )

      // Scroll line — loop yoyo
      if (scrollLineRef.current) {
        gsap.fromTo(
          scrollLineRef.current,
          { scaleY: 0.4, opacity: 0.2, transformOrigin: 'top center' },
          { scaleY: 1, opacity: 0.8, duration: 2.2, repeat: -1, yoyo: true, ease: 'power2.inOut' },
        )
      }
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  // ── Scroll exit: --hero-progress + fade out ───────────────────
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
        },
        onLeaveBack: () => {
          document.documentElement.style.setProperty('--hero-progress', '0')
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
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  return (
    <>
      {!prefersReducedMotion && <HeroCanvas />}

      <section
        ref={sectionRef}
        id="hero"
        aria-label="Hero"
        className="relative z-[1] flex min-h-screen items-center"
        style={{ padding: '0 clamp(32px, 5vw, 80px)' }}
      >
        <div ref={contentRef} className="flex w-full max-w-[1200px] flex-col">

          {/* 1. PROMPT: → whoami */}
          <div ref={prompt1Ref} className="mb-5 flex items-center gap-2 opacity-0">
            <span
              style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent)' }}
            >
              →
            </span>
            <span
              style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)' }}
            >
              whoami
            </span>
          </div>

          {/* 2. NOME — due righe nella stessa h1 */}
          <h1
            ref={nameRef}
            className="mb-2 select-none opacity-0"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 0.88,
            }}
          >
            {/* Riga 1: Matteo */}
            <span
              className="block"
              style={{
                fontSize: 'clamp(48px, 7vw, 90px)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              M<span className="accent">a</span>tteo
            </span>

            {/* Riga 2: Raineri */}
            <span
              className="block"
              style={{
                fontSize: 'clamp(72px, 12vw, 160px)',
                color: 'var(--text-primary)',
                textShadow: '0 0 80px rgba(0,212,255,0.1)',
              }}
            >
              R<span className="accent">a</span>ineri
            </span>
          </h1>

          {/* 3. PROMPT: → cat mission.txt */}
          <div
            ref={prompt2Ref}
            className="flex items-center gap-2 opacity-0"
            style={{ marginTop: '24px', marginBottom: '16px' }}
          >
            <span
              style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent)' }}
            >
              →
            </span>
            <span
              style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)' }}
            >
              cat mission.txt
            </span>
          </div>

          {/* 4. BLOCCO DESCRIZIONE */}
          <div ref={descBlockRef} className="flex gap-5 opacity-0">

            {/* Linea accent verticale */}
            <div
              className="w-[2px] self-stretch flex-shrink-0"
              style={{
                background: 'linear-gradient(to bottom, var(--accent), rgba(0,212,255,0.05))',
              }}
            />

            {/* Contenuto */}
            <div className="flex flex-col gap-3">

              {/* Tagline in inglese */}
              <p
                className="max-w-[520px]"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                <span style={{ color: 'var(--accent)' }}>I build digital experiences</span>
                {' where technology is not explained — '}
                <em style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                  it&apos;s lived.
                </em>
                {/* Cursore lampeggiante */}
                <span
                  className="hero-cursor ml-1.5 inline-block align-middle"
                  style={{
                    width: '8px',
                    height: '17px',
                    background: 'var(--accent)',
                    boxShadow: '0 0 8px var(--accent-glow)',
                  }}
                />
              </p>

              {/* Tech stack — Framer Motion solo per hover */}
              <div className="flex flex-wrap gap-1.5">
                {TECH_STACK.map((tech) => (
                  <motion.span
                    key={tech}
                    className="cursor-default"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      padding: '4px 10px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                    }}
                    whileHover={{
                      color: 'var(--accent)',
                      borderColor: 'rgba(0,212,255,0.25)',
                      backgroundColor: 'var(--accent-dim)',
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {tech}
                  </motion.span>
                ))}
              </div>

            </div>
          </div>

        </div>

        {/* 5. SCROLL INDICATOR */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0"
          aria-label="Scroll down"
        >
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '2.5px',
              color: 'var(--text-secondary)',
            }}
          >
            scroll
          </span>
          <div
            ref={scrollLineRef}
            className="w-px"
            style={{
              height: '36px',
              background: 'linear-gradient(to bottom, var(--accent), transparent)',
            }}
          />
        </div>

      </section>
    </>
  )
}
