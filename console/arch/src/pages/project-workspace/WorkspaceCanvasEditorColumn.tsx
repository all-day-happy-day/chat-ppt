import { createPortal } from "react-dom";
import type { ReactElement, RefObject } from "react";
import { BiblePartEditForm, type BiblePartSavePayload } from "../../components/BiblePartEditForm";
import { LyricsPartEditForm } from "../../components/LyricsPartEditForm";
import { PartEditPanel, type ValuePlaceholderEditorRow } from "../../components/PartEditPanel";
import { TemplateLayoutThumbnail } from "../../components/TemplateLayoutThumbnail";
import { getPrimaryLayoutIdFromPart, getProjectPartId } from "../../lib/project-parts-for-patch";
import type { LyricsSongRow } from "../../lib/lyrics-part-contents";
import { buildBiblePartThumbnailCaption } from "../../lib/bible-part-contents";
import { buildLyricsPartThumbnailCaption } from "../../lib/lyrics-part-contents";
import type { GetLayoutResponse } from "../../types/template-layout";
import type { TemplateLayoutChoice } from "../../lib/project-parts-for-patch";
import {
  ADD_PART_KIND_OPTION_CLASS,
  ADD_PART_KIND_OPTIONS,
  type AddPartKindOption,
  CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS,
  CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS,
  CANVAS_SECTION_HEADER_ROW_MIN_HEIGHT_CLASS,
  PART_KIND_CHANGE_MENU_ID,
} from "./constants";
import type { AddPartMenuAnchor } from "./types";

export type WorkspaceCanvasEditorColumnProps = {
  canvasPreviewSizerRef: RefObject<HTMLDivElement | null>;
  canvasPreviewFrameRef: RefObject<HTMLDivElement | null>;
  partEditPanelRef: RefObject<HTMLElement | null>;
  sortedPartsLength: number;
  selectedPart: unknown | undefined;
  selectedPartIndex: number;
  selectedPartLabel: string;
  canvasPlaceholderHoverLabel: string | null;
  canvasHeaderCenterDefaultText: string;
  onEditFromCanvas: () => void;
  onCanvasPlaceholderHoverLabelChange: (label: string | null) => void;
  selectedPartLayoutEntry: GetLayoutResponse | null;
  selectedPartIsLyrics: boolean;
  selectedPartIsBible: boolean;
  selectedPartIsValue: boolean;
  plainValueLayoutPreviewSuppressed: boolean;
  canvasValueHighlightShapeKey: string | null;
  isPatchingParts: boolean;
  isPartEditPanelOpen: boolean;
  onClosePartEditPanel: () => void;
  partEditHeading: string;
  templateLayoutChoices: TemplateLayoutChoice[];
  partEditLyricsLyricsLayoutId: string | null;
  partEditLyricsTitleLayoutId: string | null;
  onChangeLyricsLayoutId: (id: string | null) => void;
  onChangeTitleLayoutId: (id: string | null) => void;
  partEditLyricsSongs: LyricsSongRow[];
  onPartEditLyricsSongsChange: (rows: LyricsSongRow[]) => void;
  lyricsConfigureProjectId: string;
  lyricsConfigurePartSortedIndex: number;
  partEditEmptyStateMessage: string | null;
  isPartLyricsSaveDisabled: boolean;
  onSaveLyricsPart: () => void;
  partEditBiblePhraseLayoutId: string | null;
  partEditBibleTitleLayoutId: string | null;
  onChangeBiblePhraseLayoutId: (layoutId: string | null) => void;
  onChangeBibleTitleLayoutId: (layoutId: string | null) => void;
  onSaveBiblePart: (payload: BiblePartSavePayload) => void;
  isPartBibleSaveDisabled: boolean;
  partEditLayoutFieldLabel: string;
  partEditSelectedLayoutId: string | null;
  onSelectPartEditLayoutId: (layoutId: string | null) => void;
  isPartPrimaryLayoutSaveDisabled: boolean;
  onSavePartPrimaryLayout: () => void;
  showClearLayoutSelectionControl: boolean;
  onClearPartLayoutSelection: () => void;
  valuePlaceholderRowsForPartEdit: ValuePlaceholderEditorRow[] | null;
  onChangeValuePlaceholderText: (shapeKey: string, nextValue: string) => void;
  onFocusValuePlaceholderField: (shapeKey: string) => void;
  onBlurValuePlaceholderField: () => void;
  partEditPrimarySaveButtonLabel: string;
  partTypeMenuOpenIndex: number | null;
  partTypeMenuAnchor: AddPartMenuAnchor | null;
  onApplyPartKindChange: (kind: AddPartKindOption["kind"]) => void;
};

export const WorkspaceCanvasEditorColumn = ({
  canvasPreviewSizerRef,
  canvasPreviewFrameRef,
  partEditPanelRef,
  sortedPartsLength,
  selectedPart,
  selectedPartIndex,
  selectedPartLabel,
  canvasPlaceholderHoverLabel,
  canvasHeaderCenterDefaultText,
  onEditFromCanvas,
  onCanvasPlaceholderHoverLabelChange,
  selectedPartLayoutEntry,
  selectedPartIsLyrics,
  selectedPartIsBible,
  selectedPartIsValue,
  plainValueLayoutPreviewSuppressed,
  canvasValueHighlightShapeKey,
  isPatchingParts,
  isPartEditPanelOpen,
  onClosePartEditPanel,
  partEditHeading,
  templateLayoutChoices,
  partEditLyricsLyricsLayoutId,
  partEditLyricsTitleLayoutId,
  onChangeLyricsLayoutId,
  onChangeTitleLayoutId,
  partEditLyricsSongs,
  onPartEditLyricsSongsChange,
  lyricsConfigureProjectId,
  lyricsConfigurePartSortedIndex,
  partEditEmptyStateMessage,
  isPartLyricsSaveDisabled,
  onSaveLyricsPart,
  partEditBiblePhraseLayoutId,
  partEditBibleTitleLayoutId,
  onChangeBiblePhraseLayoutId,
  onChangeBibleTitleLayoutId,
  onSaveBiblePart,
  isPartBibleSaveDisabled,
  partEditLayoutFieldLabel,
  partEditSelectedLayoutId,
  onSelectPartEditLayoutId,
  isPartPrimaryLayoutSaveDisabled,
  onSavePartPrimaryLayout,
  showClearLayoutSelectionControl,
  onClearPartLayoutSelection,
  valuePlaceholderRowsForPartEdit,
  onChangeValuePlaceholderText,
  onFocusValuePlaceholderField,
  onBlurValuePlaceholderField,
  partEditPrimarySaveButtonLabel,
  partTypeMenuOpenIndex,
  partTypeMenuAnchor,
  onApplyPartKindChange,
}: WorkspaceCanvasEditorColumnProps): ReactElement => {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden sm:flex-row sm:gap-3">
      <section
        className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]"
        aria-label="Selected part preview"
      >
        <div
          className={`relative flex items-center border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08] ${CANVAS_SECTION_HEADER_ROW_MIN_HEIGHT_CLASS}`}
        >
          <div className="relative z-10 shrink-0">
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Canvas</h2>
          </div>
          {sortedPartsLength > 0 && selectedPart !== undefined ? (
            <div className="relative z-10 ml-auto shrink-0">
              <button
                type="button"
                className="rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5"
                disabled={isPatchingParts}
                title="Change slide template layout and more."
                aria-label={`Edit part ${String(selectedPartIndex + 1)} · ${selectedPartLabel}`}
                onClick={onEditFromCanvas}
              >
                Edit
              </button>
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 sm:px-24">
            <div className="min-w-0 max-w-[min(28rem,calc(100%-7rem))] text-center">
              {canvasPlaceholderHoverLabel !== null && canvasPlaceholderHoverLabel.length > 0 ? (
                <p
                  className="truncate font-[ui-rounded,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[11px] font-medium uppercase leading-snug tracking-[0.26em] text-neutral-600 dark:text-neutral-300"
                  aria-live="polite"
                >
                  {canvasPlaceholderHoverLabel}
                </p>
              ) : (
                <p className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">
                  {canvasHeaderCenterDefaultText}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4 sm:px-6 sm:py-6">
          {sortedPartsLength === 0 ? (
            <p className="mx-auto max-w-prose flex flex-1 items-center justify-center text-center text-[14px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              No parts yet.
            </p>
          ) : selectedPart !== undefined ? (
            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3">
              <div
                ref={canvasPreviewSizerRef}
                className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden"
              >
                <div
                  ref={canvasPreviewFrameRef}
                  className="flex shrink-0 items-center justify-center overflow-hidden rounded-none border border-black/[0.08] bg-neutral-100 dark:border-white/[0.1] dark:bg-neutral-900/80"
                >
                  {selectedPartIsLyrics ? (
                    <div
                      className={`flex ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS} ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS} flex-col items-center justify-center px-4`}
                      role="status"
                    >
                      <span className="text-center text-[12px] font-medium leading-snug text-neutral-500 dark:text-neutral-400">
                        {buildLyricsPartThumbnailCaption(selectedPart)}
                      </span>
                    </div>
                  ) : selectedPartIsBible ? (
                    <div
                      className={`flex ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS} ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS} flex-col items-center justify-center px-4`}
                      role="status"
                    >
                      <span className="text-center text-[12px] font-medium leading-snug text-neutral-500 dark:text-neutral-400">
                        {buildBiblePartThumbnailCaption(selectedPart)}
                      </span>
                    </div>
                  ) : selectedPartLayoutEntry !== null ? (
                    <TemplateLayoutThumbnail
                      key={`canvas-preview-${String(selectedPartIndex)}-${getProjectPartId(selectedPart) ?? "noid"}-${getPrimaryLayoutIdFromPart(selectedPart) ?? "nolayout"}-${plainValueLayoutPreviewSuppressed ? "pv-sup" : "pv-show"}`}
                      entry={selectedPartLayoutEntry}
                      className="max-h-full max-w-full"
                      highlightedShapeKey={
                        selectedPartIsValue && !plainValueLayoutPreviewSuppressed ? canvasValueHighlightShapeKey : null
                      }
                      onPlaceholderHoverLabelChange={onCanvasPlaceholderHoverLabelChange}
                    />
                  ) : (
                    <div
                      className={`flex ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS} ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS} items-center justify-center`}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      {isPartEditPanelOpen && selectedPartIsLyrics ? (
        <LyricsPartEditForm
          ref={partEditPanelRef}
          isOpen={isPartEditPanelOpen}
          onClose={onClosePartEditPanel}
          partHeading={partEditHeading}
          layoutChoices={templateLayoutChoices}
          lyricsLayoutId={partEditLyricsLyricsLayoutId}
          titleLayoutId={partEditLyricsTitleLayoutId}
          onChangeLyricsLayoutId={onChangeLyricsLayoutId}
          onChangeTitleLayoutId={onChangeTitleLayoutId}
          songs={partEditLyricsSongs}
          onSongsChange={onPartEditLyricsSongsChange}
          lyricsConfigureProjectId={lyricsConfigureProjectId}
          lyricsConfigurePartSortedIndex={lyricsConfigurePartSortedIndex}
          emptyStateMessage={partEditEmptyStateMessage}
          isSaveDisabled={isPartLyricsSaveDisabled || isPatchingParts}
          isSaving={isPatchingParts}
          onSave={onSaveLyricsPart}
        />
      ) : isPartEditPanelOpen && selectedPartIsBible ? (
        <BiblePartEditForm
          ref={partEditPanelRef}
          isOpen={isPartEditPanelOpen}
          onClose={onClosePartEditPanel}
          partHeading={partEditHeading}
          layoutChoices={templateLayoutChoices}
          phraseLayoutId={partEditBiblePhraseLayoutId}
          titleLayoutId={partEditBibleTitleLayoutId}
          onChangePhraseLayoutId={onChangeBiblePhraseLayoutId}
          onChangeTitleLayoutId={onChangeBibleTitleLayoutId}
          partSnapshot={selectedPart}
          emptyStateMessage={partEditEmptyStateMessage}
          isSaveDisabled={isPartBibleSaveDisabled || isPatchingParts}
          isSaving={isPatchingParts}
          onSave={onSaveBiblePart}
        />
      ) : (
        <PartEditPanel
          ref={partEditPanelRef}
          isOpen={isPartEditPanelOpen}
          onClose={onClosePartEditPanel}
          partHeading={partEditHeading}
          layoutFieldLabel={partEditLayoutFieldLabel}
          layoutChoices={templateLayoutChoices}
          selectedLayoutId={partEditSelectedLayoutId}
          onSelectLayoutId={onSelectPartEditLayoutId}
          isSaveDisabled={isPartPrimaryLayoutSaveDisabled || partEditEmptyStateMessage !== null || isPatchingParts}
          isSaving={isPatchingParts}
          onSave={onSavePartPrimaryLayout}
          emptyStateMessage={partEditEmptyStateMessage}
          showClearLayoutSelectionControl={showClearLayoutSelectionControl}
          onClearLayoutSelection={onClearPartLayoutSelection}
          valuePlaceholderRows={valuePlaceholderRowsForPartEdit}
          onChangeValuePlaceholderText={onChangeValuePlaceholderText}
          onFocusValuePlaceholderField={onFocusValuePlaceholderField}
          onBlurValuePlaceholderField={onBlurValuePlaceholderField}
          saveButtonLabel={partEditPrimarySaveButtonLabel}
        />
      )}
      {partTypeMenuOpenIndex !== null && partTypeMenuAnchor !== null
        ? createPortal(
            <div
              id={PART_KIND_CHANGE_MENU_ID}
              role="menu"
              aria-label="Part type"
              className="fixed z-[500] rounded-xl border border-black/[0.1] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              style={{
                top: partTypeMenuAnchor.topPx,
                left: partTypeMenuAnchor.leftPx,
                width: partTypeMenuAnchor.widthPx,
                maxHeight: `${partTypeMenuAnchor.maxHeightPx}px`,
                overflowY: "auto",
              }}
            >
              {ADD_PART_KIND_OPTIONS.map((row: AddPartKindOption) => (
                <button
                  key={row.kind}
                  type="button"
                  role="menuitem"
                  className={ADD_PART_KIND_OPTION_CLASS}
                  onClick={() => {
                    onApplyPartKindChange(row.kind);
                  }}
                >
                  <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
