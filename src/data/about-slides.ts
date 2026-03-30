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
  prompt: string
  phrase: PhraseSegment[]
  sub: string
}

export const ABOUT_SLIDES: AboutSlide[] = [
  {
    prompt: 'cat about.txt',
    phrase: [
      { text: "I don't build websites. I build ", accent: false },
      { text: 'experiences.', accent: true },
    ],
    sub: 'CS Engineering student with an obsession for the space where logic meets aesthetics.',
  },
  {
    prompt: 'cat approach.txt',
    phrase: [
      { text: 'Every pixel has ', accent: false },
      { text: 'a reason.', accent: true },
      { text: ' Every animation ', accent: false },
      { text: 'communicates.', accent: true },
    ],
    sub: 'I think in components, animate with purpose, and obsess over the details that most people never notice — but always feel.',
  },
  {
    prompt: 'cat tools.txt',
    phrase: [
      { text: 'React is my ', accent: false },
      { text: 'framework.', accent: true },
      { text: ' The browser is my ', accent: false },
      { text: 'canvas.', accent: true },
    ],
    sub: 'TypeScript for safety. GSAP for scroll choreography. Three.js for the third dimension. Every tool chosen with intent — never by default.',
  },
  {
    prompt: 'cat mission.txt',
    phrase: [
      { text: 'Technology should be ', accent: false },
      { text: 'felt,', accent: true },
      { text: " not explained.", accent: false },
    ],
    sub: "That's why this portfolio doesn't describe what I can do. It shows you.",
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
