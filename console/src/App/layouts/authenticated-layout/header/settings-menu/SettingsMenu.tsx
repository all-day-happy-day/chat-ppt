import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckIcon, GlobeIcon, LogOutIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon, UsersIcon } from 'lucide-react'

import { Button } from '@/components/ui/button/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { UserInitialAvatar } from '@/components/ui/UserInitialAvatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { LANGUAGE_MAP } from '@/i18n/settings'
import { type Theme, useTheme } from '@/providers'

import '@/i18n/i18n'

import { ThemeToggleIcon } from './ThemeToggleIcon'

export function SettingsMenu() {
  const user = useCurrentUser().data ?? {
    id: '1',
    username: 'John Doe',
    email: 'john.doe@example.com',
    role: 'USER',
    createdAt: new Date(),
    lastSignIn: new Date(),
  }
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useState<string>(i18n.resolvedLanguage ?? i18n.language)
  const navigate = useNavigate()

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
        {/* Profile */}
        <div className="bg-accent/50 mb-1 flex scale-x-103 flex-col justify-center gap-1 rounded-t-[0.575rem] p-3 pr-24 pb-4">
          <h1 className="text-lg font-bold">{user.username}</h1>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>

        {/* Settings */}
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <SettingsIcon className="size-4" />
          <span>{t('header.settings.settings')}</span>
        </DropdownMenuItem>

        {/* Language */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <GlobeIcon className="size-4" />
            <span>{t('header.settings.language', { language: LANGUAGE_MAP[language] })}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(next: string) => {
                setLanguage(next)
                void i18n.changeLanguage(next)
                localStorage.setItem('language', next)
              }}
            >
              <DropdownMenuRadioItem value="en">
                <span>{LANGUAGE_MAP['en']}</span>
                {language === 'en' && <CheckIcon className="ml-auto size-4" />}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ko">
                <span>{LANGUAGE_MAP['ko']}</span>
                {language === 'ko' && <CheckIcon className="ml-auto size-4" />}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Theme */}
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

        <DropdownMenuSeparator />

        {user.role === 'ADMIN' && (
          <>
            <DropdownMenuItem>
              <UsersIcon className="size-4" />
              <span>{t('header.settings.manage_users')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Logout */}
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOutIcon className="text-destructive size-4" />
          <span>{t('header.settings.signout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
