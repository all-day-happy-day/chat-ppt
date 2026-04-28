import { LogOutIcon } from 'lucide-react'

import { DropdownMenuItem } from '@/components/ui/DropdownMenu'

import type { TFunction } from 'i18next'
import type { NavigateFunction } from 'react-router-dom'

export function LogoutMenu({
  t,
  signOut,
  navigate,
}: {
  t: TFunction
  signOut: () => Promise<void>
  navigate: NavigateFunction
}) {
  return (
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => {
        void signOut().then(() => navigate('/signin', { replace: true }))
      }}
    >
      <LogOutIcon className="text-destructive size-4" />
      <span>{t('header.settings.signout')}</span>
    </DropdownMenuItem>
  )
}
