import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { EASING, DURATION } from '@/lib/animations'
import { HeroCanvas } from '@/components/three/HeroCanvas'

gsap.registerPlugin(ScrollTrigger)

const RAINERI_CHARS = 'RAINERI'.split('')
const TECH = ['React', 'TypeScript', 'Three.js', 'GSAP', 'Tailwind']

export function HeroSection() {
  const sectionRef   = useRef<HTMLElement>(null)
  const topBarRef    = useRef<HTMLDivElement>(null)
  const matteoRef    = useRef<HTMLDivElement>(null)
  const dividerRef   = useRef<HTMLDivElement>(null)
  const nameRef      = useRef<HTMLHeadingElement>(null)
  const raineriCharRefs = useRef<(HTMLSpanElement | null)[]>([])
  const bottomRef    = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const scrollLineRef      = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()

  // ── Entry timeline ────────────────────────────────────────────
  useGSAP(
    () => {
      if (prefersReducedMotion) {
        gsap.set(
          [topBarRef.current, matteoRef.current, dividerRef.current,
           bottomRef.current, scrollIndicatorRef.current],
          { opacity: 1 },
        )
        gsap.set(dividerRef.current, { scaleX: 1 })
        gsap.set(raineriCharRefs.current.filter(Boolean), { clipPath: 'inset(0% 0 0 0)' })
        return
      }

      const tl = gsap.timeline({ delay: 0.3 })

      // t=0.0 — top bar
      tl.fromTo(topBarRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
        0,
      )

      // t=0.3 — MATTEO slide from right (è right-aligned, esce dalla destra)
      tl.fromTo(matteoRef.current,
        { opacity: 0, x: 24 },
        { opacity: 1, x: 0, duration: 0.7, ease: `cubic-bezier(${EASING.smooth.join(',')})` },
        0.3,
      )

      // t=0.7 — divider scaleX da sinistra
      tl.fromTo(dividerRef.current,
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 0.9, ease: `cubic-bezier(${EASING.dramatic.join(',')})` },
        0.7,
      )

      // t=1.1 — RAINERI char-split dal basso
      tl.fromTo(
        raineriCharRefs.current.filter(Boolean),
        { clipPath: 'inset(100% 0 0 0)' },
        {
          clipPath: 'inset(0% 0 0 0)',
          duration: DURATION.slow,
          stagger: 0.06,
          ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
        },
        1.1,
      )

      // t=2.3 — bottom content fade-up
      tl.fromTo(bottomRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: `cubic-bezier(${EASING.smooth.join(',')})` },
        2.3,
      )

      // t=3.1 — scroll indicator
      tl.fromTo(scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        3.1,
      )

      // Scroll line loop
      if (scrollLineRef.current) {
        gsap.fromTo(scrollLineRef.current,
          { scaleY: 0.4, opacity: 0.2, transformOrigin: 'top center' },
          { scaleY: 1, opacity: 0.8, duration: 2.2, repeat: -1, yoyo: true, ease: 'power2.inOut' },
        )
      }
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  // ── Scroll exit stratificato ──────────────────────────────────
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

      // Scroll indicator — scompare subito
      gsap.to(scrollIndicatorRef.current, {
        opacity: 0,
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: '8% top', scrub: true },
      })

      // Top bar — su e via
      gsap.to(topBarRef.current, {
        opacity: 0, y: -16,
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: '18% top', scrub: true },
      })

      // MATTEO + divider — escono verso destra
      gsap.to([matteoRef.current, dividerRef.current], {
        opacity: 0, x: 40,
        scrollTrigger: { trigger: sectionRef.current, start: '3% top', end: '28% top', scrub: true },
      })

      // Bottom — fade-up
      gsap.to(bottomRef.current, {
        opacity: 0, y: -36,
        scrollTrigger: { trigger: sectionRef.current, start: '5% top', end: '32% top', scrub: true },
      })

      // RAINERI — esce per ultimo, drift minimo
      gsap.to(nameRef.current, {
        opacity: 0, y: -24,
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: '42% top', scrub: true },
      })
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  // ── Mouse parallax ────────────────────────────────────────────
  useGSAP(
    () => {
      if (prefersReducedMotion) return

      const onMouseMove = (e: MouseEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5
        const ny = e.clientY / window.innerHeight - 0.5

        // MATTEO si muove in direzione OPPOSTA a RAINERI — tensione spaziale
        gsap.to(matteoRef.current, {
          x: -nx * 22, y: ny * 7,
          duration: 1.4, ease: 'power2.out', overwrite: 'auto',
        })
        // RAINERI — focal point, movimento massimo
        gsap.to(nameRef.current, {
          x: nx * 26, y: ny * 13,
          duration: 1.6, ease: 'power2.out', overwrite: 'auto',
        })
        // Bottom — segue leggermente
        gsap.to(bottomRef.current, {
          x: nx * 11, y: ny * 7,
          duration: 1.3, ease: 'power2.out', overwrite: 'auto',
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
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(20px, 3.5vw, 48px)',
          overflow: 'hidden',
        }}
      >

        {/* ── Top bar: index + anno ─────────────────────────────── */}
        <div
          ref={topBarRef}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 0,
          }}
        >
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            letterSpacing: '0.12em',
          }}>
            ○ 01
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            letterSpacing: '0.12em',
          }}>
            MMXXV
          </span>
        </div>

        {/* ── Name block: centro verticale ─────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(2rem, 5vw, 4rem) 0',
        }}>

          {/* MATTEO — right-aligned, piccolo, tracked */}
          <div
            ref={matteoRef}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 'clamp(0.5rem, 1vw, 0.875rem)',
              opacity: 0,
            }}
          >
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(0.875rem, 2vw, 1.75rem)',
              fontWeight: 400,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}>
              Matteo
            </span>
          </div>

          {/* Accent divider — gradient verso destra, dot cyan */}
          <div
            ref={dividerRef}
            style={{
              height: '1px',
              background: 'linear-gradient(to right, transparent 0%, rgba(0,212,255,0.15) 40%, var(--accent) 100%)',
              marginBottom: 'clamp(0.5rem, 1vw, 0.875rem)',
              position: 'relative',
            }}
          >
            <span style={{
              position: 'absolute',
              right: -2,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 10px var(--accent-glow)',
              display: 'block',
            }} />
          </div>

          {/* RAINERI — architettonico, full-bleed */}
          <h1
            ref={nameRef}
            aria-label="Raineri"
            style={{ margin: 0, lineHeight: 0.82 }}
          >
            <span aria-hidden="true" style={{ display: 'block', whiteSpace: 'nowrap' }}>
              {RAINERI_CHARS.map((char, i) => (
                <span
                  key={i}
                  ref={el => { raineriCharRefs.current[i] = el }}
                  style={{
                    display: 'inline-block',
                    clipPath: 'inset(100% 0 0 0)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                    fontSize: 'clamp(4.5rem, 16vw, 15rem)',
                    color: i === 0 ? 'var(--accent)' : 'var(--text-primary)',
                    textShadow: i === 0
                      ? '0 0 140px rgba(0,212,255,0.3)'
                      : 'none',
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          </h1>
        </div>

        {/* ── Bottom: role + tech ───────────────────────────────── */}
        <div
          ref={bottomRef}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '2rem',
            opacity: 0,
          }}
        >
          {/* Sinistra: role + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '360px' }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(0.875rem, 1.4vw, 1.1rem)',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1.3,
            }}>
              Frontend Developer<br />& Creative Engineer
            </p>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.75rem, 1vw, 0.875rem)',
              color: 'var(--text-secondary)',
              fontWeight: 300,
              lineHeight: 1.65,
              margin: 0,
            }}>
              Non te lo spiego.{' '}
              <em style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                Te lo faccio vivere.
              </em>
            </p>
          </div>

          {/* Destra: tech stack testo semplice */}
          <div style={{ flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}>
              {TECH.join(' · ')}
            </span>
          </div>
        </div>

        {/* ── Scroll indicator ─────────────────────────────────── */}
        <div
          ref={scrollIndicatorRef}
          style={{
            position: 'absolute',
            bottom: 'clamp(20px, 3.5vw, 48px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            opacity: 0,
          }}
          aria-label="Scorri verso il basso"
        >
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '2.5px',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
          }}>
            scroll
          </span>
          <div
            ref={scrollLineRef}
            style={{
              width: '1px',
              height: '36px',
              background: 'linear-gradient(to bottom, var(--accent), transparent)',
            }}
          />
        </div>

      </section>
    </>
  )
}
