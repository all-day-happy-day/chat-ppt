import { useGetCurrentUser } from '@/api/query/auth.query'
import { Button } from '@/components/ui/button/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { UserInitialAvatar } from '@/components/ui/UserInitialAvatar'
import type { User } from '@/domain/models/user'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

export function DropdownMenuSettings({ children }: { children?: React.ReactNode }) {
  const user = getQueryData<User>(useGetCurrentUser())
  if (user === undefined) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="data-[state=open]:bg-accent/60 hover:bg-accent/60 cursor-pointer rounded-md border-none p-1.5"
        >
          <UserInitialAvatar username={user.username} className="bg-initial-avatar size-8" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="rounded-xl px-1 pt-0 pb-1">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
