import { useGetCurrentUser } from '@/api/query/auth.query'
import { UserInitialAvatar } from '@/components/ui/UserInitialAvatar'
import { getQueryData } from '@/lib/utils'

export function ProfileCard() {
  const currentUser = getQueryData(useGetCurrentUser())
  if (!currentUser) return null

  return (
    <div className="mt-4 flex h-full w-full flex-row items-center justify-start pl-8">
      <div className="flex w-full flex-col gap-4">
        <div className="w-full text-5xl font-bold">{currentUser.username}</div>
        <div className="text-muted-foreground text-lg">{currentUser.email}</div>
      </div>
      <div data-slot="profile-avatar" className="flex w-[300px] flex-col items-center justify-center">
        <UserInitialAvatar username={currentUser.username} className="size-32 text-4xl" />
      </div>
    </div>
  )
}
