import { SettingsIcon } from 'lucide-react'

import { DropdownMenuItem } from '@/components/ui/DropdownMenu'

import type { TFunction } from 'i18next'
import type { NavigateFunction } from 'react-router-dom'

export function SettingsMenu({ t, navigate }: { t: TFunction; navigate: NavigateFunction }) {
  return (
    <DropdownMenuItem onClick={() => navigate('/settings')}>
      <SettingsIcon className="size-4" />
      <span>{t('header.settings.settings')}</span>
    </DropdownMenuItem>
  )
}
