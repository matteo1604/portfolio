import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@/hooks/useGSAP'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'

gsap.registerPlugin(ScrollTrigger)

// --- Helper Components for Effects ---

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

const HoverGlitchText = ({ text, isHovered }: { text: string; isHovered: boolean }) => {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    if (isHovered) {
      let iter = 0
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_'
      const interval = setInterval(() => {
        setDisplay(
          text
            .split('')
            .map((c, i) => {
              if (c === ' ') return c
              if (i < iter) return c
              return chars[Math.floor(Math.random() * chars.length)]
            })
            .join('')
        )
        if (iter >= text.length) clearInterval(interval)
        iter += 1 / 1.5 // extremely fast decryption
      }, 25)
      return () => {
         clearInterval(interval)
         setDisplay(text)
      }
    } else {
      setDisplay(text)
    }
  }, [isHovered, text])

  return <>{display}</>
}

// --- Kinetic Magnetic Title ---

const KineticTitle = ({ text, prefersReducedMotion }: { text: string; prefersReducedMotion: boolean }) => {
  const containerRef = useRef<HTMLHeadingElement>(null)
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([])
  
  useGSAP(() => {
    if (!containerRef.current || prefersReducedMotion) return
    
    gsap.fromTo(
      lettersRef.current.filter(Boolean),
      { opacity: 0, y: 40, rotateX: -90, z: -100 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        z: 0,
        duration: 1.2,
        stagger: 0.05,
        ease: 'back.out(2)',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        }
      }
    )
  }, { scope: containerRef, dependencies: [prefersReducedMotion] })

  const handlePointerMove = (e: React.PointerEvent) => {
     if (prefersReducedMotion || !containerRef.current) return
     
     const mouseX = e.clientX
     const mouseY = e.clientY

     lettersRef.current.forEach((letter) => {
        if (!letter) return
        const rect = letter.getBoundingClientRect()
        const letterCenterX = rect.left + rect.width / 2
        const letterCenterY = rect.top + rect.height / 2

        const dx = mouseX - letterCenterX
        const dy = mouseY - letterCenterY
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        const maxDist = 120 // Repulsion radius
        if (dist < maxDist) {
           const force = (maxDist - dist) / maxDist
           const pushX = -(dx / dist) * force * 35
           const pushY = -(dy / dist) * force * 35
           const rot = -(dx / dist) * force * 15
           
           gsap.to(letter, {
              x: pushX,
              y: pushY,
              rotateZ: rot,
              scale: 1 + force * 0.1,
              color: '#ffffff', // Glow white
              textShadow: `${pushX * 0.8}px ${pushY * 0.8}px 0px rgba(0, 212, 255, 0.8), ${-pushX * 0.8}px ${-pushY * 0.8}px 0px rgba(255, 26, 128, 0.8)`,
              duration: 0.3,
              ease: 'power2.out',
              overwrite: 'auto'
           })
        } else {
           gsap.to(letter, {
              x: 0,
              y: 0,
              rotateZ: 0,
              scale: 1,
              color: 'var(--text-primary)',
              textShadow: '0 0 20px rgba(255, 26, 128, 0.3)',
              duration: 0.6,
              ease: 'elastic.out(1, 0.3)',
              overwrite: 'auto'
           })
        }
     })
  }

  const handlePointerLeave = () => {
     if (prefersReducedMotion) return
     lettersRef.current.forEach(letter => {
        if (!letter) return
        gsap.to(letter, {
           x: 0,
           y: 0,
           rotateZ: 0,
           scale: 1,
           color: 'var(--text-primary)',
           textShadow: '0 0 20px rgba(255, 26, 128, 0.3)',
           duration: 0.8,
           ease: 'elastic.out(1, 0.3)',
           overwrite: 'auto'
        })
     })
  }

  const words = text.split(' ')

  return (
    <h2
        ref={containerRef}
        className="font-display text-4xl md:text-5xl lg:text-7xl font-bold uppercase tracking-tight text-center cursor-crosshair z-20"
        style={{ color: 'var(--text-primary)', perspective: '1000px', padding: '1rem 0' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        aria-label={text}
    >
       {words.map((word, wIdx) => (
         <span key={wIdx} className="inline-block whitespace-nowrap" style={{ marginRight: wIdx < words.length - 1 ? '0.3em' : '0' }}>
           {word.split('').map((char, cIdx) => {
              const overallIdx = wIdx * 100 + cIdx
              return (
                <span 
                   key={overallIdx}
                   ref={el => { lettersRef.current[overallIdx] = el }}
                   className="inline-block transition-colors"
                   style={{ transformOrigin: 'center center', textShadow: '0 0 20px rgba(255, 26, 128, 0.3)', willChange: 'transform' }}
                   aria-hidden="true"
                >
                  {char}
                </span>
              )
           })}
         </span>
       ))}
    </h2>
  )
}

// -------------------------------------

const CONTACT_LINKS = [
  { id: 'email', label: 'SECURE COMMS', value: 'mattirainer1604@gmail.com', href: 'mailto:mattirainer1604@gmail.com', color: 'var(--accent)' },
  { id: 'github', label: 'NETWORK', value: 'github.com/matteo1604', href: 'https://github.com/matteo1604', color: '#00FF88' },
  { id: 'phone', label: 'DIRECT LINE', value: '+39 334 936 4382', href: 'tel:+393349364382', color: '#FF1A80' } // Using magenta/pink for phone to match singularity
]

// --- The Holographic Node Component ---

const HolographicCard = ({ link, prefersReducedMotion }: { link: any, prefersReducedMotion: boolean }) => {
   const [isHovered, setIsHovered] = useState(false)
   const cardRef = useRef<HTMLAnchorElement>(null)
   const glareRef = useRef<HTMLDivElement>(null)

   const handleMouseMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
      if (!cardRef.current || prefersReducedMotion) return
      
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Physical 3D Tilt calculation
      const rotX = ((y - centerY) / centerY) * -12 // Max 12 degrees tilt
      const rotY = ((x - centerX) / centerX) * 12
      
      gsap.to(cardRef.current, {
         rotateX: rotX,
         rotateY: rotY,
         duration: 0.4,
         ease: 'power2.out',
         transformPerspective: 1000
      })

      // Glare positioning tracking mouse
      if (glareRef.current) {
         gsap.to(glareRef.current, {
            x: x - rect.width,
            y: y - rect.height,
            opacity: 0.15,
            duration: 0.4,
            ease: 'power2.out'
         })
      }
   }

   const handleMouseEnter = () => {
      setIsHovered(true)
      if (!prefersReducedMotion) {
         // Flash the Singularity background matrix
         document.documentElement.style.setProperty('--p-flash', '0.8')
         setTimeout(() => document.documentElement.style.setProperty('--p-flash', '0'), 150)
      }
   }

   const handleMouseLeave = () => {
      setIsHovered(false)
      if (!prefersReducedMotion && cardRef.current) {
         // Reset physics 
         gsap.to(cardRef.current, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
         if (glareRef.current) {
            gsap.to(glareRef.current, { opacity: 0, duration: 0.6 })
         }
      }
   }

   return (
     <a
        ref={cardRef}
        href={link.href}
        target={link.id === 'email' ? '_self' : '_blank'}
        rel={link.id === 'email' ? '' : 'noopener noreferrer'}
        onPointerMove={handleMouseMove}
        onPointerEnter={handleMouseEnter}
        onPointerLeave={handleMouseLeave}
        className="block relative w-full overflow-hidden"
        style={{
           border: `1.5px solid ${isHovered ? link.color : 'rgba(255, 255, 255, 0.08)'}`,
           background: isHovered ? 'rgba(0,0,0,0.6)' : 'rgba(0, 0, 0, 0.35)',
           backdropFilter: 'blur(16px)',
           WebkitBackdropFilter: 'blur(16px)',
           // CSS Clip-path to slice corners off for Sci-Fi HUD look
           clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
           padding: '2.5rem',
           transition: 'background-color 0.4s ease, border-color 0.4s ease',
           textDecoration: 'none'
        }}
     >
       {/* Ambient Glare injected via mouse tracking */}
       <div 
         ref={glareRef}
         className="absolute top-0 left-0 pointer-events-none opacity-0"
         style={{
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle at center, ${link.color} 0%, transparent 50%)`,
            mixBlendMode: 'screen',
            zIndex: 1
         }}
       />
       
       {/* UI Elements */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 relative z-10 pointer-events-none">
         <div className="flex items-center gap-4">
           {/* Technical Indicator Node */}
           <div 
              style={{
                 width: '8px',
                 height: '8px',
                 backgroundColor: isHovered ? link.color : 'transparent',
                 border: `1px solid ${isHovered ? link.color : 'rgba(255,255,255,0.3)'}`,
                 boxShadow: isHovered ? `0 0 15px ${link.color}` : 'none',
                 transition: 'all 0.3s ease',
                 transform: isHovered ? 'rotate(45deg)' : 'rotate(0deg)'
              }}
           />
           <span 
             className="font-mono text-xs md:text-sm tracking-[0.25em] font-bold"
             style={{ color: isHovered ? '#fff' : 'var(--text-secondary)', transition: 'color 0.3s ease' }}
           >
              [{link.label}]
           </span>
         </div>

         {/* The Glitching Value Text */}
         <div 
           className="font-display text-lg md:text-2xl font-bold tracking-tight text-white transition-all duration-300"
           style={{ 
             textShadow: isHovered ? `0 0 20px ${link.color}` : 'none',
             opacity: isHovered ? 1 : 0.8
           }}
         >
            <HoverGlitchText text={link.value} isHovered={isHovered} />
         </div>
       </div>

       {/* Top-Right Decorative Bracket */}
       <div className="absolute top-3 right-3 w-4 h-4 pointer-events-none transition-opacity duration-300" style={{ opacity: isHovered ? 1 : 0.2, borderTop: `2px solid ${link.color}`, borderRight: `2px solid ${link.color}` }} />
       {/* Bottom-Left Decorative Bracket */}
       <div className="absolute bottom-3 left-3 w-4 h-4 pointer-events-none transition-opacity duration-300" style={{ opacity: isHovered ? 1 : 0.2, borderBottom: `2px solid ${link.color}`, borderLeft: `2px solid ${link.color}` }} />
     </a>
   )
}

// -------------------------------------

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([])
  
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')

  useGSAP(
    () => {
      if (!sectionRef.current) return

      if (!prefersReducedMotion) {
        ScrollTrigger.create({
          trigger: '#global-scroll-track',
          start: '88% top', 
          end: '92% top',
          scrub: true,
          onUpdate: (self) => {
            if (sectionRef.current) {
               sectionRef.current.style.opacity = String(self.progress);
               sectionRef.current.style.pointerEvents = self.progress > 0.5 ? 'auto' : 'none';
            }
            const morph = 3.0 + self.progress * 1.0
            document.documentElement.style.setProperty('--p-morph', String(morph))
            const opacity = 0.65 + (0.95 - 0.65) * self.progress
            document.documentElement.style.setProperty('--p-opacity', String(opacity))
          },
        })

        ScrollTrigger.create({
          trigger: '#global-scroll-track',
          start: '92% top',
          end: '100% top',
          onEnter: () => {
             document.documentElement.style.setProperty('--p-morph', '4')
             document.documentElement.style.setProperty('--p-flash', '2.0')
             setTimeout(() => document.documentElement.style.setProperty('--p-flash', '0'), 200)
          },
          onEnterBack: () => {
             document.documentElement.style.setProperty('--p-morph', '4')
          }
        })
      }

      // UI Entrance Animations
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
             trigger: '#global-scroll-track',
             start: '90% top',
             toggleActions: 'play none none reverse',
          }
        }
      )

      gsap.fromTo(
        wrapperRefs.current.filter(Boolean),
        { opacity: 0, y: 60, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.0,
          stagger: 0.15,
          ease: 'back.out(1.2)',
          scrollTrigger: {
             trigger: '#global-scroll-track',
             start: '92% top',
             toggleActions: 'play none none reverse',
          }
        }
      )

    },
    { scope: sectionRef, dependencies: [prefersReducedMotion, isMobile] }
  )

  return (
    <section
      ref={sectionRef}
      id="contact"
      aria-label="Contact Information"
      className="absolute inset-0 z-[5] w-full flex flex-col items-center justify-center overflow-hidden pointer-events-none"
      style={{
        opacity: 0,
        padding: isMobile ? 'var(--space-xl) var(--space-md)' : 'var(--space-2xl) var(--space-lg)',
      }}
    >
      {/* Background Dimmer */}
      {!prefersReducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0, 0, 0, 0.4) 100%)',
          }}
        />
      )}

      {/* Section Title */}
      <div
        ref={titleRef}
        className="flex flex-col items-center gap-3 mb-16 md:mb-24 relative z-10"
      >
        <span
          className="font-mono text-sm tracking-[0.25em] font-bold"
          style={{ color: '#FF1A80', opacity: 0.8 }}
        >
          // 05
        </span>
        
        <KineticTitle text="Initiate Link" prefersReducedMotion={prefersReducedMotion} />
        
        <span
          className="font-mono text-xs md:text-sm tracking-[0.2em] uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ScrambleText text="AWAITING TRANSMISSION" speed={40} />
        </span>
      </div>

      {/* Contact Links Container */}
      <div 
        ref={listRef}
        className="w-full max-w-4xl flex flex-col gap-6 md:gap-8 relative z-10"
      >
        {CONTACT_LINKS.map((link, idx) => (
          <div 
             key={link.id} 
             ref={el => wrapperRefs.current[idx] = el}
             style={{ perspective: '1200px' }} // Wrapper specific for reliable GSAP animation vs Child 3D Tilting
          >
             <HolographicCard link={link} prefersReducedMotion={prefersReducedMotion} />
          </div>
        ))}
      </div>
      
      {/* Footer / Exit Node */}
      <div className="absolute bottom-6 md:bottom-12 left-0 w-full flex justify-center opacity-50 font-mono text-[9px] md:text-xs tracking-[0.3em] text-[var(--text-secondary)] pointer-events-none">
         SIGNAL TERMINATED // END OF PORTFOLIO
      </div>
    </section>
  )
}
