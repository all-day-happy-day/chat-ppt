import type { ReactElement } from 'react';

export type PartNotificationsProps = {
  partActionError: string | null;
  partPlainValueNotice: string | null;
  onDismissError: () => void;
  onDismissNotice: () => void;
};

export const PartNotifications = ({
  partActionError,
  partPlainValueNotice,
  onDismissError,
  onDismissNotice,
}: PartNotificationsProps): ReactElement | null => {
  if (partActionError === null && partPlainValueNotice === null) {
    return null;
  }
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-6 z-[850] flex w-[min(100vw-2rem,28rem)] -translate-x-1/2 flex-col gap-2 px-4 sm:top-8"
      aria-live="polite"
      aria-label="Part notifications"
    >
      {partActionError !== null ? (
        <div
          className="pointer-events-auto flex items-start gap-2 rounded-2xl border border-red-200/80 bg-white/95 py-2.5 pl-4 pr-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm dark:border-red-500/35 dark:bg-[#2c2c2e]/95 dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          role="alert"
        >
          <p className="min-w-0 flex-1 pt-0.5 text-left text-[13px] leading-snug text-red-800 dark:text-red-200">
            {partActionError}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-red-700 outline-none transition hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40 dark:text-red-300 dark:hover:bg-red-500/15 dark:focus-visible:ring-red-400/40"
            aria-label="Dismiss alert"
            onClick={onDismissError}
          >
            <svg viewBox="0 0 24 24" fill="none" className="block h-4 w-4" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
      {partPlainValueNotice !== null ? (
        <div
          className="pointer-events-auto flex items-start gap-2 rounded-2xl border border-amber-200/90 bg-white/95 py-2.5 pl-4 pr-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm dark:border-amber-500/30 dark:bg-[#2c2c2e]/95 dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          role="status"
        >
          <p className="min-w-0 flex-1 pt-0.5 text-left text-[13px] leading-snug text-amber-950 dark:text-amber-100/95">
            {partPlainValueNotice}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-amber-900 outline-none transition hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/15 dark:focus-visible:ring-amber-400/40"
            aria-label="Dismiss notice"
            onClick={onDismissNotice}
          >
            <svg viewBox="0 0 24 24" fill="none" className="block h-4 w-4" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
};
