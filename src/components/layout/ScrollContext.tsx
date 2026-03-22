import { createContext, useContext } from 'react'
import type { ScrollState } from '@/types'

const defaultState: ScrollState = {
  progress: 0,
  velocity: 0,
  direction: 0,
}

export const ScrollContext = createContext<ScrollState>(defaultState)

export function useScroll(): ScrollState {
  return useContext(ScrollContext)
}
