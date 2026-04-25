import { cn } from '@/lib/utils'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('border-border bg-card rounded-lg border p-6 shadow-sm', className)}>{children}</div>
}
