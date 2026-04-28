import type { User } from '@/domain/models/user'

export function ProfileMenu({ user }: { user: User }) {
  return (
    <div className="bg-accent/50 mb-1 flex scale-x-103 flex-col justify-center gap-1 rounded-t-[0.575rem] p-3 pr-24 pb-4">
      <h1 className="text-lg font-bold">{user.username}</h1>
      <p className="text-muted-foreground text-xs">{user.email}</p>
    </div>
  )
}
