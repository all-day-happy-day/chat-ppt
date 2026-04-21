import { forwardRef, useCallback, type ChangeEvent } from "react";
import type { TemplateLayoutChoice } from "../lib/project-parts-for-patch";
import { PART_EDIT_LAYOUT_PALETTE_MENU_ID, TemplateLayoutGalleryPicker } from "./TemplateLayoutGalleryPicker";

export { PART_EDIT_LAYOUT_PALETTE_MENU_ID } from "./TemplateLayoutGalleryPicker";

const PART_EDIT_CLEAR_LAYOUT_SELECTION_LABEL: string = "Clear layout selection";

const VALUE_PLACEHOLDER_SECTION_LABEL: string = "Placeholders";

const VALUE_PLACEHOLDER_INPUT_CLASS: string =
  "mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

const DEFAULT_SAVE_BUTTON_LABEL: string = "Save layout";

export type ValuePlaceholderEditorRow = {
  shapeKey: string;
  placeholderName: string;
  fieldLabel: string;
  value: string;
  inputId: string;
};

export type PartEditPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  partHeading: string;
  layoutFieldLabel: string;
  layoutChoices: TemplateLayoutChoice[];
  selectedLayoutId: string | null;
  onSelectLayoutId: (layoutId: string | null) => void;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onSave: () => void;
  emptyStateMessage: string | null;
  showClearLayoutSelectionControl?: boolean;
  onClearLayoutSelection?: () => void;
  valuePlaceholderRows?: ValuePlaceholderEditorRow[] | null;
  onChangeValuePlaceholderText?: (shapeKey: string, nextValue: string) => void;
  onFocusValuePlaceholderField?: (shapeKey: string) => void;
  onBlurValuePlaceholderField?: () => void;
  saveButtonLabel?: string;
};

export const PartEditPanel = forwardRef<HTMLElement, PartEditPanelProps>(function PartEditPanel(
  {
    isOpen,
    onClose,
    partHeading,
    layoutFieldLabel,
    layoutChoices,
    selectedLayoutId,
    onSelectLayoutId,
    isSaveDisabled,
    isSaving,
    onSave,
    emptyStateMessage,
    showClearLayoutSelectionControl = false,
    onClearLayoutSelection,
    valuePlaceholderRows = null,
    onChangeValuePlaceholderText,
    onFocusValuePlaceholderField,
    onBlurValuePlaceholderField,
    saveButtonLabel = DEFAULT_SAVE_BUTTON_LABEL,
  },
  ref
) {
  const handleSelectLayoutFromGallery = useCallback(
    (layoutId: string | null): void => {
      onSelectLayoutId(layoutId);
    },
    [onSelectLayoutId]
  );

  const handleValuePlaceholderChange = useCallback(
    (shapeKey: string): ((event: ChangeEvent<HTMLInputElement>) => void) => {
      return (event: ChangeEvent<HTMLInputElement>): void => {
        if (onChangeValuePlaceholderText === undefined) {
          return;
        }
        onChangeValuePlaceholderText(shapeKey, event.target.value);
      };
    },
    [onChangeValuePlaceholderText]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      ref={ref}
      className="flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden border-t border-neutral-200/90 bg-white dark:border-white/[0.08] dark:bg-[#1c1c1e] sm:h-full sm:max-h-none sm:w-[min(100%,18rem)] sm:rounded-2xl sm:border-l sm:border-t-0 sm:border-black/[0.06] sm:dark:border-white/[0.08]"
      aria-label="Edit part"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Edit part</h2>
          <p className="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{partHeading}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-black/[0.1] bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-200 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
          onClick={onClose}
          aria-label="Close part editor"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {emptyStateMessage !== null ? (
          <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-400" role="status">
            {emptyStateMessage}
          </p>
        ) : (
          <div className="min-w-0">
            {valuePlaceholderRows !== null && valuePlaceholderRows.length > 0 ? (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {VALUE_PLACEHOLDER_SECTION_LABEL}
                </p>
                <ul className="mt-2 space-y-3">
                  {valuePlaceholderRows.map((row: ValuePlaceholderEditorRow) => (
                    <li key={row.shapeKey}>
                      <label
                        htmlFor={row.inputId}
                        className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-200"
                      >
                        {row.fieldLabel}
                      </label>
                      <input
                        id={row.inputId}
                        type="text"
                        value={row.value}
                        onChange={handleValuePlaceholderChange(row.shapeKey)}
                        onFocus={(): void => {
                          onFocusValuePlaceholderField?.(row.shapeKey);
                        }}
                        onBlur={(): void => {
                          onBlurValuePlaceholderField?.();
                        }}
                        className={VALUE_PLACEHOLDER_INPUT_CLASS}
                        disabled={isSaving}
                        autoComplete="off"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <TemplateLayoutGalleryPicker
              layoutFieldLabel={layoutFieldLabel}
              menuId={PART_EDIT_LAYOUT_PALETTE_MENU_ID}
              layoutChoices={layoutChoices}
              selectedLayoutId={selectedLayoutId}
              onSelectLayout={handleSelectLayoutFromGallery}
              showNoneChoiceInGallery={true}
            />
            {showClearLayoutSelectionControl && onClearLayoutSelection !== undefined ? (
              <button
                type="button"
                className="mt-3 w-full rounded-md border border-black/[0.1] bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                onClick={onClearLayoutSelection}
                disabled={isSaving}
              >
                {PART_EDIT_CLEAR_LAYOUT_SELECTION_LABEL}
              </button>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 border-t border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
        <button
          type="button"
          className="rounded-md border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md border border-[#0071e3]/40 bg-[#0071e3] px-2.5 py-1 text-[11px] font-medium text-white outline-none transition hover:bg-[#0066cf] focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#0a84ff]/50 dark:bg-[#0a84ff] dark:hover:bg-[#0990ff] dark:focus-visible:ring-[#0a84ff]"
          onClick={onSave}
          disabled={isSaveDisabled || isSaving}
        >
          {isSaving ? "Saving…" : saveButtonLabel}
        </button>
      </div>
    </aside>
  );
});
