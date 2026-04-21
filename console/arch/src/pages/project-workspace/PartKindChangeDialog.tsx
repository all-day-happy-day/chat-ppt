import { PART_KIND_LOSE_FILLED_DATA_MESSAGE, PART_KIND_PLAIN_VALUE_CROSSOVER_MESSAGE } from "./constants";
import type { PendingPartKindChangeConfirm } from "./types";

import type { ReactElement, RefObject } from "react";

export type PartKindChangeDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  pendingPartKindChangeConfirm: PendingPartKindChangeConfirm | null;
  isPatchingParts: boolean;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const PartKindChangeDialog = ({
  dialogRef,
  pendingPartKindChangeConfirm,
  isPatchingParts,
  onClose,
  onCancel,
  onConfirm,
}: PartKindChangeDialogProps): ReactElement => {
  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[600] w-[min(100vw-2rem,26rem)] max-h-[min(90dvh,calc(100vh-2rem))] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-black/[0.1] bg-white p-6 text-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
      onClose={onClose}
    >
      {pendingPartKindChangeConfirm !== null ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-[18px] font-semibold tracking-tight">Change part type</h2>
          <p className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            {pendingPartKindChangeConfirm.mode === "plainValueCrossover"
              ? PART_KIND_PLAIN_VALUE_CROSSOVER_MESSAGE
              : PART_KIND_LOSE_FILLED_DATA_MESSAGE}
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-transparent px-3.5 text-[13px] font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
              onClick={onCancel}
              disabled={isPatchingParts}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex h-9 items-center justify-center rounded-lg bg-[#0071e3] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
              disabled={isPatchingParts}
              onClick={onConfirm}
            >
              {isPatchingParts ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
};
