import { type ReactNode,useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { TemplateLayoutChoice } from "../lib/project-parts-for-patch";

import { TemplateLayoutThumbnail } from "./TemplateLayoutThumbnail";

/** Plain/Value part editor — keep id stable for wheel trap and aria-controls. */
export const PART_EDIT_LAYOUT_PALETTE_MENU_ID: string = "part-edit-layout-palette-menu";

export const LYRICS_EDIT_LYRICS_LAYOUT_PALETTE_MENU_ID: string = "lyrics-edit-lyrics-layout-palette-menu";

export const LYRICS_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID: string = "lyrics-edit-title-layout-palette-menu";

export const BIBLE_EDIT_PHRASE_LAYOUT_PALETTE_MENU_ID: string = "bible-edit-phrase-layout-palette-menu";

export const BIBLE_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID: string = "bible-edit-title-layout-palette-menu";

const LAYOUT_PALETTE_VIEWPORT_GUTTER_PX: number = 8;

const LAYOUT_PALETTE_MENU_MAX_WIDTH_PX: number = 260;

const LAYOUT_PALETTE_MENU_FALLBACK_HEIGHT_PX: number = 220;

const LAYOUT_PALETTE_MENU_MIN_SCROLL_HEIGHT_PX: number = 120;

const PART_EDIT_LAYOUT_NONE_TITLE: string = "No layout selected";

const PART_EDIT_LAYOUT_NONE_HINT: string = "Choose a slide layout from your template gallery.";

const PART_EDIT_LAYOUT_UNKNOWN_HINT: string = "This layout is not in the gallery list. Pick another layout below.";

const PART_EDIT_ORPHAN_LAYOUT_TITLE: string = "Layout unavailable";

const LAYOUT_PREVIEW_TRIGGER_CLASS: string =
  "flex w-full flex-col gap-2 rounded-xl border border-black/[0.1] bg-neutral-50/80 p-2.5 text-left outline-none transition hover:border-black/[0.18] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-white/[0.04] dark:hover:border-white/[0.2] dark:hover:bg-white/[0.06] dark:focus-visible:ring-[#0a84ff]";

const DEFAULT_NONE_CHOICE_TILE_LABEL: string = "No slide layout";

type LayoutPaletteAnchor = {
  topPx: number;
  leftPx: number;
  widthPx: number;
  maxHeightPx: number;
};

export type TemplateLayoutGalleryPickerProps = {
  layoutFieldLabel: string;
  menuId: string;
  layoutChoices: TemplateLayoutChoice[];
  selectedLayoutId: string | null;
  onSelectLayout: (layoutId: string | null) => void;
  /** When true, gallery lists a first tile that clears the selection (null). */
  showNoneChoiceInGallery: boolean;
  /** Label on the empty-selection tile inside the gallery popover. */
  noneChoiceTileLabel?: string;
};

export const TemplateLayoutGalleryPicker = ({
  layoutFieldLabel,
  menuId,
  layoutChoices,
  selectedLayoutId,
  onSelectLayout,
  showNoneChoiceInGallery,
  noneChoiceTileLabel = DEFAULT_NONE_CHOICE_TILE_LABEL,
}: TemplateLayoutGalleryPickerProps): ReactNode => {
  const [isLayoutPaletteOpen, setIsLayoutPaletteOpen] = useState<boolean>(false);
  const [layoutPaletteAnchor, setLayoutPaletteAnchor] = useState<LayoutPaletteAnchor | null>(null);
  const layoutPreviewTriggerRef = useRef<HTMLButtonElement | null>(null);

  const updateLayoutPaletteAnchor = useCallback((): void => {
    if (!isLayoutPaletteOpen) {
      return;
    }
    const trigger: HTMLButtonElement | null = layoutPreviewTriggerRef.current;
    if (trigger === null) {
      return;
    }
    const rect: DOMRect = trigger.getBoundingClientRect();
    const gutter: number = LAYOUT_PALETTE_VIEWPORT_GUTTER_PX;
    const widthPx: number = Math.min(LAYOUT_PALETTE_MENU_MAX_WIDTH_PX, window.innerWidth - gutter * 2);
    let leftPx: number = rect.left;
    const maxLeft: number = window.innerWidth - gutter - widthPx;
    if (leftPx > maxLeft) {
      leftPx = maxLeft;
    }
    if (leftPx < gutter) {
      leftPx = gutter;
    }
    const paletteEl: HTMLElement | null = document.getElementById(menuId);
    const measuredHeight: number =
      paletteEl !== null ? paletteEl.getBoundingClientRect().height : LAYOUT_PALETTE_MENU_FALLBACK_HEIGHT_PX;
    const effectiveHeight: number = measuredHeight > 0 ? measuredHeight : LAYOUT_PALETTE_MENU_FALLBACK_HEIGHT_PX;
    const viewportBottom: number = window.innerHeight - gutter;
    let topPx: number = rect.bottom + gutter;
    if (topPx + effectiveHeight > viewportBottom) {
      const topIfAbove: number = rect.top - effectiveHeight - gutter;
      if (topIfAbove >= gutter) {
        topPx = topIfAbove;
      } else {
        topPx = gutter;
      }
    }
    const maxHeightPx: number = Math.max(LAYOUT_PALETTE_MENU_MIN_SCROLL_HEIGHT_PX, Math.floor(viewportBottom - topPx));
    setLayoutPaletteAnchor({ topPx, leftPx, widthPx, maxHeightPx });
  }, [isLayoutPaletteOpen, menuId]);

  useLayoutEffect(() => {
    if (!isLayoutPaletteOpen) {
      setLayoutPaletteAnchor(null);
      return;
    }
    updateLayoutPaletteAnchor();
    const rafId: number = window.requestAnimationFrame(() => {
      updateLayoutPaletteAnchor();
    });
    const handleReposition = (): void => {
      updateLayoutPaletteAnchor();
    };
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateLayoutPaletteAnchor();
      });
      const triggerNode: HTMLButtonElement | null = layoutPreviewTriggerRef.current;
      if (triggerNode !== null) {
        resizeObserver.observe(triggerNode);
      }
      const paletteNode: HTMLElement | null = document.getElementById(menuId);
      if (paletteNode !== null) {
        resizeObserver.observe(paletteNode);
      }
    }
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      resizeObserver?.disconnect();
    };
  }, [isLayoutPaletteOpen, updateLayoutPaletteAnchor, menuId]);

  useEffect(() => {
    if (!isLayoutPaletteOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const targetNode: Node = event.target;
      const trigger: HTMLButtonElement | null = layoutPreviewTriggerRef.current;
      if (trigger !== null && trigger.contains(targetNode)) {
        return;
      }
      const paletteEl: HTMLElement | null = document.getElementById(menuId);
      if (paletteEl !== null && paletteEl.contains(targetNode)) {
        return;
      }
      setIsLayoutPaletteOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isLayoutPaletteOpen, menuId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      if (!isLayoutPaletteOpen) {
        return;
      }
      event.stopPropagation();
      setIsLayoutPaletteOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isLayoutPaletteOpen]);

  const handleToggleLayoutPalette = useCallback((): void => {
    if (layoutChoices.length === 0 && !showNoneChoiceInGallery) {
      return;
    }
    setIsLayoutPaletteOpen((open: boolean) => !open);
  }, [layoutChoices.length, showNoneChoiceInGallery]);

  const previewChoice: TemplateLayoutChoice | undefined =
    selectedLayoutId === null
      ? undefined
      : layoutChoices.find((c: TemplateLayoutChoice) => c.layoutId === selectedLayoutId);

  const layoutGalleryPortal: ReactNode =
    isLayoutPaletteOpen && layoutPaletteAnchor !== null
      ? createPortal(
          <div
            id={menuId}
            role="listbox"
            aria-label={layoutFieldLabel}
            className="fixed z-[480] overflow-y-auto rounded-xl border border-black/[0.1] bg-white py-2 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
            style={{
              top: layoutPaletteAnchor.topPx,
              left: layoutPaletteAnchor.leftPx,
              width: layoutPaletteAnchor.widthPx,
              maxHeight: layoutPaletteAnchor.maxHeightPx,
              overflowY: "auto",
            }}
          >
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 px-2">
              {showNoneChoiceInGallery ? (
                <button
                  key="__layout-none__"
                  type="button"
                  role="option"
                  aria-selected={selectedLayoutId === null}
                  className={`col-span-2 flex flex-col items-center gap-1 rounded-lg border p-1.5 outline-none transition focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:focus-visible:ring-[#0a84ff] ${
                    selectedLayoutId === null
                      ? "border-[#0071e3]/55 bg-[#0071e3]/[0.06] dark:border-[#0a84ff]/50 dark:bg-[#0a84ff]/[0.08]"
                      : "border-transparent hover:bg-neutral-50 dark:hover:bg-white/[0.05]"
                  }`}
                  onClick={() => {
                    onSelectLayout(null);
                    setIsLayoutPaletteOpen(false);
                  }}
                >
                  <div className="flex aspect-video w-full max-w-full items-center justify-center overflow-hidden rounded-[2px] border border-dashed border-black/[0.14] bg-neutral-100/90 dark:border-white/[0.14] dark:bg-neutral-900/80">
                    <span className="px-2 text-center text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                      {noneChoiceTileLabel}
                    </span>
                  </div>
                </button>
              ) : null}
              {layoutChoices.map((choice: TemplateLayoutChoice) => {
                const isSelected: boolean = selectedLayoutId === choice.layoutId;
                return (
                  <button
                    key={choice.layoutId}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 outline-none transition focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:focus-visible:ring-[#0a84ff] ${
                      isSelected
                        ? "border-[#0071e3]/55 bg-[#0071e3]/[0.06] dark:border-[#0a84ff]/50 dark:bg-[#0a84ff]/[0.08]"
                        : "border-transparent hover:bg-neutral-50 dark:hover:bg-white/[0.05]"
                    }`}
                    onClick={() => {
                      onSelectLayout(choice.layoutId);
                      setIsLayoutPaletteOpen(false);
                    }}
                  >
                    <div className="mx-auto aspect-video w-full max-w-18 overflow-hidden rounded-[2px] border border-black/[0.12] bg-white dark:border-white/[0.12] dark:bg-neutral-950">
                      <TemplateLayoutThumbnail entry={choice.entry} className="block h-full w-full" />
                    </div>
                    <span className="line-clamp-2 w-full max-w-[5.75rem] text-center text-[10px] font-medium leading-tight text-neutral-600 dark:text-neutral-400">
                      {choice.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {layoutFieldLabel}
      </p>
      {selectedLayoutId === null ? (
        <button
          ref={layoutPreviewTriggerRef}
          type="button"
          className={LAYOUT_PREVIEW_TRIGGER_CLASS}
          aria-expanded={isLayoutPaletteOpen}
          aria-haspopup="listbox"
          aria-controls={menuId}
          onClick={handleToggleLayoutPalette}
        >
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-black/[0.14] bg-neutral-100/90 dark:border-white/[0.14] dark:bg-neutral-900/80">
            <span className="px-2 text-center text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
              {PART_EDIT_LAYOUT_NONE_TITLE}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2 px-0.5">
            <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-neutral-500 dark:text-neutral-400">
              {PART_EDIT_LAYOUT_NONE_HINT}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-[#0071e3] dark:text-[#0a84ff]">
              {isLayoutPaletteOpen ? "Hide gallery" : "Show gallery"}
            </span>
          </div>
        </button>
      ) : previewChoice !== undefined ? (
        <button
          ref={layoutPreviewTriggerRef}
          type="button"
          className={LAYOUT_PREVIEW_TRIGGER_CLASS}
          aria-expanded={isLayoutPaletteOpen}
          aria-haspopup="listbox"
          aria-controls={menuId}
          onClick={handleToggleLayoutPalette}
        >
          <div className="aspect-video w-full overflow-hidden rounded-md border border-black/[0.12] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border-white/[0.12] dark:bg-neutral-950 dark:shadow-none">
            <TemplateLayoutThumbnail entry={previewChoice.entry} className="block h-full w-full" />
          </div>
          <div className="flex items-start justify-between gap-2 px-0.5">
            <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-neutral-800 dark:text-neutral-100">
              {previewChoice.label}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-[#0071e3] dark:text-[#0a84ff]">
              {isLayoutPaletteOpen ? "Hide gallery" : "Show gallery"}
            </span>
          </div>
          <span className="px-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
            Opens the layout gallery from your template
          </span>
        </button>
      ) : (
        <button
          ref={layoutPreviewTriggerRef}
          type="button"
          className={LAYOUT_PREVIEW_TRIGGER_CLASS}
          aria-expanded={isLayoutPaletteOpen}
          aria-haspopup="listbox"
          aria-controls={menuId}
          onClick={handleToggleLayoutPalette}
        >
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-amber-200/80 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-500/10">
            <span className="px-2 text-center text-[11px] font-medium text-amber-950 dark:text-amber-100/95">
              {PART_EDIT_ORPHAN_LAYOUT_TITLE}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2 px-0.5">
            <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-neutral-600 dark:text-neutral-400">
              {PART_EDIT_LAYOUT_UNKNOWN_HINT}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-[#0071e3] dark:text-[#0a84ff]">
              {isLayoutPaletteOpen ? "Hide gallery" : "Show gallery"}
            </span>
          </div>
        </button>
      )}
      {layoutGalleryPortal}
    </div>
  );
};
