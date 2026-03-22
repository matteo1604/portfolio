export const EASING = {
  smooth: [0.25, 0.46, 0.45, 0.94],
  dramatic: [0.16, 1, 0.3, 1],
  snappy: [0.87, 0, 0.13, 1],
} as const

export const DURATION = {
  fast: 0.3,
  normal: 0.6,
  slow: 1.0,
  dramatic: 1.4,
} as const

export const STAGGER = {
  tight: 0.03,
  normal: 0.08,
  relaxed: 0.15,
} as const
