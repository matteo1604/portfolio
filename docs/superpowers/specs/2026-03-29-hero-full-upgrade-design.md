# Hero Full Upgrade — Design Spec
**Date:** 2026-03-29
**Status:** Approved

---

## Scope

Upgrade completo della sezione Hero del portfolio. Interventi su:
- Entry timeline DOM (riprogettata con char-split e risposta whoami)
- Mouse parallax sui layer DOM
- NodeNetwork 3D (camera wake-up + bloom intro)
- Scroll exit stratificato per layer
- Fix cursore lampeggiante

Nessuna modifica all'architettura esistente. Nessuna dipendenza aggiuntiva.

---

## 1. Entry Timeline DOM

### Sequenza

| Tempo | Elemento | Animazione |
|-------|----------|------------|
| t=0.0 | `prompt1` (`→ whoami`) | `opacity: 0→1`, duration 0.4s, power2.out |
| t=0.5 | `roleRef` ("Frontend Developer & Creative Engineer") | Typing char-by-char via GSAP stagger su `innerText` split, 0.8s totale |
| t=1.4 | `matteoRef` (span "Matteo") | `opacity: 0→1`, `y: 20→0`, duration 0.5s, EASING.smooth |
| t=1.7 | `raineriChars` (8 lettere di "Raineri") | `clipPath: inset(100% 0 0 0)→inset(0% 0 0 0)`, stagger 0.04s, EASING.dramatic per lettera, duration 0.7s per lettera |
| t=2.8 | `prompt2` (`→ cat mission.txt`) | `opacity: 0→1`, duration 0.4s, power2.out |
| t=3.1 | `descBlockRef` | `opacity: 0→1`, `y: 24→0`, duration 0.8s, EASING.dramatic |
| t=4.0 | `scrollIndicatorRef` | `opacity: 0→1`, duration 0.6s, power2.out |

### Struttura DOM aggiornata

Il `<h1>` viene ristrutturato: "Matteo" e "Raineri" diventano due `<span>` separati con ref propri. "Raineri" viene splittato in 8 `<span>` individuali renderizzati via `.split('')` in JSX — nessuna libreria esterna:

```tsx
const raineriCharRefs = useRef<(HTMLSpanElement | null)[]>([])

{'Raineri'.split('').map((char, i) => (
  <span
    key={i}
    ref={el => { raineriCharRefs.current[i] = el }}
    style={{ display: 'inline-block', clipPath: 'inset(100% 0 0 0)' }}
  >
    {char}
  </span>
))}
```

GSAP anima `raineriCharRefs.current` come array con `stagger: 0.04`.

La risposta al `whoami` è un nuovo elemento `roleRef` tra `prompt1` e `<h1>`:
```
→ whoami
Frontend Developer & Creative Engineer     ← nuovo
Matteo
Raineri
→ cat mission.txt
...
```

### Typing effect per il role

Implementato senza librerie: l'array di caratteri viene rivelato via GSAP `stagger` su `opacity` (0→1) di ogni `<span>` char — non `innerText` mutation (che causerebbe reflow). I caratteri esistono nel DOM già al mount, invisibili.

---

## 2. Mouse Parallax DOM

### Meccanismo

`window.addEventListener('mousemove')` registrato nel `useGSAP` scope, con cleanup automatico.

A ogni evento:
```
normalizedX = (e.clientX / window.innerWidth - 0.5)   // -0.5 → +0.5
normalizedY = (e.clientY / window.innerHeight - 0.5)  // -0.5 → +0.5
```

Ogni layer riceve `gsap.to(ref.current, { x: normalizedX * intensity, y: normalizedY * intensity, duration: 1.2, ease: 'power2.out', overwrite: 'auto' })`.

### Intensità per layer

| Layer | Ref | Intensity X | Intensity Y |
|-------|-----|-------------|-------------|
| prompt1 + roleRef | `topGroupRef` | 14 | 8 |
| nameRef (Matteo + Raineri) | `nameRef` | 28 | 16 |
| descBlockRef | `descBlockRef` | 18 | 10 |

I layer vengono wrappati in un elemento comune per prompt+role, e il nome riceve l'intensità maggiore (è il focal point, deve "fluttuare" di più).

Il parallax è disabilitato se `prefersReducedMotion` è true.

---

## 3. NodeNetwork — Camera Wake-Up + Bloom Intro

### Camera

La camera non accetta `useFrame` direttamente per l'animazione iniziale — viene gestita via `useRef<THREE.PerspectiveCamera>` passato come prop a `HeroCanvas`, che lo espone al `NodeNetwork`.

Al mount del `NodeNetwork`:
- Camera inizia a `z=8`
- Nei primi 3 secondi (`t < 3`), `camera.position.z` interpola da 8 a 12 con easing `1 - Math.pow(1 - progress, 3)` (cubicOut)

Implementazione in `useFrame`:
```typescript
const introRef = useRef({ started: false, startTime: 0 })

useFrame((state) => {
  if (!introRef.current.started) {
    introRef.current.started = true
    introRef.current.startTime = state.clock.elapsedTime
  }
  const elapsed = state.clock.elapsedTime - introRef.current.startTime
  if (elapsed < 3) {
    const t = elapsed / 3
    const eased = 1 - Math.pow(1 - t, 3)
    state.camera.position.z = 8 + (12 - 8) * eased
  }
})
```

### Nodi fade-in

I nodi iniziano con `opacity=0`. Nel `useFrame`, ogni nodo ha un `fadeDelay` random (0→2s) — quando `elapsed > fadeDelay`, l'opacity interpola verso il valore target (0.4 × depthFade).

### Bloom intro

`HeroCanvas` gestisce il Bloom con `useState<number>` inizializzato a `1.2`. Un `useEffect` one-shot lancia un loop `requestAnimationFrame` della durata di 2.5s che interpola il valore da `1.2` a `0.4` con easing cubicOut, poi chiama `setState` una volta per frame durante quei 2.5s e cancella il loop al termine. È l'unico caso in cui si usa `setState` per un'animazione — giustificato perché avviene una volta sola al mount e non è frame-level dopo la transizione.

```typescript
// HeroCanvas.tsx — dentro il componente
const [bloomIntensity, setBloomIntensity] = useState(1.2)

useEffect(() => {
  const start = performance.now()
  const duration = 2500
  let raf: number
  const tick = () => {
    const t = Math.min((performance.now() - start) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    setBloomIntensity(1.2 - (1.2 - 0.4) * eased)
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}, [])
```

---

## 4. Scroll Exit Stratificato

Ogni layer ha il proprio `ScrollTrigger` indipendente con `scrub: true`. Tutti i trigger hanno lo stesso `trigger: sectionRef.current`, ma range diversi.

| Layer | start | end | y finale | opacity finale |
|-------|-------|-----|----------|----------------|
| scrollIndicator | `top top` | `8% top` | — | 0 |
| prompt1 + role | `top top` | `25% top` | -60 | 0 |
| descBlock | `5% top` | `35% top` | -50 | 0 |
| nameRef | `top top` | `40% top` | -30 | 0 |

Il `nameRef` esce per ultimo e con il minore spostamento verticale — "Raineri" rimane visibile più a lungo mentre il visitatore inizia a scorrere.

I trigger multipli sullo stesso elemento (`sectionRef`) sono supportati da ScrollTrigger senza conflitti.

---

## 5. Cursore Hero (.hero-cursor)

In `src/styles/base.css`, aggiungere:

```css
@keyframes hero-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.hero-cursor {
  animation: hero-cursor-blink 1s step-end infinite;
}
```

---

## File modificati

| File | Tipo modifica |
|------|--------------|
| `src/components/sections/HeroSection.tsx` | Ristrutturazione DOM, nuovi ref, entry timeline, parallax, scroll exit |
| `src/components/three/NodeNetwork.tsx` | Camera wake-up, nodi fade-in |
| `src/components/three/HeroCanvas.tsx` | Bloom intro (AnimatedBloom component) |
| `src/styles/base.css` | Keyframe cursore |

---

## Vincoli

- Nessuna dipendenza aggiuntiva (no `split-type` — char-split fatto manualmente)
- `prefersReducedMotion: true` → tutte le animazioni saltate, tutti gli elementi visibili subito
- TypeScript strict — nessun `any`
- Componenti sotto 150 righe — se `HeroSection` cresce, estrarre `useHeroAnimations` hook
- Il char-split di "Raineri" in `<span>` individuali deve essere accessibile: l'`<h1>` mantiene aria semantica corretta

---

## Non in scope

- Modifica al design tokens
- Aggiunta di nuove sezioni
- Refactor del layout generale
- Mobile-specific breakpoints (il parallax si disabilita sotto 768px)
