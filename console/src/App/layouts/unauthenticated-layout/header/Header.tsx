import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { BaseHeader } from '@/components/common/header/BaseHeader'
import type { User } from '@/domain/models/user'
import { getQueryData } from '@/lib/utils'
import { useTheme } from '@/providers'

import { UnauthenticatedDropdownMenu } from './UnauthenticatedDropdownMenu'

export function Header() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const user = getQueryData<User>(useGetCurrentUser())
  const [language, setLanguage] = useState<string>(i18n.resolvedLanguage ?? i18n.language)

  if (user === undefined) return null

  return (
    <BaseHeader>
      <div className="flex items-center">
        <UnauthenticatedDropdownMenu
          t={t}
          i18n={i18n}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          setTheme={setTheme}
        />
      </div>
    </BaseHeader>
  )
}
