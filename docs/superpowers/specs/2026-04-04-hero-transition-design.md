# Hero Transition — Slow Burn Cinematico

**Date:** 2026-04-04  
**Status:** Approved

## Problem

La transizione hero attuale (trigger → nome visibile) dura 3.5s ed è percepita come troppo veloce e confusa:
- Convergenza 2s: le particelle "rushano" senza senso di peso
- Chrome text fade lineare: nessun momento drammatico
- Nessuna pausa tra arrivo particelle e comparsa nome
- DOM layer appare immediatamente dopo il chrome, tutto si sovrappone

## Design

### Macchina a Fasi

```
idle → converging → crystallizing → chrome_in → settled
```

| Fase | Durata | Trigger uscita |
|------|--------|----------------|
| `idle` | ∞ | prima pointermove (desktop) / 1.5s auto (mobile) |
| `converging` | 3.5s | elapsed ≥ 3.5s |
| `crystallizing` | 0.5s | elapsed ≥ 4.0s |
| `chrome_in` | 1.5s | elapsed ≥ 5.5s |
| `settled` | ∞ | — |

Timeline visiva (8s totali da trigger):
```
0    1    2    3    4    5    6    7    8
|    |    |    |    |    |    |    |    |
[idle]
      [--- converging 3.5s ---][⚡][-- chrome 1.5s --][DOM...]
```

### Fase: converging (0 → 3.5s)

- Invariata rispetto all'attuale, ma durata estesa 2s → **3.5s**
- Curva: Power3 ease-in-out (`t < 0.5 ? 4t³ : 1 - (-2t+2)³/2`)
- Le particelle si muovono con più peso, costruendo tensione progressiva
- Lo stagger per distanza dal centro del testo rimane invariato

### Fase: crystallizing (3.5 → 4.0s)

**Effetto:** micro-overshoot radiale + snap.

- Le particelle converging sono al target. La lerp verso target è **disabilitata**.
- Ogni particella riceve uno spostamento radiale rispetto all'origine del testo (0,0):
  ```
  direction = normalize(target.xy)
  displacement = direction * sin(crystalT * π) * 0.18
  pos = target + displacement
  ```
  dove `crystalT` va 0→1 in 0.5s (lineare)
- La curva `sin(t·π)` produce 0 → picco (t=0.5) → 0: le particelle escono dal target e ci tornano
- Ampiezza 0.18 world units — visibile ma non esagerato (~2% della larghezza viewport)
- Al termine (crystalT=1): snap preciso a `pos = target`, overshoot = 0

**API aggiunta a ParticleNetworkRef:**
```typescript
setOvershoot(v: number): void  // v ∈ [0, 1], dove 1 = picco (HeroScene guida)
```

> HeroScene chiama `setOvershoot(sin(crystalT * π))` ogni frame — non un valore 0-1 lineare.

### Fase: chrome_in (4.0 → 5.5s)

**Effetto:** scale 0.96→1 + opacity 0→1 con curva expo-out aggressiva.

- Curva opacity: `1 - Math.pow(1 - t, 4)` (expo-out quartica) — 80% dell'opacità arriva in 0.4s
- Scale: `0.96 + 0.04 * eased` su tutti e tre gli assi (X, Y, Z)
- La scala parte leggermente compressa → emerge dalla distanza

**API aggiunta a ChromeTextRef:**
```typescript
setScale(v: number): void  // v ∈ [0.96, 1.0]
```

### Fase: settled

- `convergenceRef.current = 1`, overshoot = 0, scale = 1, opacity = 1
- Scrive `--hero-animation-complete = 1` → DOM layer entry timeline parte
- DOM layer invariato (subtitle, tagline words, HUD, scroll indicator)

---

## Modifiche per File

### `src/components/three/HeroScene.tsx`
- Aggiunge fase `'crystallizing'` e `'chrome_in'` alla union type `Phase`
- Riscrive il blocco phase machine: 5 fasi, nuovi timing
- `converging`: durata 3.5s (era 2.0s)
- `crystallizing`: calcola `crystalT`, chiama `setOvershoot(sin(crystalT * π))`
- `chrome_in`: calcola `chromeT` con expo-out quartica, chiama `setOpacity` + `setScale`
- `settled`: rimuove la chiamata a `setOpacity(1)` ridondante (già gestita da chrome_in)

### `src/components/three/ParticleNetwork.tsx`
- Aggiunge `setOvershoot(v: number)` a `ParticleNetworkRef`
- Aggiunge `overshootRef = useRef(0)`
- Nel loop `useFrame`, quando `conv >= 1 && overshoot > 0`:
  - Per ogni particella converging: applica `pos = target + normalize(target.xy) * overshoot * 0.18`
  - Bypassa la lerp normale (usa posizione diretta)
- Aggiornamento dell'API imperativa in `useEffect`

### `src/components/three/ChromeText.tsx`
- Aggiunge `setScale(v: number)` a `ChromeTextRef`
- Applica la scala al mesh/group nel `useFrame` tramite ref

---

## Non in scope

- Modifiche al DOM entry timeline (timing o animazioni)
- Modifiche al mobile path (mantiene auto-trigger 1.5s, convergenza invariata in durata — mobile è già più corta)
- Post-processing (bloom flash) — escluso per semplicità e performance

## Rischi

- **Overshoot su mobile:** disabilitato implicitamente perché la fase crystallizing usa `isConverging` che vale solo per particelle converging; su mobile nessuna differenza visibile
- **ChromeText setScale:** verificare che il mesh/group esista al momento della chiamata (potrebbe non essere pronto nel primissimo frame di chrome_in)
