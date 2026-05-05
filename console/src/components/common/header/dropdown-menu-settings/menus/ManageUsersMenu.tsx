import { UsersIcon } from 'lucide-react'

import { DropdownMenuItem } from '@/components/ui/DropdownMenu'

import type { TFunction } from 'i18next'
import type { NavigateFunction } from 'react-router-dom'

export function ManageUsersMenu({ t, navigate }: { t: TFunction; navigate: NavigateFunction }) {
  return (
    <DropdownMenuItem onClick={() => navigate('/settings/users')}>
      <UsersIcon className="size-4" />
      <span>{t('header.settings.manage_users')}</span>
    </DropdownMenuItem>
  )
}
