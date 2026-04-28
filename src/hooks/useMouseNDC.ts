import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function useMouseNDC() {
  const mouse = useRef(new THREE.Vector2(0, 0))

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return mouse
}
