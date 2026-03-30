import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { EASING, DURATION, STAGGER } from '@/lib/animations'
import { ABOUT_SLIDES, tokenizePhrase } from '@/data/about-slides'
import type { WordToken } from '@/data/about-slides'

gsap.registerPlugin(ScrollTrigger)

/*
 * Motion strategy: GSAP ScrollTrigger only (no Framer Motion).
 * Pin: 1 pin on the inner viewport for 400vh of scroll.
 * Transitions: glitch → word-split exit → word-split enter → glow.
 */

const SLIDE_COUNT = ABOUT_SLIDES.length
const SECTION_HEIGHT = '400vh'

// ─── Particle Canvas (lightweight Canvas2D) ─────────────────────
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

function createParticles(w: number, h: number, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 1 + Math.random() * 1.5,
      opacity: 0.08 + Math.random() * 0.12,
    })
  }
  return particles
}

const CONNECTION_DIST = 120

function useParticleCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  scrollSpeedRef: React.RefObject<number>,
  reducedMotion: boolean,
) {
  useEffect(() => {
    if (reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let w = 0
    let h = 0
    let particles: Particle[] = []

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      w = rect.width
      h = rect.height
      canvas.width = w * devicePixelRatio
      canvas.height = h * devicePixelRatio
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      particles = createParticles(w, h, 35)
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      const speedMultiplier = 1 + (scrollSpeedRef.current ?? 0) * 3

      // Update + draw particles
      for (const p of particles) {
        p.x += p.vx * speedMultiplier
        p.y += p.vy * speedMultiplier
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`
        ctx.fill()
      }

      // Connections
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.06
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef, scrollSpeedRef, reducedMotion])
}

// ─── Tokenized slides (computed once) ───────────────────────────
const SLIDE_TOKENS: WordToken[][] = ABOUT_SLIDES.map((s) => tokenizePhrase(s.phrase))

// ─── Component ──────────────────────────────────────────────────
export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollSpeedRef = useRef(0)

  // Refs for each slide's elements
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const promptRefs = useRef<(HTMLDivElement | null)[]>([])
  const phraseRefs = useRef<(HTMLDivElement | null)[]>([])
  const wordRefs = useRef<(HTMLSpanElement | null)[][]>(
    Array.from({ length: SLIDE_COUNT }, () => []),
  )
  const subRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  // Separator refs
  const separatorRef = useRef<HTMLDivElement>(null)
  const separatorLineRef = useRef<HTMLDivElement>(null)

  const prefersReducedMotion = usePrefersReducedMotion()

  // Particle canvas
  useParticleCanvas(canvasRef, scrollSpeedRef, prefersReducedMotion)

  // Ref-setter factories (stable via useCallback)
  const setSlideRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => { slideRefs.current[i] = el },
    [],
  )
  const setPromptRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => { promptRefs.current[i] = el },
    [],
  )
  const setPhraseRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => { phraseRefs.current[i] = el },
    [],
  )
  const setWordRef = useCallback(
    (slideIdx: number, wordIdx: number) => (el: HTMLSpanElement | null) => {
      wordRefs.current[slideIdx][wordIdx] = el
    },
    [],
  )
  const setSubRef = useCallback(
    (i: number) => (el: HTMLParagraphElement | null) => { subRefs.current[i] = el },
    [],
  )
  const setBarRef = useCallback(
    (i: number) => (el: HTMLDivElement | null) => { barRefs.current[i] = el },
    [],
  )

  // ── Separator line draw-on-scroll ───────────────────────────
  useGSAP(
    () => {
      if (!separatorLineRef.current || !separatorRef.current) return
      if (prefersReducedMotion) {
        gsap.set(separatorRef.current, { opacity: 1 })
        gsap.set(separatorLineRef.current, { scaleY: 1 })
        return
      }

      gsap.fromTo(
        separatorLineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: separatorRef.current,
            start: 'top 90%',
            end: 'bottom 60%',
            scrub: true,
          },
        },
      )
      gsap.fromTo(
        separatorRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: DURATION.normal,
          scrollTrigger: {
            trigger: separatorRef.current,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        },
      )
    },
    { scope: sectionRef },
  )

  // ── Main pinned scroll-driven animation ─────────────────────
  useGSAP(
    () => {
      if (!pinRef.current || !sectionRef.current) return

      // Helper: show/hide a whole slide
      function setSlideVisible(i: number, visible: boolean) {
        const slide = slideRefs.current[i]
        if (!slide) return
        gsap.set(slide, {
          opacity: visible ? 1 : 0,
          visibility: visible ? 'visible' : 'hidden',
          pointerEvents: visible ? 'auto' : 'none',
          zIndex: visible ? 2 : 1,
        })
      }

      // --- Reduced motion: simple crossfade ---
      if (prefersReducedMotion) {
        for (let i = 0; i < SLIDE_COUNT; i++) {
          setSlideVisible(i, i === 0)
          gsap.set(barRefs.current[i], {
            backgroundColor: i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
          })
          for (const w of wordRefs.current[i]) {
            if (w) gsap.set(w, { opacity: 1, y: 0 })
          }
        }

        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          pin: pinRef.current,
          pinSpacing: false,
          scrub: true,
          onUpdate: (self) => {
            const slideIdx = Math.min(
              SLIDE_COUNT - 1,
              Math.floor(self.progress * SLIDE_COUNT),
            )
            for (let i = 0; i < SLIDE_COUNT; i++) {
              setSlideVisible(i, i === slideIdx)
              gsap.set(barRefs.current[i], {
                backgroundColor: i === slideIdx ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
              })
            }
          },
        })
        return
      }

      // --- Full animation path ---

      // Initial state: only first slide visible
      for (let i = 0; i < SLIDE_COUNT; i++) {
        const isFirst = i === 0
        setSlideVisible(i, isFirst)
        gsap.set(subRefs.current[i], { y: isFirst ? 0 : 40 })

        for (let w = 0; w < wordRefs.current[i].length; w++) {
          const el = wordRefs.current[i][w]
          if (!el) continue
          if (isFirst) {
            gsap.set(el, { opacity: 1, y: 0, skewX: 0 })
          } else {
            gsap.set(el, { opacity: 0, y: w % 2 === 0 ? 30 : -30 })
          }
        }
      }

      // Helper functions + state (must be declared before first use)
      const glowTweensRef: gsap.core.Tween[] = []

      function startGlowTweens(slideIdx: number) {
        // Kill previous glows
        for (const t of glowTweensRef) t.kill()
        glowTweensRef.length = 0

        const words = wordRefs.current[slideIdx]
        const tokens = SLIDE_TOKENS[slideIdx]
        for (let w = 0; w < tokens.length; w++) {
          if (tokens[w].accent && words[w]) {
            const t = gsap.fromTo(
              words[w],
              { textShadow: '0 0 20px var(--accent-glow)' },
              {
                textShadow: '0 0 40px var(--accent-glow)',
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
              },
            )
            glowTweensRef.push(t)
          }
        }
      }

      function updateBars(activeIdx: number) {
        for (let i = 0; i < SLIDE_COUNT; i++) {
          const bar = barRefs.current[i]
          if (!bar) continue
          if (i === activeIdx) {
            gsap.to(bar, {
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent-glow)',
              duration: 0.3,
            })
          } else {
            gsap.to(bar, {
              backgroundColor: 'rgba(255,255,255,0.08)',
              boxShadow: 'none',
              duration: 0.3,
            })
          }
        }
      }

      // Start accent glow on first slide
      startGlowTweens(0)

      // Update progress bars
      updateBars(0)

      // Pin the inner viewport
      const pinST = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinRef.current,
        pinSpacing: false,
        scrub: true,
      })

      // Track scroll speed for particles
      let lastProgress = 0
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          scrollSpeedRef.current = Math.abs(self.progress - lastProgress) * 60
          lastProgress = self.progress
        },
      })

      // Build a master timeline scrubbed to the overall scroll
      const master = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
        },
      })

      for (let t = 0; t < SLIDE_COUNT - 1; t++) {
        const exitSlide = t
        const enterSlide = t + 1
        const exitWords = wordRefs.current[exitSlide].filter(Boolean) as HTMLSpanElement[]
        const enterWords = wordRefs.current[enterSlide].filter(Boolean) as HTMLSpanElement[]

        // Each transition: 0–15% glitch, 15–50% exit words, 55–90% enter words, 80–100% subtext

        const tl = gsap.timeline()

        // ── Glitch on current phrase ──
        tl.to(phraseRefs.current[exitSlide], {
          textShadow: '2px 0 #ff0040, -2px 0 #00d4ff',
          skewX: 2,
          duration: 0.15,
          ease: 'power2.in',
        }, 0)
        tl.to(phraseRefs.current[exitSlide], {
          textShadow: 'none',
          skewX: 0,
          duration: 0.1,
          ease: 'power2.out',
        }, 0.15)

        // ── Exit: fade out + slide up the entire exit slide ──
        tl.to(slideRefs.current[exitSlide], {
          opacity: 0,
          y: -30,
          duration: 0.4,
          ease: 'power2.in',
        }, 0.2)

        // Hide exit slide, show enter slide at midpoint
        tl.call(() => {
          setSlideVisible(exitSlide, false)
          // Prepare enter slide: visible but transparent, offset down
          const enterEl = slideRefs.current[enterSlide]
          if (enterEl) {
            gsap.set(enterEl, {
              opacity: 0,
              visibility: 'visible',
              pointerEvents: 'auto',
              zIndex: 2,
              y: 30,
            })
          }
          // Reset word positions for enter
          for (let w = 0; w < enterWords.length; w++) {
            gsap.set(enterWords[w], { opacity: 0, y: w % 2 === 0 ? 30 : -30 })
          }
          gsap.set(subRefs.current[enterSlide], { opacity: 0, y: 40 })
          gsap.set(promptRefs.current[enterSlide], { opacity: 0 })
        }, undefined, 0.5)

        // ── Enter: fade in the enter slide ──
        tl.to(slideRefs.current[enterSlide], {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: 'power2.out',
        }, 0.55)

        // ── Enter prompt ──
        tl.to(promptRefs.current[enterSlide], {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        }, 0.55)

        // ── Enter words: stagger in ──
        for (let w = 0; w < enterWords.length; w++) {
          tl.to(enterWords[w], {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: `cubic-bezier(${EASING.dramatic.join(',')})`,
          }, 0.6 + w * STAGGER.tight)
        }

        // ── Enter subtext with parallax ──
        tl.to(subRefs.current[enterSlide], {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: `cubic-bezier(${EASING.smooth.join(',')})`,
        }, 0.8)

        // ── Update progress bars + glow at midpoint ──
        tl.call(
          () => {
            updateBars(enterSlide)
            startGlowTweens(enterSlide)
          },
          undefined,
          0.6,
        )

        master.add(tl)
      }

      // Cleanup glow tweens
      return () => {
        for (const t of glowTweensRef) t.kill()
        pinST.kill()
      }
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] },
  )

  return (
    <>
      {/* ── Separator line ─────────────────────────────── */}
      <div
        ref={separatorRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          padding: 'var(--space-xl) 0',
          opacity: 0,
        }}
      >
        <div
          ref={separatorLineRef}
          style={{
            width: '1px',
            height: '80px',
            background: 'linear-gradient(to bottom, var(--accent), transparent)',
            transformOrigin: 'top center',
            transform: 'scaleY(0)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: 'var(--text-secondary)',
          }}
        >
          // about
        </span>
      </div>

      {/* ── About Section ──────────────────────────────── */}
      <section
        ref={sectionRef}
        id="about"
        aria-label="About"
        style={{ height: SECTION_HEIGHT, position: 'relative' }}
      >
        {/* Particle canvas background */}
        {!prefersReducedMotion && (
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {/* Pinned viewport */}
        <div
          ref={pinRef}
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
            padding: '0 clamp(32px, 5vw, 80px)',
          }}
        >
          {/* Slide container — all slides stacked via position: absolute */}
          <div
            style={{
              width: '100%',
              maxWidth: '1000px',
              position: 'relative',
              minHeight: '60vh',
            }}
          >
            {ABOUT_SLIDES.map((slide, slideIdx) => {
              const tokens = SLIDE_TOKENS[slideIdx]
              const isFirst = slideIdx === 0
              return (
                <div
                  key={slideIdx}
                  ref={setSlideRef(slideIdx)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 0,
                    opacity: isFirst ? 1 : 0,
                    visibility: isFirst ? 'visible' : 'hidden',
                    pointerEvents: isFirst ? 'auto' : 'none',
                    zIndex: isFirst ? 2 : 1,
                  }}
                >
                  {/* Terminal prompt */}
                  <div
                    ref={setPromptRef(slideIdx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '20px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        color: 'var(--accent)',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {slide.prompt}
                    </span>
                  </div>

                  {/* Phrase — word-split for animation */}
                  <div
                    ref={setPhraseRef(slideIdx)}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0 0.35em',
                      marginBottom: '20px',
                    }}
                    aria-label={slide.phrase.map((s) => s.text).join('')}
                  >
                    {tokens.map((token, wIdx) => (
                      <span
                        key={wIdx}
                        ref={setWordRef(slideIdx, wIdx)}
                        className="about-word"
                        style={{
                          display: 'inline-block',
                          fontFamily: 'var(--font-display)',
                          fontSize: 'clamp(32px, 4.5vw, 56px)',
                          fontWeight: 600,
                          lineHeight: 1.1,
                          color: token.accent ? 'var(--accent)' : 'var(--text-primary)',
                        }}
                      >
                        {token.word}
                      </span>
                    ))}
                  </div>

                  {/* Subtext */}
                  <p
                    ref={setSubRef(slideIdx)}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '16px',
                      fontWeight: 300,
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      maxWidth: '540px',
                      marginTop: 0,
                    }}
                  >
                    {slide.sub}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Progress indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 'clamp(2rem, 4vh, 3rem)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <div
                key={i}
                ref={setBarRef(i)}
                style={{
                  width: '32px',
                  height: '2px',
                  backgroundColor:
                    i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                  borderRadius: '1px',
                  transition: 'background-color 0.3s',
                  boxShadow: i === 0 ? '0 0 8px var(--accent-glow)' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
