import { useTranslation } from 'react-i18next'
import { GlobeIcon, LogOutIcon, SettingsIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { UserInitialAvatar } from '@/components/ui/UserInitialAvatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { LANGUAGE_MAP } from '@/i18n/settings'
import { useTheme } from '@/providers/theme-provider/useTheme'

import '@/i18n/i18n'

export function SettingsMenu() {
  let { data: user } = useCurrentUser()
  const { theme } = useTheme()
  const { t, i18n } = useTranslation()
  const language: string = i18n.language

  if (!user) {
    user = {
      id: '1',
      username: 'John Doe',
      email: 'john.doe@example.com',
      role: 'USER',
      createdAt: new Date(),
      lastSignIn: new Date(),
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="data-[state=open]:bg-accent/60 hover:bg-accent/60 cursor-pointer rounded-md border-none p-1"
        >
          <UserInitialAvatar username={user.username} className="bg-initial-avatar size-8" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="px-2 pt-0 pb-1">
        {/* Profile */}
        <div className="bg-accent/50 mb-1 flex scale-x-107 flex-col justify-center gap-1 rounded-t-[0.575rem] p-3 pr-24">
          <h1 className="text-lg font-bold">{user.username}</h1>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>

        {/* Settings */}
        <DropdownMenuItem>
          <SettingsIcon className="size-4" />
          <span>{t('header.settings.settings')}</span>
        </DropdownMenuItem>

        {/* Language */}
        <DropdownMenuItem>
          <GlobeIcon className="size-4" />
          <span>{t('header.settings.language', { language: LANGUAGE_MAP[language] })}</span>
        </DropdownMenuItem>

        {/* Theme */}
        <DropdownMenuItem>
          <SunIcon className="size-4" />
          <span>{t('header.settings.theme', { theme: theme.charAt(0).toUpperCase() + theme.slice(1) })}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOutIcon className="text-destructive size-4" />
          <span>{t('header.settings.signout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
