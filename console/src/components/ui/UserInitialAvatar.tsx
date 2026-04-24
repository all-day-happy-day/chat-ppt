import { cn, getUserInitials } from '@/lib/utils'

type UserInitialAvatarProps = {
  username: string
  className?: string
}

export function UserInitialAvatar({ username, className }: UserInitialAvatarProps) {
  const initials: string = getUserInitials(username)

  return (
    <div
      className={cn(
        'bg-muted text-foreground inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold',
        className
      )}
      aria-label={`User avatar: ${username}`}
      title={username}
    >
      {initials}
    </div>
  )
}
