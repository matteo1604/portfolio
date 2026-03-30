import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { EASING, DURATION } from '@/lib/animations'
import { HeroCanvas } from '@/components/three/HeroCanvas'

gsap.registerPlugin(ScrollTrigger)

const TAGLINE_WORDS = ['Creo', 'esperienze,', 'non', 'siti.'] as const

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const taglineWordsRef = useRef<(HTMLSpanElement | null)[]>([])
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const scrollLineRef = useRef<HTMLDivElement>(null)
  const hudTopLeftRef = useRef<HTMLDivElement>(null)
  const hudTopRightRef = useRef<HTMLDivElement>(null)
  const hudBottomLeftRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // ── Entry animation timeline (starts after shader reveal ~5s) ──
  useGSAP(
    () => {
      const hudEls = [hudTopLeftRef.current, hudTopRightRef.current, hudBottomLeftRef.current]

      if (prefersReducedMotion) {
        gsap.set(
          [subtitleRef.current, taglineRef.current, scrollIndicatorRef.current, ...hudEls],
          { opacity: 1, y: 0 },
        )
        gsap.set(taglineWordsRef.current.filter(Boolean), { opacity: 1, y: 0 })
        return
      }

      const tl = gsap.timeline({ delay: 5.2 })

      // t=0 — Terminal description fade-in
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

      // t≈0.4 — Tagline container visible, then words stagger
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

      // HUD elements fade in delicately
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

      // Scroll indicator last
      tl.fromTo(
        scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: DURATION.normal, ease: 'power2.out' },
        '-=0.3',
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

  // ── Scroll exit: --hero-progress + fade out ──
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
          document.documentElement.style.setProperty(
            '--hero-progress-pct',
            `${self.progress * 100}%`,
          )
        },
        onLeaveBack: () => {
          document.documentElement.style.setProperty('--hero-progress', '0')
          document.documentElement.style.setProperty('--hero-progress-pct', '0%')
        },
      })

      if (prefersReducedMotion) return

      // Content fade out
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

      // HUD fade out (slightly earlier)
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

  return (
    <>
      {!prefersReducedMotion && <HeroCanvas />}

      <section
        ref={sectionRef}
        id="hero"
        aria-label="Hero"
        className="relative z-[1] flex min-h-screen flex-col items-center justify-end"
        style={{ paddingBottom: 'clamp(4rem, 8vh, 6rem)' }}
      >
        {/* Reduced motion fallback: static name in DOM */}
        {prefersReducedMotion && (
          <h1
            className="mb-8 select-none text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-hero)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textShadow: '0 0 40px var(--accent-glow)',
              margin: 0,
            }}
          >
            MATTEO
          </h1>
        )}

        {/* ── HUD Elements (desktop only) ─────────────────── */}
        {isDesktop && (
          <>
            {/* Top-left: coordinates */}
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
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  opacity: 0.4,
                }}
              >
                45.4642° N, 9.1900° E
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  color: 'var(--accent)',
                  opacity: 0.3,
                }}
              >
                MILANO, IT
              </span>
            </div>

            {/* Top-right: year / status */}
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
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  opacity: 0.4,
                }}
              >
                &copy; 2026
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  color: 'var(--accent)',
                  opacity: 0.3,
                }}
              >
                AVAILABLE FOR WORK
              </span>
            </div>

            {/* Bottom-left: scroll progress */}
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
              <div
                style={{
                  width: '1px',
                  height: '3rem',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 'var(--hero-progress-pct, 0%)',
                    backgroundColor: 'var(--accent)',
                    opacity: 0.5,
                    transition: 'height 0.1s linear',
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  opacity: 0.3,
                }}
              >
                SCROLL
              </span>
            </div>
          </>
        )}

        {/* ── Main content ────────────────────────────────── */}
        <div ref={contentRef} className="flex flex-col items-center">
          {/* Terminal-style description */}
          <div
            ref={subtitleRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              opacity: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                color: 'var(--accent)',
                opacity: 0.7,
              }}
            >
              &gt;
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Ingegneria Informatica &middot; Frontend &amp; Creative Dev
            </span>
            <span
              className="hero-cursor"
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                backgroundColor: 'var(--accent)',
              }}
            />
          </div>

          {/* Tagline — word-by-word reveal */}
          <p
            ref={taglineRef}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xl)',
              fontWeight: 500,
              color: 'var(--accent)',
              margin: '0.75rem 0 0',
              opacity: 0,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0 0.35em',
            }}
          >
            {TAGLINE_WORDS.map((word, i) => (
              <span
                key={word}
                ref={(el) => { taglineWordsRef.current[i] = el }}
                style={{
                  display: 'inline-block',
                  opacity: 0,
                  transform: 'translateY(12px)',
                }}
              >
                {word}
              </span>
            ))}
          </p>
        </div>

        {/* Scroll indicator */}
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
