/**
 * About section slide data.
 *
 * Each phrase is an array of { text, accent } segments so the component
 * can wrap accent words in highlighted spans while still splitting
 * every word individually for the GSAP animation.
 */

export interface PhraseSegment {
  text: string
  accent: boolean
}

export interface AboutSlide {
  startLine: number
  endLine: number
  phrase: PhraseSegment[]
  sub: string
}

export const ABOUT_SLIDES: AboutSlide[] = [
  {
    startLine: 8,
    endLine: 11,
    phrase: [
      { text: 'Engineering ', accent: false },
      { text: 'logic. ', accent: true },
      { text: 'Creative ', accent: false },
      { text: 'execution.', accent: true },
    ],
    sub: "I'm Matteo. A Computer Engineering student crafting high-performance, interactive ecosystems. The browser is no longer a document viewer; it's a spatial rendering engine.",
  },
  {
    startLine: 13,
    endLine: 15,
    phrase: [
      { text: 'Algorithms as ', accent: false },
      { text: 'pure art.', accent: true },
    ],
    sub: 'Coming from a rigorous CS background, I approach frontend procedurally. Every shader, particle system, and kinetic scroll mechanic is built on mathematical precision.',
  },
  {
    startLine: 17,
    endLine: 19,
    phrase: [
      { text: 'WebGL meets ', accent: false },
      { text: 'the DOM.', accent: true },
    ],
    sub: 'React for architectural stability. Three.js for dimensional depth. GSAP for surgical animation timing. No bloat, no generic templates. Pure kinetic impact.',
  },
  {
    startLine: 21,
    endLine: 24,
    phrase: [
      { text: 'Stop telling. ', accent: false },
      { text: 'Start showing.', accent: true },
    ],
    sub: 'Words are cheap. Real digital craftsmanship is felt in the mouse drag, the scroll velocity, and the micro-interactions. You are experiencing my resumé right now.',
  },
]

/** Flatten phrase segments into individual words with accent flag preserved. */
export interface WordToken {
  word: string
  accent: boolean
  index: number
}

export function tokenizePhrase(segments: PhraseSegment[]): WordToken[] {
  const tokens: WordToken[] = []
  let idx = 0
  for (const seg of segments) {
    const words = seg.text.trim().split(/\s+/)
    for (const w of words) {
      if (w) {
        tokens.push({ word: w, accent: seg.accent, index: idx++ })
      }
    }
  }
  return tokens
}
