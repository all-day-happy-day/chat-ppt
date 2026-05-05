import { AUTH_FIELD_CLASS } from '../lib/auth-screen-classes'

import type { ChangeEvent, ReactElement, RefObject } from 'react'

export type ConfirmationCodeDeleteDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
  title: string
  entityName: string
  description: string
  confirmCode: string
  typedConfirmCode: string
  onTypedConfirmChange: (event: ChangeEvent<HTMLInputElement>) => void
  confirmInputId: string
  confirmInputName: string
  deleteError: string | null
  isDeleting: boolean
  confirmButtonLabel: string
  onClose: () => void
  onCancel: () => void
  onConfirm: () => void
}

export const ConfirmationCodeDeleteDialog = ({
  dialogRef,
  title,
  entityName,
  description,
  confirmCode,
  typedConfirmCode,
  onTypedConfirmChange,
  confirmInputId,
  confirmInputName,
  deleteError,
  isDeleting,
  confirmButtonLabel,
  onClose,
  onCancel,
  onConfirm,
}: ConfirmationCodeDeleteDialogProps): ReactElement => {
  const isConfirmDisabled: boolean = typedConfirmCode !== confirmCode || isDeleting
  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 z-[600] max-h-[min(90dvh,calc(100vh-2rem))] w-[min(100vw-2rem,26rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-black/[0.1] bg-white p-6 text-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
        <p className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">{entityName}</span>
          <span className="text-neutral-600 dark:text-neutral-400"> — {description}</span>
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Type the following code to confirm:
          </p>
          <p
            className="rounded-lg bg-neutral-100 px-3 py-2 text-center font-mono text-[18px] font-semibold tracking-widest text-neutral-900 dark:bg-white/10 dark:text-neutral-50"
            aria-live="polite"
          >
            {confirmCode}
          </p>
          <label className="sr-only" htmlFor={confirmInputId}>
            Confirmation code
          </label>
          <input
            id={confirmInputId}
            name={confirmInputName}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={AUTH_FIELD_CLASS}
            value={typedConfirmCode}
            onChange={onTypedConfirmChange}
            disabled={isDeleting}
          />
        </div>
        {deleteError !== null ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] leading-snug text-red-800 dark:bg-red-500/15 dark:text-red-200">
            {deleteError}
          </p>
        ) : null}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-transparent px-3.5 text-[13px] font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex h-9 items-center justify-center rounded-lg bg-red-600 px-3.5 text-[13px] font-medium text-white transition hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-700"
            disabled={isConfirmDisabled}
            onClick={onConfirm}
          >
            {isDeleting ? 'Deleting…' : confirmButtonLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
