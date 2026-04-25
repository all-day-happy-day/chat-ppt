import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button/Button'
import { cn } from '@/lib/utils'

import '@/i18n/i18n'

export function SaveButton({ className, type }: { className?: string; type?: 'button' | 'submit' }) {
  const { t } = useTranslation()

  return (
    <Button
      variant="default"
      size="sm"
      type={type ?? 'button'}
      className={cn(
        '"h-[30px] text-[13px]" w-[55px] bg-blue-500 text-white hover:bg-blue-600 active:scale-95',
        className
      )}
    >
      {t('common.global.save')}
    </Button>
  )
}
