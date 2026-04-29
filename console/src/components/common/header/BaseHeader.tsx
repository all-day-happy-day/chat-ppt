import { cn } from '@/lib/utils'

import { Logo } from './logo/Logo'

export function BaseHeader({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <header
      className={cn(
        'bg-header shadow-accent/80 flex h-(--header-height) min-h-(--header-height) w-full items-center justify-between border-b border-none px-4 shadow-[0_0_20px]',
        className
      )}
    >
      <div className="flex items-center">
        <Logo />
      </div>
      {children}
    </header>
  )
}
