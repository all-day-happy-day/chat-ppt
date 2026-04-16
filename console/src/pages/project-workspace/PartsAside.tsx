import { createPortal } from 'react-dom';
import type { DragEvent, MouseEvent, ReactElement, RefObject } from 'react';
import { Fragment, useCallback, useState } from 'react';
import { TemplateLayoutThumbnail } from '../../components/TemplateLayoutThumbnail';
import {
  findTemplateLayoutEntryByLayoutId,
  getPartTypeLabel,
  getPrimaryLayoutIdFromPart,
  getProjectPartId,
  getProjectPartStableKey,
  PART_KIND_FOR_CREATE,
} from '../../lib/project-parts-for-patch';
import { buildLyricsPartThumbnailCaption } from '../../lib/lyrics-part-contents';
import type { GetLayoutResponse } from '../../types/template-layout';
import {
  ADD_PART_KIND_MENU_ID,
  ADD_PART_KIND_OPTION_CLASS,
  ADD_PART_KIND_OPTIONS,
  type AddPartKindOption,
  PART_KIND_CHANGE_MENU_ID,
} from './constants';
import type { AddPartMenuAnchor } from './types';
import { PartDeleteIcon } from './icons';
import { readProjectPartType } from './utils';

const PART_SORTED_DRAG_PREFIX: string = 'chatPptPartSortedIndex=';

const INSERT_GAP_PLUS_LABEL_CLASS: string =
  'text-xs font-bold leading-none text-neutral-400 group-hover:text-[#0071e3] dark:text-neutral-500 dark:group-hover:text-[#0a84ff]';

const encodeSortedPartDragPayload = (sortedIndex: number): string => {
  return `${PART_SORTED_DRAG_PREFIX}${String(sortedIndex)}`;
};

const decodeSortedPartDragPayload = (raw: string): number | null => {
  if (!raw.startsWith(PART_SORTED_DRAG_PREFIX)) {
    return null;
  }
  const n: number = Number.parseInt(raw.slice(PART_SORTED_DRAG_PREFIX.length), 10);
  return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
};

export type PartsAsideProps = {
  projectPartsAsideRef: RefObject<HTMLElement | null>;
  partsListThumbViewportRef: RefObject<HTMLDivElement | null>;
  partsListMeasureRef: RefObject<HTMLDivElement | null>;
  partsScrollSpacerRef: RefObject<HTMLDivElement | null>;
  partsListScrollerRef: RefObject<HTMLDivElement | null>;
  partTypeMenuTriggerRef: RefObject<HTMLButtonElement | null>;
  sortedParts: unknown[];
  selectedPartIndex: number;
  onSelectPartIndex: (index: number) => void;
  templateLayouts: GetLayoutResponse[];
  plainValueLayoutPreviewSuppressedPartIds: string[];
  isPatchingParts: boolean;
  isAddPartMenuOpen: boolean;
  onOpenAddPartMenu: (anchor: HTMLElement, insertBeforeSortedIndex: number) => void;
  addPartMenuAnchor: AddPartMenuAnchor | null;
  partTypeMenuOpenIndex: number | null;
  onPartTypeMenuButtonClick: (event: MouseEvent<HTMLButtonElement>, index: number) => void;
  onDeletePartAtIndex: (index: number) => void;
  onAddPartOfKind: (kind: AddPartKindOption['kind']) => void;
  onReorderSortedParts: (fromSortedIndex: number, toSortedIndex: number) => void;
  onPartsListRailScroll: () => void;
};

export const PartsAside = ({
  projectPartsAsideRef,
  partsListThumbViewportRef,
  partsListMeasureRef,
  partsScrollSpacerRef,
  partsListScrollerRef,
  partTypeMenuTriggerRef,
  sortedParts,
  selectedPartIndex,
  onSelectPartIndex,
  templateLayouts,
  plainValueLayoutPreviewSuppressedPartIds,
  isPatchingParts,
  isAddPartMenuOpen,
  onOpenAddPartMenu,
  addPartMenuAnchor,
  partTypeMenuOpenIndex,
  onPartTypeMenuButtonClick,
  onDeletePartAtIndex,
  onAddPartOfKind,
  onReorderSortedParts,
  onPartsListRailScroll,
}: PartsAsideProps): ReactElement => {
  const [dragOverPartSortedIndex, setDragOverPartSortedIndex] = useState<number | null>(null);
  const [dragOverInsertSortedIndex, setDragOverInsertSortedIndex] = useState<number | null>(null);

  const clearDragHighlight = useCallback((): void => {
    setDragOverPartSortedIndex(null);
    setDragOverInsertSortedIndex(null);
  }, []);

  const handleDragEnd = useCallback((): void => {
    clearDragHighlight();
  }, [clearDragHighlight]);

  const handlePartDragOver = useCallback(
    (sortedIndex: number) => {
      return (event: DragEvent<HTMLElement>): void => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOverPartSortedIndex(sortedIndex);
        setDragOverInsertSortedIndex(null);
      };
    },
    []
  );

  const handleInsertGapDragOver = useCallback(
    (insertBeforeSortedIndex: number) => {
      return (event: DragEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOverInsertSortedIndex(insertBeforeSortedIndex);
        setDragOverPartSortedIndex(null);
      };
    },
    []
  );

  const handleDragLeaveZone = useCallback((): void => {
    setDragOverPartSortedIndex(null);
    setDragOverInsertSortedIndex(null);
  }, []);

  const handlePartDrop = useCallback(
    (toSortedIndex: number) => {
      return (event: DragEvent<HTMLElement>): void => {
        event.preventDefault();
        const raw: string = event.dataTransfer.getData('text/plain');
        const fromSortedIndex: number | null = decodeSortedPartDragPayload(raw);
        clearDragHighlight();
        if (fromSortedIndex === null || fromSortedIndex === toSortedIndex) {
          return;
        }
        onReorderSortedParts(fromSortedIndex, toSortedIndex);
      };
    },
    [clearDragHighlight, onReorderSortedParts]
  );

  const handleInsertGapDrop = useCallback(
    (insertBeforeSortedIndex: number) => {
      return (event: DragEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        const raw: string = event.dataTransfer.getData('text/plain');
        const fromSortedIndex: number | null = decodeSortedPartDragPayload(raw);
        clearDragHighlight();
        if (fromSortedIndex === null) {
          return;
        }
        onReorderSortedParts(fromSortedIndex, insertBeforeSortedIndex);
      };
    },
    [clearDragHighlight, onReorderSortedParts]
  );

  const handleDragStartFromSortedIndex = useCallback(
    (sortedIndex: number) => {
      return (event: DragEvent<HTMLButtonElement>): void => {
        event.dataTransfer.setData('text/plain', encodeSortedPartDragPayload(sortedIndex));
        event.dataTransfer.effectAllowed = 'move';
      };
    },
    []
  );

  const insertGapClassName = (insertBeforeSortedIndex: number): string => {
    const isActive: boolean = dragOverInsertSortedIndex === insertBeforeSortedIndex;
    return `group relative flex w-3 max-w-[14px] shrink-0 touch-none flex-col items-center justify-center overflow-visible rounded-sm border border-dashed border-transparent px-0 py-0 transition min-h-[18px] max-h-12 sm:h-2 sm:max-h-[10px] sm:min-h-[6px] sm:w-full sm:max-w-none ${
      isActive ? 'border-[#0071e3]/55 bg-[#0071e3]/[0.08] dark:border-[#0a84ff]/50 dark:bg-[#0a84ff]/[0.1]' : ''
    }`;
  };

  return (
    <aside
      ref={projectPartsAsideRef}
      className="relative z-30 min-h-0 w-full shrink-0 overflow-hidden pb-3 sm:flex sm:h-full sm:max-h-full sm:w-auto sm:flex-row sm:items-stretch sm:gap-2 sm:self-stretch sm:pb-0"
      aria-label="Project parts"
    >
      <div
        ref={partsListThumbViewportRef}
        className="flex min-h-0 min-w-0 w-full flex-1 flex-row gap-1 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] sm:h-full sm:max-h-full sm:min-h-0 sm:w-48 sm:max-w-[12rem] sm:flex-col sm:gap-1 sm:overflow-hidden sm:overflow-x-hidden"
      >
        <div
          ref={partsListMeasureRef}
          className="flex w-max min-w-0 shrink-0 flex-row gap-1 sm:w-full sm:flex-col sm:gap-1"
        >
          <button
            type="button"
            data-project-add-part-menu-anchor="true"
            className={insertGapClassName(0)}
            aria-label="Insert part before slide 1"
            disabled={isPatchingParts}
            onClick={(event: MouseEvent<HTMLButtonElement>): void => {
              onOpenAddPartMenu(event.currentTarget, 0);
            }}
            onDragOver={isPatchingParts ? undefined : handleInsertGapDragOver(0)}
            onDragLeave={isPatchingParts ? undefined : handleDragLeaveZone}
            onDrop={isPatchingParts ? undefined : handleInsertGapDrop(0)}
          >
            <span className={INSERT_GAP_PLUS_LABEL_CLASS}>+</span>
          </button>
          {sortedParts.map((part: unknown, index: number) => {
            const isSelected: boolean = index === selectedPartIndex;
            const primaryLayoutId: string | null = getPrimaryLayoutIdFromPart(part);
            const partTypeForThumb: string = readProjectPartType(part);
            const isPlainOrValuePart: boolean =
              partTypeForThumb === PART_KIND_FOR_CREATE.PLAIN || partTypeForThumb === PART_KIND_FOR_CREATE.VALUE;
            const isLyricsPartForThumb: boolean = partTypeForThumb === PART_KIND_FOR_CREATE.LYRICS;
            const partIdForThumb: string | null = getProjectPartId(part);
            const suppressThumb: boolean =
              partIdForThumb !== null &&
              plainValueLayoutPreviewSuppressedPartIds.includes(partIdForThumb) &&
              isPlainOrValuePart;
            const effectivePrimaryLayoutId: string | null =
              isLyricsPartForThumb || suppressThumb ? null : primaryLayoutId;
            const thumbLayoutEntry: GetLayoutResponse | null =
              effectivePrimaryLayoutId !== null
                ? findTemplateLayoutEntryByLayoutId(templateLayouts, effectivePrimaryLayoutId)
                : null;
            const partTypeLabel: string = getPartTypeLabel(part);
            const isDropTargetPart: boolean = dragOverPartSortedIndex === index;
            return (
              <Fragment key={getProjectPartStableKey(part, index)}>
                <div
                  className={`relative flex shrink-0 flex-col gap-1 sm:w-full ${
                    isDropTargetPart ? 'rounded-xl ring-2 ring-[#0071e3]/45 dark:ring-[#0a84ff]/45' : ''
                  }`}
                >
                  <div
                    className={`relative min-w-0 rounded-lg sm:w-full ${
                      isSelected ? 'ring-2 ring-[#0071e3]/35 dark:ring-[#0a84ff]/40' : ''
                    }`}
                    onDragOver={isPatchingParts ? undefined : handlePartDragOver(index)}
                    onDragLeave={isPatchingParts ? undefined : handleDragLeaveZone}
                    onDrop={isPatchingParts ? undefined : handlePartDrop(index)}
                  >
                    <div
                      className={`flex w-full flex-col rounded-lg border text-left transition ${
                        isSelected
                          ? 'border-[#0071e3] bg-white shadow-sm dark:border-[#0a84ff] dark:bg-[#2c2c2e]'
                          : 'border-black/[0.08] bg-white/90 hover:border-black/[0.14] dark:border-white/[0.1] dark:bg-[#1c1c1e]/90 dark:hover:border-white/[0.16]'
                      }`}
                    >
                      <button
                        type="button"
                        draggable={!isPatchingParts}
                        title="Drag slide to reorder"
                        aria-label={`Slide ${String(index + 1)} — click to select, drag to reorder`}
                        className={`flex w-full flex-col gap-1 rounded-t-lg p-2 pb-1 text-left outline-none transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
                          isPatchingParts ? '' : 'cursor-grab active:cursor-grabbing'
                        }`}
                        onDragStart={handleDragStartFromSortedIndex(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={isPatchingParts ? undefined : handlePartDragOver(index)}
                        onDragLeave={isPatchingParts ? undefined : handleDragLeaveZone}
                        onDrop={isPatchingParts ? undefined : handlePartDrop(index)}
                        onClick={() => {
                          onSelectPartIndex(index);
                        }}
                      >
                          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-neutral-200/90 dark:bg-neutral-800/90">
                            {isLyricsPartForThumb ? (
                              <div className="flex h-full w-full items-center justify-center px-1" role="status">
                                <span className="text-center text-[10px] font-medium leading-tight text-neutral-500 dark:text-neutral-400">
                                  {buildLyricsPartThumbnailCaption(part)}
                                </span>
                              </div>
                            ) : thumbLayoutEntry !== null ? (
                              <TemplateLayoutThumbnail
                                key={`part-thumb-${getProjectPartId(part) ?? `idx-${String(index)}`}-${effectivePrimaryLayoutId ?? 'nolayout'}`}
                                entry={thumbLayoutEntry}
                                className="block h-full w-full"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                                {index + 1}
                              </div>
                            )}
                            <span
                              className="pointer-events-none absolute left-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white"
                              aria-hidden
                            >
                              {index + 1}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          ref={partTypeMenuOpenIndex === index ? partTypeMenuTriggerRef : undefined}
                          className="w-full truncate rounded-b-lg px-2 pb-2 pt-0 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500 outline-none transition hover:bg-black/[0.02] hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-white/[0.03] dark:hover:text-neutral-200 dark:focus-visible:ring-[#0a84ff]"
                          aria-haspopup="menu"
                          aria-expanded={partTypeMenuOpenIndex === index}
                          aria-controls={PART_KIND_CHANGE_MENU_ID}
                          disabled={isPatchingParts}
                          onDragOver={isPatchingParts ? undefined : handlePartDragOver(index)}
                          onDragLeave={isPatchingParts ? undefined : handleDragLeaveZone}
                          onDrop={isPatchingParts ? undefined : handlePartDrop(index)}
                          onClick={(event: MouseEvent<HTMLButtonElement>): void => {
                            onPartTypeMenuButtonClick(event, index);
                          }}
                        >
                          {partTypeLabel}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-black/[0.06] bg-white/95 text-neutral-500 shadow-sm outline-none transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:opacity-40 dark:border-white/[0.1] dark:bg-[#2c2c2e]/95 dark:text-neutral-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/15 dark:hover:text-red-400 dark:focus-visible:ring-[#0a84ff]"
                        aria-label={`Delete part ${String(index + 1)}`}
                        disabled={isPatchingParts}
                        onClick={(event: MouseEvent<HTMLButtonElement>): void => {
                          event.stopPropagation();
                          onDeletePartAtIndex(index);
                        }}
                      >
                        <PartDeleteIcon />
                      </button>
                  </div>
                </div>
                {index < sortedParts.length - 1 ? (
                  <button
                    type="button"
                    data-project-add-part-menu-anchor="true"
                    className={insertGapClassName(index + 1)}
                    aria-label={`Insert part between slides ${String(index + 1)} and ${String(index + 2)}`}
                    disabled={isPatchingParts}
                    onClick={(event: MouseEvent<HTMLButtonElement>): void => {
                      onOpenAddPartMenu(event.currentTarget, index + 1);
                    }}
                    onDragOver={isPatchingParts ? undefined : handleInsertGapDragOver(index + 1)}
                    onDragLeave={isPatchingParts ? undefined : handleDragLeaveZone}
                    onDrop={isPatchingParts ? undefined : handleInsertGapDrop(index + 1)}
                  >
                    <span className={INSERT_GAP_PLUS_LABEL_CLASS}>+</span>
                  </button>
                ) : null}
              </Fragment>
            );
          })}
          <Fragment>
            {sortedParts.length > 0 ? (
              <button
                type="button"
                data-project-add-part-menu-anchor="true"
                className={insertGapClassName(sortedParts.length)}
                aria-label={`Insert part after slide ${String(sortedParts.length)}`}
                disabled={isPatchingParts}
                onClick={(event: MouseEvent<HTMLButtonElement>): void => {
                  onOpenAddPartMenu(event.currentTarget, sortedParts.length);
                }}
                onDragOver={isPatchingParts ? undefined : handleInsertGapDragOver(sortedParts.length)}
                onDragLeave={isPatchingParts ? undefined : handleDragLeaveZone}
                onDrop={isPatchingParts ? undefined : handleInsertGapDrop(sortedParts.length)}
              >
                <span className={INSERT_GAP_PLUS_LABEL_CLASS}>+</span>
              </button>
            ) : null}
            {isAddPartMenuOpen && addPartMenuAnchor !== null
              ? createPortal(
                  <div
                    id={ADD_PART_KIND_MENU_ID}
                    role="menu"
                    aria-label="Part type"
                    className="fixed z-[500] rounded-xl border border-black/[0.1] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                    style={{
                      top: addPartMenuAnchor.topPx,
                      left: addPartMenuAnchor.leftPx,
                      width: addPartMenuAnchor.widthPx,
                      maxHeight: `${addPartMenuAnchor.maxHeightPx}px`,
                      overflowY: 'auto',
                    }}
                  >
                    {ADD_PART_KIND_OPTIONS.map((row: AddPartKindOption) => (
                      <button
                        key={row.kind}
                        type="button"
                        role="menuitem"
                        className={ADD_PART_KIND_OPTION_CLASS}
                        disabled={isPatchingParts}
                        onClick={() => {
                          onAddPartOfKind(row.kind);
                        }}
                      >
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.label}</span>
                      </button>
                    ))}
                  </div>,
                  document.body
                )
              : null}
          </Fragment>
        </div>
      </div>
      <div
        ref={partsListScrollerRef}
        className="hidden min-h-0 w-3 shrink-0 touch-pan-y overflow-y-auto overflow-x-hidden sm:block"
        aria-label="Scroll project parts"
        onScroll={onPartsListRailScroll}
      >
        <div ref={partsScrollSpacerRef} className="pointer-events-none w-px shrink-0" />
      </div>
    </aside>
  );
};
