import { type CSSProperties, type PropsWithChildren, useEffect } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'

import { useMousePosition } from '@/hooks/useMousePosition'

export default function CenteredLayout({ children }: PropsWithChildren) {
  const mousePosition = useMousePosition()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    mouseX.set(mousePosition.x ?? 0)
    mouseY.set(mousePosition.y ?? 0)
  }, [mousePosition, mouseX, mouseY])

  const springX = useSpring(mouseX, { stiffness: 50, damping: 10 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 10 })
  const rotateX = useTransform(springY, [0, window.innerHeight], [1.5, -1.5])
  const rotateY = useTransform(springX, [0, window.innerWidth], [-1.5, 1.5])
  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`

  const dotPattern: CSSProperties = {
    backgroundImage: 'radial-gradient(circle, currentColor 2px, transparent 2px)',
    backgroundSize: '48px 48px',
    width: 'calc(100% + 60px)',
    height: 'calc(100% + 60px)',
    left: '-30px',
    top: '-30px',
  }

  return (
    <main className="bg-background relative flex h-screen w-screen flex-col items-center justify-center gap-3 overflow-hidden">
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          ...dotPattern,
          transform,
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
        }}
      />
      <div
        className="to-background/10 pointer-events-none absolute inset-0 z-0 bg-linear-to-tr from-transparent"
        aria-hidden="true"
      />
      <div className="from-background absolute inset-0 z-0 bg-linear-to-t to-transparent" />
      {children}
    </main>
  )
}
