import { useGetCurrentUser } from '@/api/query/auth.query'
import { Button } from '@/components/ui/button/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import type { User } from '@/domain/models/user'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

export function DropdownMenuSettings({
  triggerIcon,
  children,
}: {
  triggerIcon: React.ReactNode
  children?: React.ReactNode
}) {
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
          {triggerIcon}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="rounded-xl px-1 py-1">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
