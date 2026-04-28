import { UsersIcon } from 'lucide-react'

import { DropdownMenuItem } from '@/components/ui/DropdownMenu'

import type { TFunction } from 'i18next'

export function ManageUsersMenu({ t }: { t: TFunction }) {
  return (
    <DropdownMenuItem>
      <UsersIcon className="size-4" />
      <span>{t('header.settings.manage_users')}</span>
    </DropdownMenuItem>
  )
}
