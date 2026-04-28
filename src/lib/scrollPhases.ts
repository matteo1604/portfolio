export const toScrollTrigger = (value: number) => `${value}% top`

export const toProgress = (value: number) => value / 100

export const SECTION_SCROLL = {
  about: {
    revealStart: 12,
    revealEnd: 16,
    activeStart: 12,
    activeEnd: 40,
    exitStart: 40,
    exitEnd: 43,
  },
  skills: {
    ambientStart: 41,
    ambientEnd: 43,
    copyStart: 43,
    copyEnd: 47,
    focusStart: 47,
    focusEnd: 70,
    exitStart: 70,
    exitEnd: 72,
  },
} as const
