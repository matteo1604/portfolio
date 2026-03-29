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
const ROLE_TEXT = 'Frontend Developer & Creative Engineer'
const RAINERI_CHARS = 'Raineri'.split('')

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const topGroupRef = useRef<HTMLDivElement>(null)
  const prompt1Ref = useRef<HTMLDivElement>(null)
  const roleRef = useRef<HTMLDivElement>(null)
  const matteoRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const raineriCharRefs = useRef<(HTMLSpanElement | null)[]>([])
  const prompt2Ref = useRef<HTMLDivElement>(null)
  const descBlockRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const scrollLineRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()

  // ── Entry animation timeline ─────────────────────────────────
  useGSAP(
    () => {
      if (prefersReducedMotion) {
        const roleChars = roleRef.current?.querySelectorAll('span')
        gsap.set(
          [
            prompt1Ref.current,
            roleRef.current,
            matteoRef.current,
            prompt2Ref.current,
            descBlockRef.current,
            scrollIndicatorRef.current,
          ],
          { opacity: 1 },
        )
        if (roleChars) gsap.set(roleChars, { opacity: 1 })
        gsap.set(raineriCharRefs.current.filter(Boolean), { clipPath: 'inset(0% 0 0 0)' })
        return
      }

      const tl = gsap.timeline({ delay: 0.5 })

      // t=0.0 — prompt whoami
      tl.fromTo(
        prompt1Ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' },
        0,
      )

      // t=0.5 — role typing (chars individuali)
      const roleChars = roleRef.current
        ? Array.from(roleRef.current.querySelectorAll('span'))
        : []
      tl.set(roleRef.current, { opacity: 1 }, 0.5)
      tl.fromTo(
        roleChars,
        { opacity: 0 },
        { opacity: 1, duration: 0.01, stagger: 0.025, ease: 'none' },
        0.5,
      )

      // t=1.4 — Matteo fade-up
      tl.fromTo(
        matteoRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: `cubic-bezier(${EASING.smooth.join(',')})`,
        },
        1.4,
      )

      // t=1.7 — Raineri char-split
      tl.fromTo(
        raineriCharRefs.current.filter(Boolean),
        { clipPath: 'inset(100% 0 0 0)' },
        {
          clipPath: 'inset(0% 0 0 0)',
          duration: DURATION.slow,
          stagger: 0.04,
          ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
        },
        1.7,
      )

      // t=2.8 — prompt mission
      tl.fromTo(
        prompt2Ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' },
        2.8,
      )

      // t=3.1 — description block
      tl.fromTo(
        descBlockRef.current,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
        },
        3.1,
      )

      // t=4.0 — scroll indicator
      tl.fromTo(
        scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        4.0,
      )

      // Scroll line loop
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

  // ── Scroll exit stratificato ─────────────────────────────────
  useGSAP(
    () => {
      if (!sectionRef.current) return

      // Scrive --hero-progress (usato dal NodeNetwork)
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

      // Scroll indicator — esce per primo
      gsap.to(scrollIndicatorRef.current, {
        opacity: 0,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '8% top',
          scrub: true,
        },
      })

      // Prompt + role — escono velocemente
      gsap.to(topGroupRef.current, {
        opacity: 0,
        y: -60,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '25% top',
          scrub: true,
        },
      })

      // Prompt2 + description block — escono insieme
      gsap.to([prompt2Ref.current, descBlockRef.current], {
        opacity: 0,
        y: -50,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: '5% top',
          end: '35% top',
          scrub: true,
        },
      })

      // Nome — esce per ultimo, spostamento minore
      gsap.to(nameRef.current, {
        opacity: 0,
        y: -30,
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

  // ── Mouse parallax ───────────────────────────────────────────
  useGSAP(
    () => {
      if (prefersReducedMotion) return

      const onMouseMove = (e: MouseEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5
        const ny = e.clientY / window.innerHeight - 0.5

        gsap.to(topGroupRef.current, {
          x: nx * 14,
          y: ny * 8,
          duration: 1.2,
          ease: 'power2.out',
          overwrite: 'auto',
        })

        gsap.to(nameRef.current, {
          x: nx * 28,
          y: ny * 16,
          duration: 1.4,
          ease: 'power2.out',
          overwrite: 'auto',
        })

        gsap.to(descBlockRef.current, {
          x: nx * 18,
          y: ny * 10,
          duration: 1.3,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      }

      window.addEventListener('mousemove', onMouseMove)
      return () => window.removeEventListener('mousemove', onMouseMove)
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

          {/* Gruppo top: prompt whoami + risposta role */}
          <div ref={topGroupRef} className="mb-4 flex flex-col gap-1.5">
            <div ref={prompt1Ref} className="flex items-center gap-2 opacity-0">
              <span className="font-mono text-sm" style={{ color: 'var(--accent)' }}>→</span>
              <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>whoami</span>
            </div>

            {/* Risposta role — chars individuali per typing effect */}
            <div
              ref={roleRef}
              className="flex items-center opacity-0"
              aria-label={ROLE_TEXT}
            >
              {ROLE_TEXT.split('').map((char, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    opacity: 0,
                    whiteSpace: 'pre',
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* Name */}
          <h1
            ref={nameRef}
            className="mb-2 select-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 0.88,
            }}
          >
            {/* Matteo — entrata semplice */}
            <span
              ref={matteoRef}
              className="block opacity-0"
              style={{
                fontSize: 'clamp(48px, 7vw, 90px)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Matteo
            </span>

            {/* Raineri — char-split, aria-hidden perché lo span padre ha il testo */}
            <span
              className="block"
              style={{
                fontSize: 'clamp(72px, 12vw, 160px)',
                color: 'var(--text-primary)',
                textShadow: '0 0 80px rgba(0,212,255,0.1)',
              }}
              aria-hidden="true"
            >
              {RAINERI_CHARS.map((char, i) => (
                <span
                  key={i}
                  ref={el => { raineriCharRefs.current[i] = el }}
                  style={{ display: 'inline-block', clipPath: 'inset(100% 0 0 0)' }}
                >
                  {char}
                </span>
              ))}
            </span>
            <span className="sr-only">Raineri</span>
          </h1>

          {/* Prompt 2: → cat mission.txt */}
          <div ref={prompt2Ref} className="mt-6 mb-4 flex items-center gap-2 opacity-0">
            <span className="font-mono text-sm" style={{ color: 'var(--accent)' }}>→</span>
            <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>cat mission.txt</span>
          </div>

          {/* Description block */}
          <div ref={descBlockRef} className="flex gap-5 opacity-0">
            <div
              className="w-[2px] self-stretch"
              style={{ background: 'linear-gradient(to bottom, var(--accent), rgba(0,212,255,0.05))' }}
            />
            <div className="flex flex-col gap-3">
              <p
                className="max-w-[480px]"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                }}
              >
                <span style={{ color: 'var(--accent)' }}>Creo esperienze digitali</span>
                {' dove la tecnologia non si spiega — '}
                <em style={{ color: 'var(--text-primary)' }}>si vive.</em>
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

        {/* Scroll indicator */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0"
          aria-label="Scorri verso il basso"
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
