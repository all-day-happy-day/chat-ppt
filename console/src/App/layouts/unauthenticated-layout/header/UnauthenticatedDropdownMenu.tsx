import { type TFunction } from 'i18next'
import { type i18n } from 'i18next'
import { MenuIcon } from 'lucide-react'

import { DropdownMenuSettings } from '@/components/common/header/dropdown-menu-settings/DropdownMenuSettings'
import { LanguageMenu, ThemeMenu } from '@/components/common/header/dropdown-menu-settings/menus'
import type { Theme } from '@/providers'

export function UnauthenticatedDropdownMenu({
  t,
  i18n,
  language,
  setLanguage,
  theme,
  setTheme,
}: {
  t: TFunction
  i18n: i18n
  language: string
  setLanguage: (language: string) => void
  theme: Theme
  setTheme: (theme: Theme) => void
}): React.ReactNode {
  return (
    <DropdownMenuSettings triggerIcon={<MenuIcon className="size-4" />}>
      <LanguageMenu t={t} i18n={i18n} language={language} setLanguage={setLanguage} />
      <ThemeMenu t={t} theme={theme} setTheme={setTheme} />
    </DropdownMenuSettings>
  )
}
