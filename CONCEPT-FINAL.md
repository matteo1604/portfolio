# Portfolio Concept Document — FINAL

## Identità

**Chi:** Studente di Ingegneria Informatica — Frontend & Backend
**Posizionamento:** Non il solito neolaureato con il template. Qualcuno che costruisce esperienze.
**Obiettivo:** Mostrare competenze per qualsiasi opportunità — agency, startup, freelance, azienda.

---

## Filosofia Centrale

> **"Non te lo spiego. Te lo faccio vivere."**

Ogni sezione del portfolio non descrive una competenza — la dimostra attraverso la propria implementazione.
Il visitatore non legge "so usare GSAP", lo sente nello scroll.
Non legge "so fare 3D", ci interagisce.

---

## Stack Tecnico

| Layer | Tecnologia | Ruolo |
|-------|-----------|-------|
| Framework | React 18 + Vite | SPA, HMR istantaneo, zero overhead SSR |
| Styling | Tailwind CSS 4 | Utility-first, design tokens via CSS vars |
| Scroll animations | GSAP + ScrollTrigger | Timeline cross-sezione, pin, scrub |
| Component animations | Framer Motion | Entrate, hover, transizioni locali |
| 3D | Three.js / React Three Fiber | Canvas isolato, esperienze WebGL |
| Smooth scroll | Lenis | Scroll normalizzato, velocity per effetti |
| Language | TypeScript strict | Type safety dall'inizio |
| Mono font code | JetBrains Mono | Per elementi code/tech nel UI |

### Regola di separazione motion

```
GSAP       → scroll-driven, timeline, cross-sezione, pin
Framer     → mount/unmount, hover, layout animations, varianti
Three/R3F  → canvas isolato, shader, geometrie, post-processing
```

Non si sovrappongono MAI.

---

## Design System

### Palette

| Token | Ruolo | Valore |
|-------|-------|--------|
| `--bg-primary` | Sfondo principale | `#0A0A0B` |
| `--bg-elevated` | Superfici elevate | `#141416` |
| `--bg-surface` | Cards, pannelli | `#1A1A1F` |
| `--border-subtle` | Bordi sottili | `rgba(255,255,255, 0.06)` |
| `--border-hover` | Bordi hover | `rgba(0, 212, 255, 0.2)` |
| `--text-primary` | Testo principale | `#E8E8EC` |
| `--text-secondary` | Testo secondario | `#6B6B76` |
| `--accent` | Blu elettrico / Ciano | `#00D4FF` |
| `--accent-dim` | Accent bassa opacità | `rgba(0, 212, 255, 0.15)` |
| `--accent-glow` | Glow / bloom | `rgba(0, 212, 255, 0.4)` |

### Tipografia

| Ruolo | Font | Peso | Note |
|-------|------|------|------|
| Display / Titoli | Clash Display | 500–700 | Da Fontshare, sharp e moderno |
| Body | Inter | 400–500 | Google Fonts, leggibile |
| Mono / Tech | JetBrains Mono | 400 | Per snippet, label tech |

### Principi visivi

1. **Spazio come lusso** — margini generosi, niente affollamento
2. **Movimento come linguaggio** — ogni animazione comunica, niente decorazione gratuita
3. **Contrasto cinematico** — luci e ombre, non flat design
4. **Dettagli che premiano l'attenzione** — micro-interazioni che si scoprono esplorando

---

## Struttura — Sezioni

### 1. HERO
**Esperienza:** Ambiente 3D immersivo che reagisce al mouse/scroll.
**Contenuto:** Nome, ruolo, invito a esplorare.
**Dimostra:** Three.js, shader, senso estetico.
**Sensazione:** "Questo non è un sito normale."

### 2. ABOUT
**Esperienza:** Testo che si rivela con lo scroll, frasi che arrivano con timing cinematico.
**Contenuto:** Chi sei, cosa fai, come pensi.
**Dimostra:** GSAP ScrollTrigger, orchestrazione, tipografia animata.
**Sensazione:** "Questa persona pensa al dettaglio."

### 3. SKILLS — Il Laboratorio Interattivo
**Esperienza:** Le competenze non sono listate — si dimostrano. Mini-demo, esperimenti inline, interazioni che il visitatore può provare.
**Contenuto:** Stack tecnico, competenze, creative coding.
**Dimostra:** Interattività avanzata, creative coding, profondità tecnica.
**Sensazione:** "Non me lo sta dicendo, me lo sta facendo provare."

### 4. PROJECTS
**Esperienza:** Case study cinematici con transizioni fluide.
**Contenuto:** 1–2 progetti iniziali, con spazio per espandere.
**Dimostra:** Capacità di costruire cose reali, attenzione alla presentazione.
**Sensazione:** "Voglio vedere di più."

### 5. CONTACT
**Esperienza:** Chiusura elegante, possibile richiamo all'hero.
**Contenuto:** Email, social links, CTA.
**Dimostra:** Cura fino all'ultimo pixel.
**Sensazione:** "Devo contattare questa persona."

---

## Sistema di Motion

### Curve base

```javascript
const EASING = {
  smooth: [0.25, 0.46, 0.45, 0.94],     // entrate generali
  dramatic: [0.16, 1, 0.3, 1],            // reveal importanti
  snappy: [0.87, 0, 0.13, 1],             // interazioni UI
}
```

### Pattern di entrata

| Pattern | Uso | Valori |
|---------|-----|--------|
| Fade up | Default per testo | opacity 0→1, y 40→0 |
| Clip reveal | Immagini, media | clip-path inset 100%→0% |
| Scale in | Cards, container | scale 0.95→1, opacity 0→1 |
| Char split | Solo titoli hero | Ogni lettera animata |

### Regole

1. Ogni animazione ha una ragione — se non comunica, toglila
2. Easing coerente — solo le 3 curve definite sopra
3. Stagger come ritmo — gli elementi entrano in sequenza, mai tutti insieme
4. Reduced motion rispettato sempre

---

## Architettura

```
src/
├── components/
│   ├── layout/           # ScrollContainer, Header, Footer
│   ├── sections/          # Hero, About, Skills, Projects, Contact
│   ├── ui/                # Button, Text, Card, Link
│   └── three/             # Scene, Effects, Geometries (R3F)
├── hooks/
│   ├── useScrollVelocity.ts
│   ├── useGSAP.ts
│   ├── useMediaQuery.ts
│   └── usePrefersReducedMotion.ts
├── lib/
│   ├── animations.ts      # Easing, durate, stagger constants
│   ├── registry.ts        # ScrollTrigger registry & cleanup
│   └── utils.ts
├── styles/
│   ├── tokens.css         # CSS custom properties
│   └── base.css           # Reset, tipografia, utilities
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

### Regole architetturali

1. Ogni sezione è un componente autonomo — propri hook, proprie animazioni
2. Lo stato globale è minimo — solo scroll position/velocity via Context
3. GSAP cleanup sempre — ogni useGSAP ha il suo revert/kill
4. Three.js vive nel suo Canvas — non leaks nel DOM React
5. CSS vars come bridge — GSAP scrive su CSS vars, React le legge (no re-render)
6. Mobile-first, poi enhance — reduced motion e touch supportati

---

## Fasi di Sviluppo

### Fase 1 — Fondamenta
- Setup Vite + React + TS + Tailwind + Lenis
- Design tokens in CSS vars
- Layout shell con ScrollContainer + sezioni vuote
- GSAP + Lenis integration
- Hook base (useGSAP, usePrefersReducedMotion)

### Fase 2 — Sezioni Core
- Hero con scena 3D base
- About con scroll-driven reveal
- Projects con layout e placeholder
- Contact

### Fase 3 — Sezione Wow
- Skills / Laboratorio interattivo
- Micro-interazioni globali
- Polish hero 3D

### Fase 4 — Polish
- Performance (Lighthouse, bundle)
- Responsive completo
- Reduced motion path
- Loading experience
- Deploy