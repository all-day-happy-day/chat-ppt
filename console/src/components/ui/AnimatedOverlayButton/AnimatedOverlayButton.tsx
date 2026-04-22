import * as React from 'react'
import { useState } from 'react'
import { motion, type Transition } from 'framer-motion'

import { cn } from '@/lib/utils'

import type { AnimatedOverlayButtonProps } from './AnimatedOverlayButton.type'

export function AnimatedOverlayButton({
  children,
  className,
  color = 'var(--color-foreground)',
  ...props
}: AnimatedOverlayButtonProps): React.JSX.Element {
  const [hovered, setHovered] = useState<boolean>(false)

  const transitionProps: Transition = {
    duration: 0.2,
    ease: 'circInOut',
  }

  return (
    <button
      className={cn(
        'text-foreground relative flex items-center gap-2 overflow-hidden bg-transparent transition-all outline-none focus:outline-none',
        className
      )}
      onMouseEnter={(): void => setHovered(true)}
      onMouseLeave={(): void => setHovered(false)}
      {...props}
    >
      <motion.div
        className="absolute inset-0 z-0 outline-none focus:outline-none"
        initial={{ x: '-100%' }}
        animate={{ x: hovered ? '0%' : '-100%' }}
        transition={transitionProps}
        style={{ backgroundColor: color }}
      >
        <div className="relative z-10 flex items-center outline-none focus:outline-none">{children}</div>
        <motion.div
          className="text-background absolute inset-0 z-10 flex items-center outline-none focus:outline-none"
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: hovered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }}
          transition={transitionProps}
        >
          <div className="flex items-center">{children}</div>
        </motion.div>
      </motion.div>
    </button>
  )
}
