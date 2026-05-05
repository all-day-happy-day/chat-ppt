import * as React from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button/Button'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly cancelLabel: string
  readonly confirmLabel: string
  readonly confirmVariant?: 'default' | 'destructive'
  readonly confirmLoading?: boolean
  readonly confirmLoadingLabel?: string
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'default',
  confirmLoading = false,
  confirmLoadingLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps): React.ReactElement | null {
  React.useEffect((): void | (() => void) => {
    if (!open) {
      return
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return (): void => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onCancel])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className={cn(
          'border-border bg-popover text-popover-foreground relative z-10 w-full max-w-md rounded-lg border p-6 shadow-lg'
        )}
        onClick={(e: React.MouseEvent<HTMLDivElement>): void => {
          e.stopPropagation()
        }}
      >
        <h2 id="confirm-dialog-title" className="text-foreground text-lg font-semibold">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={confirmLoading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            loading={confirmLoading}
            loadingLabel={confirmLoadingLabel ?? confirmLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
