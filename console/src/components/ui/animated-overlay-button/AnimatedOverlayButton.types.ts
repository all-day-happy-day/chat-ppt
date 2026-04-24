import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface AnimatedOverlayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
  color?: string
}
