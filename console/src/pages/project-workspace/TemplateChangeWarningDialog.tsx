import type { ReactElement, RefObject } from 'react';

const TEMPLATE_CHANGE_WARNING_BODY: string =
  'Changing the template removes all parts from this project. Anything you added in those parts will be lost. This cannot be undone.';

export type TemplateChangeWarningDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  onCancel: () => void;
  onContinue: () => void;
};

export const TemplateChangeWarningDialog = ({
  dialogRef,
  onClose,
  onCancel,
  onContinue,
}: TemplateChangeWarningDialogProps): ReactElement => {
  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[600] w-[min(100vw-2rem,26rem)] max-h-[min(90dvh,calc(100vh-2rem))] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-black/[0.1] bg-white p-6 text-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold tracking-tight">Change template?</h2>
        <p className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          {TEMPLATE_CHANGE_WARNING_BODY}
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-transparent px-5 text-[15px] font-medium text-neutral-900 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex h-11 items-center justify-center rounded-xl bg-[#0071e3] px-5 text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </dialog>
  );
};
