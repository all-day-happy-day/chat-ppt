import { type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

import { AnimatedOverlayButton } from './AnimatedOverlayButton/AnimatedOverlayButton'

export function BackButton(): JSX.Element {
  const { t } = useTranslation()

  const onClickBackButton = () => {
    window.history.back()
  }

  return (
    <AnimatedOverlayButton className="mt-8" onClick={onClickBackButton}>
      <div className="flex items-center gap-2 px-2 py-1 pr-3">
        <ArrowLeft size="32" strokeWidth="2.5" />
        <span className="text-3xl font-semibold">{t('common.global.back')}</span>
      </div>
    </AnimatedOverlayButton>
  )
}
