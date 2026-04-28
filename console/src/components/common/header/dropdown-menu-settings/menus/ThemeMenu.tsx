import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import { ThemeToggleIcon } from '@/components/common/header/dropdown-menu-settings/icons/ThemeToggleIcon'
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/DropdownMenu'
import type { Theme } from '@/providers'

import type { TFunction } from 'i18next'

export function ThemeMenu({ t, theme, setTheme }: { t: TFunction; theme: Theme; setTheme: (theme: Theme) => void }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <ThemeToggleIcon theme={theme} />
        <span>{t('header.settings.theme', { theme: theme.charAt(0).toUpperCase() + theme.slice(1) })}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme} onValueChange={(next: string) => setTheme(next as Theme)}>
          <DropdownMenuRadioItem value="light">
            <SunIcon className="size-4" />
            <span>{t('header.settings.theme.light')}</span>
            {theme === 'light' && <CheckIcon className="ml-auto size-4" />}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon className="size-4" />
            <span>{t('header.settings.theme.dark')}</span>
            {theme === 'dark' && <CheckIcon className="ml-auto size-4" />}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon className="size-4" />
            <span>{t('header.settings.theme.system')}</span>
            {theme === 'system' && <CheckIcon className="ml-auto size-4" />}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
