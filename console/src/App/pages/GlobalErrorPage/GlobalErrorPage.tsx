import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ServerCrash } from 'lucide-react'

import { CenteredLayout } from '@/App/layouts/CenteredLayout/CenteredLayout'
import { BackButton } from '@/components/ui/BackButton'
import { useInterval } from '@/hooks/useInterval'

import '@/i18n/i18n'

const GLOBAL_TIMEOUT_RESET: number = 5

export function GlobalErrorPage() {
  const { t } = useTranslation()
  const [countdown, setCountdown] = useState<number>(GLOBAL_TIMEOUT_RESET)

  useInterval((): void => {
    setCountdown((prev): number => prev - 1)
  }, 1000)

  useEffect((): void => {
    if (countdown === 0) {
      window.location.reload()
    }
  }, [countdown])

  return (
    <CenteredLayout>
      <div className="z-10 flex w-1/2 flex-col items-center justify-center gap-3">
        <ServerCrash className="text-brand-9 z-10" size="64" strokeWidth="1.5" />
        <p className="text-foreground z-10 text-center text-4xl font-bold wrap-break-word">
          {t('page.global_error.title')}
        </p>
        <p className="text-foreground/80 z-10 w-full text-center text-xl font-semibold wrap-break-word">
          {t('page.global_error.description')}
        </p>
        <p className="text-foreground/80 z-10 w-full text-center text-xl font-semibold wrap-break-word">
          {t('page.global_error.reload_description', { countdown })}
        </p>
        <BackButton />
      </div>
    </CenteredLayout>
  )
}
