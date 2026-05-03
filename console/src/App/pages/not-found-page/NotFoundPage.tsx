import { type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban } from 'lucide-react'

import { CenteredLayout } from '@/App/layouts/centered-layout/CenteredLayout'

import '@/i18n/i18n'

export function NotFoundPage(): JSX.Element {
  const { t } = useTranslation()

  return (
    <CenteredLayout>
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6">
        <div className="z-10 flex w-full max-w-2xl flex-col items-center justify-center gap-3">
          <Ban size="64" strokeWidth="1.5" className="text-foreground z-10" />
          <p className="text-foreground z-10 text-center text-4xl font-bold wrap-break-word">
            {t('page.not_found.title')}
          </p>
          <p className="text-foreground/80 z-10 w-full text-center text-xl font-semibold wrap-break-word">
            {t('page.not_found.description')}
          </p>
        </div>
      </div>
    </CenteredLayout>
  )
}
