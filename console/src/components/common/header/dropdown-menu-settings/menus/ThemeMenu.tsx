import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import { ThemeToggleIcon } from '@/components/common/header/dropdown-menu-settings/icons/ThemeToggleIcon'
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/DropdownMenu'
import { cn } from '@/lib/utils'
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
          <DropdownMenuRadioItem value="light" className="items-stretch">
            <CheckIcon className={cn('size-4', theme === 'light' ? 'opacity-100' : 'opacity-0')} />
            <SunIcon className="size-4" />
            <span>{t('header.settings.theme.light')}</span>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem value="dark">
            <CheckIcon className={cn('size-4', theme === 'dark' ? 'opacity-100' : 'opacity-0')} />
            <MoonIcon className="size-4" />
            <span>{t('header.settings.theme.dark')}</span>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem value="system">
            <CheckIcon className={cn('size-4', theme === 'system' ? 'opacity-100' : 'opacity-0')} />
            <MonitorIcon className="size-4" />
            <span>{t('header.settings.theme.system')}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
