import { type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban } from 'lucide-react'

import { CenteredLayout } from '@/App/layouts/CenteredLayout/CenteredLayout'
import { BackButton } from '@/components/ui/BackButton'

import '@/i18n/i18n'

export function NotFoundPage(): JSX.Element {
  const { t } = useTranslation()

  return (
    <CenteredLayout>
      <div className="z-10 flex w-1/2 flex-col items-center justify-center gap-3">
        <Ban size="128" strokeWidth="1.5" className="text-foreground z-10" />
        <p className="text-foreground z-10 text-center text-6xl font-bold wrap-break-word">
          {t('page.not_found.title')}
        </p>
        <p className="text-foreground/80 z-10 w-full text-center text-2xl font-semibold wrap-break-word">
          {t('page.not_found.description')}
        </p>
        <BackButton />
      </div>
    </CenteredLayout>
  )
}
