import type { User } from '@/domain/models/user'
import { cn } from '@/lib/utils'

export function ProfileMenu({ user, className }: { user: User; className?: string }) {
  return (
    <div
      className={cn(
        'bg-accent/50 mb-1 flex scale-x-103 flex-col justify-center gap-1 rounded-t-[0.75rem] p-3 pr-24 pb-4',
        className
      )}
    >
      <h1 className="text-lg font-bold">{user.username}</h1>
      <p className="text-muted-foreground text-xs">{user.email}</p>
    </div>
  )
}
