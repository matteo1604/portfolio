import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import vertexShader from './shaders/liquidDistortion.vert?raw'
import fragmentShader from './shaders/liquidDistortion.frag?raw'

/**
 * LiquidDistortion — Fullscreen quad that renders "MATTEO" via offscreen
 * Canvas2D texture, then applies simplex noise displacement, mouse ripple,
 * and chromatic aberration through a custom fragment shader.
 */
export function LiquidDistortion() {
  const { size } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5))
  const prevMouseRef = useRef(new THREE.Vector2(0.5, 0.5))
  const mouseVelocityRef = useRef(0)
  const revealRef = useRef({ value: 0 })
  const textureRef = useRef<THREE.CanvasTexture | null>(null)
  const fontReadyRef = useRef(false)

  // Create offscreen canvas texture with "MATTEO"
  const { canvas, canvasTexture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 2048
    c.height = 1024
    const tex = new THREE.CanvasTexture(c)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    textureRef.current = tex
    return { canvas: c, canvasTexture: tex }
  }, [])

  // Draw text on canvas — called once font is ready and on resize
  const drawText = useRef((w: number) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Name — large, dominant
    const nameFontSize = Math.round(Math.min(w * 0.18, 400) * (canvas.width / w))
    ctx.font = `700 ${nameFontSize}px 'Clash Display', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText('MATTEO', canvas.width / 2, canvas.height / 2 - nameFontSize * 0.25)

    // Surname — smaller, below, wider tracking
    const surnameFontSize = Math.round(nameFontSize * 0.45)
    ctx.font = `500 ${surnameFontSize}px 'Clash Display', sans-serif`
    ctx.letterSpacing = `${surnameFontSize * 0.08}px`
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText('RAINERI', canvas.width / 2, canvas.height / 2 + nameFontSize * 0.45)

    canvasTexture.needsUpdate = true
  })

  // Wait for font, then draw
  useEffect(() => {
    document.fonts.ready.then(() => {
      fontReadyRef.current = true
      drawText.current(size.width)
    })
  }, [size.width, size.height, canvas, canvasTexture])

  // Shader material uniforms
  const uniforms = useMemo(
    () => ({
      uTextTexture: { value: canvasTexture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseVelocity: { value: 0 },
      uReveal: { value: 0 },
      uNoiseScale: { value: 3.0 },
      uNoiseStrength: { value: 0.025 },
      uChromaticStrength: { value: 0.004 },
      uRippleStrength: { value: 0.05 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uScrollProgress: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Reveal animation via GSAP (animates a Three.js uniform, not DOM)
  useEffect(() => {
    const tweenTarget = revealRef.current
    gsap.to(tweenTarget, {
      value: 1,
      duration: 4.5,
      delay: 0.5,
      ease: 'power1.inOut',
      onUpdate: () => {
        uniforms.uReveal.value = tweenTarget.value
      },
    })
  }, [uniforms])

  // Track mouse position from DOM events (pointer-events: none on canvas,
  // so we listen on document)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.set(e.clientX / size.width, 1 - e.clientY / size.height)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        mouseRef.current.set(touch.clientX / size.width, 1 - touch.clientY / size.height)
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [size.width, size.height])

  // Update resolution uniform on resize
  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height)
    // Redraw text at new size
    if (fontReadyRef.current) {
      drawText.current(size.width)
    }
  }, [size.width, size.height, uniforms])

  // Frame loop
  useFrame((state) => {
    const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined
    if (!mat) return

    // Time
    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Mouse smoothing — soft lerp for aqueous feel
    const mouse = mouseRef.current
    const prev = prevMouseRef.current
    const lerpFactor = 0.045
    mat.uniforms.uMouse.value.x += (mouse.x - mat.uniforms.uMouse.value.x) * lerpFactor
    mat.uniforms.uMouse.value.y += (mouse.y - mat.uniforms.uMouse.value.y) * lerpFactor

    // Velocity from smoothed position (not raw input) — avoids jitter
    const dx = mat.uniforms.uMouse.value.x - prev.x
    const dy = mat.uniforms.uMouse.value.y - prev.y
    const rawVelocity = Math.sqrt(dx * dx + dy * dy)
    mouseVelocityRef.current += (rawVelocity - mouseVelocityRef.current) * 0.08
    mat.uniforms.uMouseVelocity.value = Math.min(mouseVelocityRef.current * 18.0, 1.0)
    prev.set(mat.uniforms.uMouse.value.x, mat.uniforms.uMouse.value.y)

    // Read scroll progress from CSS var
    const rawProgress = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hero-progress') || '0',
    )
    mat.uniforms.uScrollProgress.value = Math.max(0, Math.min(1, rawProgress))
  })

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
