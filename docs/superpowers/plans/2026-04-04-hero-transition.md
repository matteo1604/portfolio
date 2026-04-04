# Hero Transition — Slow Burn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rimpiazzare la transizione hero da 3.5s confusa con una sequenza cinematica da 8s: convergenza lenta (3.5s), overshoot+snap delle particelle (0.5s), chrome text scale+opacity expo-out (1.5s), DOM layer.

**Architecture:** Tre file toccati in isolamento — ParticleNetwork aggiunge l'API overshoot, ChromeText aggiunge setScale, HeroScene coordina la nuova macchina a 5 fasi. Nessuna dipendenza circolare.

**Tech Stack:** React Three Fiber, Three.js, TypeScript strict

---

## File Changes

| File | Modifica |
|------|----------|
| `src/components/three/ParticleNetwork.tsx` | Aggiunge `setOvershoot(v)` a interfaccia + logica overshoot nel loop |
| `src/components/three/ChromeText.tsx` | Aggiunge `setScale(v)` a interfaccia + applica scala nel loop |
| `src/components/three/HeroScene.tsx` | Riscrive macchina a fasi: `idle → converging → crystallizing → chrome_in → settled` |

---

## Task 1: ParticleNetwork — API overshoot

**Files:**
- Modify: `src/components/three/ParticleNetwork.tsx`

- [ ] **Step 1: Aggiungi `setOvershoot` all'interfaccia `ParticleNetworkRef`**

Trova l'interfaccia (riga ~119) e aggiungi il metodo:

```typescript
export interface ParticleNetworkRef {
  setConvergence:    (v: number) => void
  setMouseWorld:     (x: number, y: number) => void
  setScrollProgress: (v: number) => void
  setOvershoot:      (v: number) => void   // ← nuovo
}
```

- [ ] **Step 2: Aggiungi `overshootRef` tra i ref mutabili del componente**

Subito dopo `const scrollRef = useRef(0)` (riga ~139):

```typescript
const overshootRef = useRef(0)
```

- [ ] **Step 3: Registra `setOvershoot` nell'API imperativa**

Nel `useEffect` che scrive su `networkRef.current` (riga ~220), aggiungi il metodo:

```typescript
;(networkRef as React.MutableRefObject<ParticleNetworkRef>).current = {
  setConvergence:    (v) => { convergenceRef.current = v },
  setMouseWorld:     (x, y) => { mouseWorldRef.current = [x, y] },
  setScrollProgress: (v) => { scrollRef.current = v },
  setOvershoot:      (v) => { overshootRef.current = v },  // ← nuovo
}
```

- [ ] **Step 4: Sostituisci il blocco `converge to text target` nel loop con la logica che gestisce overshoot**

Trova il blocco `else` del `if (!shouldConverge)` (attorno alla riga ~259). Sostituisci l'intero blocco:

```typescript
      } else {
        // ── Converge to text target ──────────────────────────────────
        const tgt = targetPositions.current as Float32Array
        const tx  = tgt[i3], ty = tgt[i3 + 1], tz = tgt[i3 + 2]

        const overshoot = overshootRef.current
        if (overshoot > 0) {
          // ── Crystallizing: lock to target + radial overshoot ────────
          // Skip lerp entirely — position is target + radial displacement
          const len = Math.sqrt(tx * tx + ty * ty)
          if (len > 0.01) {
            px = tx + (tx / len) * overshoot * 0.18
            py = ty + (ty / len) * overshoot * 0.18
          } else {
            px = tx; py = ty
          }
          pz = tz
        } else {
          // ── Normal convergence lerp ──────────────────────────────────
          // Stagger based on distance from text center — center arrives first
          const dFromCenter = Math.abs(tx)
          const staggerDelay = (dFromCenter / (WORLD_TEXT_W * 0.5)) * 0.35
          const localConv = Math.max(0, Math.min(1, (conv - staggerDelay) / (1 - staggerDelay + 0.001)))
          // Power3 ease-in-out
          const eased = localConv < 0.5
            ? 4 * localConv * localConv * localConv
            : 1 - Math.pow(-2 * localConv + 2, 3) / 2

          const approach = eased * 0.055
          px += (tx - px) * approach
          py += (ty - py) * approach
          pz += (tz - pz) * approach
        }
      }
```

- [ ] **Step 5: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/components/three/ParticleNetwork.tsx
git commit -m "feat: add setOvershoot API to ParticleNetwork with radial crystallize effect"
```

---

## Task 2: ChromeText — API setScale

**Files:**
- Modify: `src/components/three/ChromeText.tsx`

- [ ] **Step 1: Aggiungi `setScale` all'interfaccia `ChromeTextRef`**

```typescript
export interface ChromeTextRef {
  setVisible:        (v: boolean) => void
  setOpacity:        (v: number)  => void
  setMouseInfluence: (x: number, y: number) => void
  setScrollProgress: (v: number) => void
  setScale:          (v: number)  => void   // ← nuovo
}
```

- [ ] **Step 2: Aggiungi `scaleRef` in `ChromeTextInner`**

Subito dopo `const opacityRef = useRef(0)` (riga ~26):

```typescript
const scaleRef = useRef(1)
```

- [ ] **Step 3: Registra `setScale` nell'API imperativa**

Nel `useEffect` che scrive su `chromeRef.current`:

```typescript
;(chromeRef as React.MutableRefObject<ChromeTextRef>).current = {
  setVisible:        (v) => { if (groupRef.current) groupRef.current.visible = v },
  setOpacity:        (v) => { opacityRef.current = v },
  setMouseInfluence: (x, y) => { mouseRef.current = [x, y] },
  setScrollProgress: (v) => { scrollRef.current = v },
  setScale:          (v) => { scaleRef.current = v },   // ← nuovo
}
```

- [ ] **Step 4: Applica la scala al group nel `useFrame`**

Nel blocco `if (groupRef.current)` dentro `useFrame` (attorno alla riga ~57), aggiungi la riga della scala prima di rotation e position:

```typescript
    if (groupRef.current) {
      groupRef.current.scale.setScalar(scaleRef.current)   // ← nuovo
      groupRef.current.rotation.x = currentRotRef.current[0]
      groupRef.current.rotation.y = currentRotRef.current[1]
      // Scroll: push chrome in z
      groupRef.current.position.z = scrollRef.current * 4
    }
```

- [ ] **Step 5: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/components/three/ChromeText.tsx
git commit -m "feat: add setScale API to ChromeText for entrance animation"
```

---

## Task 3: HeroScene — macchina a 5 fasi

**Files:**
- Modify: `src/components/three/HeroScene.tsx`

- [ ] **Step 1: Aggiorna la union type `Phase`**

Riga 7 — sostituisci:

```typescript
type Phase = 'idle' | 'converging' | 'crystallizing' | 'chrome_in' | 'settled'
```

- [ ] **Step 2: Riscrivi l'intero blocco Phase machine dentro `useFrame`**

Trova il blocco `// ── Phase machine ──` (dalla riga ~86 a ~117). Sostituisci tutto con:

```typescript
    // ── Phase machine ────────────────────────────────────────────────────
    const phase = phaseRef.current

    if (phase !== 'idle') {
      if (triggerTimeRef.current === null) triggerTimeRef.current = t
      const elapsed = t - triggerTimeRef.current

      if (phase === 'converging') {
        // 0 → 3.5s: convergenza lenta, Power3 ease-in-out
        const raw = Math.min(elapsed / 3.5, 1)
        convergenceRef.current = easeInOut3(raw)
        networkApiRef.current?.setOvershoot(0)
        if (elapsed >= 3.5) {
          convergenceRef.current = 1
          phaseRef.current = 'crystallizing'
        }
      }

      if (phase === 'crystallizing') {
        // 3.5 → 4.0s: overshoot radiale sin(t·π), poi snap
        convergenceRef.current = 1
        const crystalT = Math.min((elapsed - 3.5) / 0.5, 1)
        const overshoot = Math.sin(crystalT * Math.PI)
        networkApiRef.current?.setOvershoot(overshoot)
        if (elapsed >= 4.0) {
          networkApiRef.current?.setOvershoot(0)
          chromeApiRef.current?.setVisible(true)
          chromeApiRef.current?.setOpacity(0)
          chromeApiRef.current?.setScale(0.96)
          phaseRef.current = 'chrome_in'
        }
      }

      if (phase === 'chrome_in') {
        // 4.0 → 5.5s: scale 0.96→1 + opacity 0→1, expo-out quartica
        convergenceRef.current = 1
        networkApiRef.current?.setOvershoot(0)
        const chromeT = Math.min((elapsed - 4.0) / 1.5, 1)
        // Expo-out quartica: 1 - (1-t)^4  →  80% opacità nei primi ~0.4s
        const eased = 1 - Math.pow(1 - chromeT, 4)
        chromeApiRef.current?.setOpacity(eased)
        chromeApiRef.current?.setScale(0.96 + 0.04 * eased)
        if (elapsed >= 5.5) {
          chromeApiRef.current?.setOpacity(1)
          chromeApiRef.current?.setScale(1)
          phaseRef.current = 'settled'
          document.documentElement.style.setProperty('--hero-animation-complete', '1')
        }
      }

      if (phase === 'settled') {
        convergenceRef.current = 1
        networkApiRef.current?.setOvershoot(0)
        chromeApiRef.current?.setOpacity(1)
        chromeApiRef.current?.setScale(1)
      }
    }
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore. Se TypeScript segnala che `setOvershoot` o `setScale` non esistono su `ParticleNetworkRef`/`ChromeTextRef`, controllare che i Task 1 e 2 siano stati completati correttamente.

- [ ] **Step 4: Avvia il dev server e verifica visivamente**

```bash
npm run dev
```

Sequenza attesa dal primo movimento del mouse:
1. **0–3.5s:** le particelle si muovono lentamente verso la forma del testo, costruendo tensione
2. **3.5–4.0s:** le particelle "rimbalzano" leggermente verso l'esterno (overshoot radiale) poi tornano al target
3. **4.0–5.5s:** MATTEO/RAINERI in chrome appare emergendo dalla distanza (scala + opacity)
4. **5.5s+:** il DOM layer (subtitle, tagline, HUD) appare in sequenza

- [ ] **Step 5: Commit**

```bash
git add src/components/three/HeroScene.tsx
git commit -m "feat: hero transition slow burn — 5-phase machine, 3.5s convergence, crystallize overshoot, chrome expo-out"
```
