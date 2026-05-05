import { useState } from 'react'

import { useEventListener } from './useEventListener'

type MousePosition = {
  x: number | null
  y: number | null
}

export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: null, y: null })

  useEventListener('mousemove', (event: MouseEvent): void => {
    setPosition({
      x: event.clientX,
      y: event.clientY,
    })
  })

  return position
}
