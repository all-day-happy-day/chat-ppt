import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { AnimatePresence, motion } from 'framer-motion'

import { cn } from '@/lib/utils'

import { Spinner } from '../spinner/Spinner'

import { buttonVariants } from './button.constants'

import type { VariantProps } from 'class-variance-authority'

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel,
  children,
  disabled,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    loadingLabel?: string
  }) {
  const Comp = asChild ? Slot : 'button'

  const transition = {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
    mass: 0.5,
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), 'relative overflow-hidden', className)}
      disabled={disabled || loading}
      {...props}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <AnimatePresence>
          {loading && (
            <motion.div
              className="absolute flex items-center justify-center"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={transition}
            >
              <Spinner width={16} height={16} />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div className="flex items-center justify-center" transition={transition}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={loading ? 'loading-text' : 'normal-text'}
              className="block truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              {loading ? loadingLabel : children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </Comp>
  )
}
