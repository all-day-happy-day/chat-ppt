import { useTranslation } from 'react-i18next'
import { ServerCrash } from 'lucide-react'

import { CenteredLayout } from '@/App/layouts/centered-layout/CenteredLayout'

import '@/i18n/i18n'

export function GlobalErrorPage() {
  const { t } = useTranslation()

  return (
    <CenteredLayout>
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6">
        <div className="z-10 flex w-full max-w-2xl flex-col items-center justify-center gap-3">
          <ServerCrash className="text-brand-9 z-10" size="64" strokeWidth="1.5" />
          <p className="text-foreground z-10 text-center text-4xl font-bold wrap-normal">
            {t('page.global_error.title')}
          </p>
          <p className="text-foreground/80 z-10 w-full text-center text-xl font-semibold wrap-break-word">
            {t('page.global_error.description')}
          </p>
          {/* <p className="text-foreground/80 z-10 w-full text-center text-xl font-semibold wrap-break-word">
          {t('page.global_error.reload_description', { countdown })}
        </p> */}
        </div>
      </div>
    </CenteredLayout>
  )
}
