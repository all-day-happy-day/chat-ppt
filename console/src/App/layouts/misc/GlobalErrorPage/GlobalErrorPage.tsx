import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ServerCrash } from 'lucide-react'

import { CenteredLayout } from '@/App/layouts/CenteredLayout/CenteredLayout'
import { AnimatedOverlayButton } from '@/components/ui/AnimatedOverlayButton/AnimatedOverlayButton'
import { useInterval } from '@/hooks/useInterval'

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
        <ServerCrash className="text-brand-9 z-10" size="128" strokeWidth="1.5" />
        <p className="text-foreground z-10 text-center text-6xl font-bold wrap-break-word">
          {t('globalErrorPage.title')}
        </p>
        <p className="text-foreground/80 z-10 w-full text-center text-2xl font-semibold wrap-break-word">
          {t('page.global_error.description')}
        </p>
        <p className="text-foreground/80 z-10 w-full text-center text-2xl font-semibold wrap-break-word">
          {t('page.global_error.reload_description', { countdown })}
        </p>
        <BackButton />
      </div>
    </CenteredLayout>
  )
}

const BackButton = () => {
  const { t } = useTranslation()

  const onClickBackButton = () => {
    window.history.back()
  }

  return (
    <AnimatedOverlayButton className="mt-8" onClick={onClickBackButton}>
      <div className="flex items-center gap-2 px-2 py-1 pr-3">
        <ArrowLeft size="32" strokeWidth="2.5" />
        <span className="text-3xl font-semibold">{t('common.gloabl.back')}</span>
      </div>
    </AnimatedOverlayButton>
  )
}
