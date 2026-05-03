import { type NavigateFunction } from 'react-router-dom'
import { type TFunction } from 'i18next'
import { type i18n } from 'i18next'

import { DropdownMenuSettings } from '@/components/common/header/dropdown-menu-settings/DropdownMenuSettings'
import {
  LanguageMenu,
  LogoutMenu,
  ManageUsersMenu,
  ProfileMenu,
  SettingsMenu,
  ThemeMenu,
} from '@/components/common/header/dropdown-menu-settings/menus'
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { UserInitialAvatar } from '@/components/ui/UserInitialAvatar'
import type { User } from '@/domain/models/user'
import type { Theme } from '@/providers'

export function AuthenticatedDropdownMenu({
  t,
  i18n,
  language,
  setLanguage,
  theme,
  setTheme,
  user,
  navigate,
  signOut,
}: {
  t: TFunction
  i18n: i18n
  language: string
  setLanguage: (language: string) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  user: User
  navigate: NavigateFunction
  signOut: () => Promise<void>
}): React.ReactNode {
  return (
    <DropdownMenuSettings
      triggerIcon={<UserInitialAvatar username={user.username} className="bg-initial-avatar size-7" />}
    >
      <ProfileMenu user={user} className="-mt-1" />
      <SettingsMenu t={t} navigate={navigate} />
      <LanguageMenu t={t} i18n={i18n} language={language} setLanguage={setLanguage} />
      <ThemeMenu t={t} theme={theme} setTheme={setTheme} />
      <DropdownMenuSeparator />
      {user.role === 'ADMIN' && (
        <>
          <ManageUsersMenu t={t} navigate={navigate} />
          <DropdownMenuSeparator />
        </>
      )}
      <LogoutMenu t={t} signOut={signOut} navigate={navigate} />
    </DropdownMenuSettings>
  )
}
