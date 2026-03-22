import { useContext } from 'react'
import { ScrollContext } from '@/components/layout/ScrollContext'

export function useScrollVelocity(): number {
  return useContext(ScrollContext).velocity
}
