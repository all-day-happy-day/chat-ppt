import { CheckIcon, GlobeIcon } from 'lucide-react'

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/DropdownMenu'
import { LANGUAGE_MAP } from '@/i18n/settings'

import '@/i18n/i18n'

import type { i18n } from 'i18next'
import type { TFunction } from 'i18next'

export function LanguageMenu({
  t,
  i18n,
  language,
  setLanguage,
}: {
  t: TFunction
  i18n: i18n
  language: string
  setLanguage: (language: string) => void
}) {
  return (
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
  )
}
