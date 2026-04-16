import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import type { LyricsSongLine } from "../lib/lyrics-part-contents";
import {
  LYRIC_BLANK_PART_NAME,
  normalizeLyricsPartSequence,
  resequenceAfterDefinitionRemoved,
} from "../lib/lyrics-part-contents";

const PART_NAME_LABEL: string = "Part name";

const PART_LYRICS_LABEL: string = "Lyrics";

const MOVE_UP_LABEL: string = "Move up";

const MOVE_DOWN_LABEL: string = "Move down";

const REMOVE_PART_LABEL: string = "Remove part";

const ADD_PART_LABEL: string = "+ Add part";

const MIN_LYRIC_PART_COUNT: number = 1;

const PARTS_COLUMN_TITLE: string = "Parts";

const PARTS_COLUMN_HELPER: string = "Set each part name and the lyrics for that section.";

const SONG_PART_LIST_TITLE: string = "Song Part List";

const SONG_PART_LIST_HELPER: string =
  "Click a part to append to the end, or drag it into the song form where you want it.";

const SONG_FORM_TITLE: string = "Song Form";

const SONG_FORM_HELPER: string =
  "Drag tiles to reorder (drop near the blue insertion line), drag from the list to add, or drag a tile outside this strip to remove it.";

const PALETTE_DRAG_PREFIX: string = "lyricsPaletteDef=";

const MIME_LYRICS_PALETTE: string = "application/x-chat-ppt-lyrics-palette";

const MIME_LYRICS_FORM_SLOT: string = "application/x-chat-ppt-lyrics-form-slot";

const FLIP_MOVE_DURATION_MS: number = 220;

const FLIP_MOVE_EASING: string = "cubic-bezier(0.25, 0.1, 0.25, 1)";

const EMPTY_SONG_FORM_DROP_LINE_HEIGHT_PX: number = 32;

const EMPTY_SONG_FORM_HINT: string = "Add parts from the list above — or leave empty.";

const FORM_SLOT_DRAG_TYPE: string = "text/plain";

const FORM_SLOT_DRAG_PREFIX: string = "lyricsFormSlot=";

const TEXT_FIELD_CLASS: string =
  "mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

const TEXTAREA_FIELD_CLASS: string =
  "mt-1 min-h-[5.5rem] w-full resize-y rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

const PART_CHIP_STYLES: readonly string[] = [
  "border-rose-200/80 bg-rose-100 text-rose-950 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-100",
  "border-emerald-200/80 bg-emerald-100 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100",
  "border-violet-200/80 bg-violet-100 text-violet-950 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-100",
  "border-amber-200/80 bg-amber-100 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100",
  "border-sky-200/80 bg-sky-100 text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-100",
  "border-fuchsia-200/80 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-800/50 dark:bg-fuchsia-950/40 dark:text-fuchsia-100",
] as const;

const deriveDefaultPartLabel = (ordinal: number): string => {
  return `Part ${String(ordinal)}`;
};

const chipDisplayLabel = (line: LyricsSongLine, definitionIndex: number): string => {
  const trimmed: string = line.part.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return deriveDefaultPartLabel(definitionIndex + 1);
};

/** Lead `blank` with empty lyrics is palette-only in split layout when other definitions exist. */
const shouldHideLeadBlankInSplitPartsColumn = (line: LyricsSongLine, definitionIndex: number, lineCount: number): boolean => {
  if (lineCount <= 1) {
    return false;
  }
  return (
    definitionIndex === 0 &&
    line.part.trim().toLowerCase() === LYRIC_BLANK_PART_NAME &&
    line.lyrics.trim() === ""
  );
};

const CHIP_BUTTON_CLASS: string =
  "flex max-w-[4rem] min-h-8 max-h-14 shrink-0 items-center justify-center rounded-md border px-2 py-1.5 text-center text-[9px] font-semibold leading-snug shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:shadow-none dark:focus-visible:ring-[#0a84ff] line-clamp-2 break-words [overflow-wrap:anywhere]";

const CHIP_PALETTE_DRAG_CLASS: string = `${CHIP_BUTTON_CLASS} cursor-grab active:cursor-grabbing`;

const CHIP_FORM_TILE_CLASS: string = `${CHIP_BUTTON_CLASS} cursor-grab active:cursor-grabbing`;

const computeSongFormInsertIndexFromTrack = (track: HTMLElement, clientX: number): number => {
  const chips: HTMLElement[] = Array.from(track.querySelectorAll<HTMLElement>("[data-lyrics-form-chip]"));
  if (chips.length === 0) {
    return 0;
  }
  for (let i: number = 0; i < chips.length; i += 1) {
    const r: DOMRect = chips[i]!.getBoundingClientRect();
    const midX: number = r.left + r.width / 2;
    if (clientX < midX) {
      return i;
    }
  }
  return chips.length;
};

const moveFormSlotToInsertIndex = (sequence: number[], fromSlot: number, insertBefore: number): number[] => {
  const boundedInsertBefore: number = Math.max(0, Math.min(insertBefore, sequence.length));
  const next: number[] = [...sequence];
  const [moved] = next.splice(fromSlot, 1);
  let insertAt: number = boundedInsertBefore;
  if (fromSlot < boundedInsertBefore) {
    insertAt -= 1;
  }
  next.splice(insertAt, 0, moved!);
  return next;
};

type LyricsSongPartsEditorVariant = "stacked" | "split";

type SongFormDropIndicatorMetrics = {
  leftPx: number;
  topPx: number;
  heightPx: number;
};

export type LyricsSongPartsEditorProps = {
  lines: LyricsSongLine[];
  onChange: (next: LyricsSongLine[]) => void;
  fieldIdPrefix: string;
  variant?: LyricsSongPartsEditorVariant;
  partSequence?: number[];
  onPartSequenceChange?: (next: number[]) => void;
};

type PartFieldsBlockProps = {
  line: LyricsSongLine;
  index: number;
  fieldIdPrefix: string;
  onPartNameChange: (index: number, value: string) => void;
  onLyricsChange: (index: number, value: string) => void;
};

const PartFieldsBlock = ({
  line,
  index,
  fieldIdPrefix,
  onPartNameChange,
  onLyricsChange,
}: PartFieldsBlockProps): ReactElement => {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label
          htmlFor={`${fieldIdPrefix}-part-name-${String(index)}`}
          className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
        >
          {PART_NAME_LABEL}
        </label>
        <input
          id={`${fieldIdPrefix}-part-name-${String(index)}`}
          type="text"
          className={TEXT_FIELD_CLASS}
          value={line.part}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => {
            onPartNameChange(index, event.target.value);
          }}
          autoComplete="off"
        />
      </div>
      <div>
        <label
          htmlFor={`${fieldIdPrefix}-part-body-${String(index)}`}
          className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
        >
          {PART_LYRICS_LABEL}
        </label>
        <textarea
          id={`${fieldIdPrefix}-part-body-${String(index)}`}
          className={TEXTAREA_FIELD_CLASS}
          value={line.lyrics}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
            onLyricsChange(index, event.target.value);
          }}
          spellCheck="true"
        />
      </div>
    </div>
  );
};

export const LyricsSongPartsEditor = ({
  lines,
  onChange,
  fieldIdPrefix,
  variant = "stacked",
  partSequence,
  onPartSequenceChange,
}: LyricsSongPartsEditorProps): ReactElement => {
  const songFormStripRef = useRef<HTMLDivElement | null>(null);

  const songFormTrackRef = useRef<HTMLDivElement | null>(null);

  const songFormDragOverRafRef = useRef<number | null>(null);

  const formSlotDropCommittedRef = useRef<boolean>(false);

  const [songFormDropIndicator, setSongFormDropIndicator] = useState<SongFormDropIndicatorMetrics | null>(null);

  const [draggingFormSlotIndex, setDraggingFormSlotIndex] = useState<number | null>(null);

  const [draggingPaletteIndex, setDraggingPaletteIndex] = useState<number | null>(null);

  const formChipFirstRectBySlotRef = useRef<Map<number, DOMRect> | null>(null);

  const formChipFlipGenerationRef = useRef<number>(0);

  useLayoutEffect(() => {
    if (variant !== "split" || partSequence === undefined) {
      formChipFirstRectBySlotRef.current = null;
      return;
    }
    const seq: number[] = normalizeLyricsPartSequence(lines.length, partSequence);
    if (seq.length === 0) {
      formChipFirstRectBySlotRef.current = null;
      return;
    }
    const strip: HTMLDivElement | null = songFormStripRef.current;
    if (strip === null) {
      return;
    }
    const nodes: NodeListOf<HTMLElement> = strip.querySelectorAll<HTMLElement>("[data-lyrics-form-chip]");
    const lastBySlot: Map<number, DOMRect> = new Map();
    nodes.forEach((node: HTMLElement): void => {
      const slotText: string | undefined = node.dataset.slot;
      if (slotText === undefined) {
        return;
      }
      const slot: number = Number.parseInt(slotText, 10);
      if (!Number.isInteger(slot) || slot < 0) {
        return;
      }
      lastBySlot.set(slot, node.getBoundingClientRect());
    });
    const firstBySlot: Map<number, DOMRect> | null = formChipFirstRectBySlotRef.current;
    formChipFirstRectBySlotRef.current = lastBySlot;
    if (firstBySlot === null || firstBySlot.size === 0) {
      return;
    }
    formChipFlipGenerationRef.current += 1;
    const generation: number = formChipFlipGenerationRef.current;
    nodes.forEach((node: HTMLElement): void => {
      const slotText: string | undefined = node.dataset.slot;
      if (slotText === undefined) {
        return;
      }
      const slot: number = Number.parseInt(slotText, 10);
      if (!Number.isInteger(slot)) {
        return;
      }
      const firstRect: DOMRect | undefined = firstBySlot.get(slot);
      const lastRect: DOMRect | undefined = lastBySlot.get(slot);
      if (firstRect === undefined || lastRect === undefined) {
        return;
      }
      const dx: number = firstRect.left - lastRect.left;
      const dy: number = firstRect.top - lastRect.top;
      if (dx === 0 && dy === 0) {
        return;
      }
      node.style.transform = `translate(${String(dx)}px, ${String(dy)}px)`;
      node.style.transition = "transform 0s";
      requestAnimationFrame((): void => {
        if (formChipFlipGenerationRef.current !== generation) {
          return;
        }
        requestAnimationFrame((): void => {
          if (formChipFlipGenerationRef.current !== generation) {
            return;
          }
          node.style.transition = `transform ${String(FLIP_MOVE_DURATION_MS)}ms ${FLIP_MOVE_EASING}`;
          node.style.transform = "";
        });
      });
    });
  }, [variant, lines.length, partSequence]);

  useEffect(() => {
    if (variant !== "split") {
      return;
    }
    const clearSongFormDragUi = (): void => {
      setSongFormDropIndicator(null);
      setDraggingFormSlotIndex(null);
      setDraggingPaletteIndex(null);
      if (songFormDragOverRafRef.current !== null) {
        window.cancelAnimationFrame(songFormDragOverRafRef.current);
        songFormDragOverRafRef.current = null;
      }
    };
    document.addEventListener("dragend", clearSongFormDragUi);
    return (): void => {
      document.removeEventListener("dragend", clearSongFormDragUi);
    };
  }, [variant]);

  const handlePartNameChange = useCallback(
    (index: number, value: string): void => {
      onChange(
        lines.map((line: LyricsSongLine, i: number): LyricsSongLine => (i === index ? { ...line, part: value } : line))
      );
    },
    [lines, onChange]
  );

  const handleLyricsChange = useCallback(
    (index: number, value: string): void => {
      onChange(
        lines.map(
          (line: LyricsSongLine, i: number): LyricsSongLine => (i === index ? { ...line, lyrics: value } : line)
        )
      );
    },
    [lines, onChange]
  );

  const handleMoveLineUp = useCallback(
    (index: number): void => {
      if (index <= 0) {
        return;
      }
      const next: LyricsSongLine[] = [...lines];
      const current: LyricsSongLine = next[index]!;
      const above: LyricsSongLine = next[index - 1]!;
      next[index - 1] = current;
      next[index] = above;
      onChange(next);
    },
    [lines, onChange]
  );

  const handleMoveLineDown = useCallback(
    (index: number): void => {
      if (index >= lines.length - 1) {
        return;
      }
      const next: LyricsSongLine[] = [...lines];
      const current: LyricsSongLine = next[index]!;
      const below: LyricsSongLine = next[index + 1]!;
      next[index + 1] = current;
      next[index] = below;
      onChange(next);
    },
    [lines, onChange]
  );

  const handleRemoveLine = useCallback(
    (index: number): void => {
      if (lines.length <= MIN_LYRIC_PART_COUNT) {
        return;
      }
      const nextLines: LyricsSongLine[] = lines.filter((_: LyricsSongLine, i: number): boolean => i !== index);
      if (variant === "split" && partSequence !== undefined && onPartSequenceChange !== undefined) {
        const nextSeq: number[] = resequenceAfterDefinitionRemoved(partSequence, index);
        onChange(nextLines);
        onPartSequenceChange(normalizeLyricsPartSequence(nextLines.length, nextSeq));
        return;
      }
      onChange(nextLines);
    },
    [lines, onChange, variant, partSequence, onPartSequenceChange]
  );

  const handleAddLine = useCallback((): void => {
    const nextOrdinal: number = lines.length + 1;
    const newLines: LyricsSongLine[] = [...lines, { part: deriveDefaultPartLabel(nextOrdinal), lyrics: "" }];
    if (variant === "split" && partSequence !== undefined && onPartSequenceChange !== undefined) {
      onChange(newLines);
      onPartSequenceChange(normalizeLyricsPartSequence(newLines.length, [...partSequence, newLines.length - 1]));
      return;
    }
    onChange(newLines);
  }, [lines, onChange, variant, partSequence, onPartSequenceChange]);

  const handleAppendDefinitionToForm = useCallback(
    (definitionIndex: number): void => {
      if (onPartSequenceChange === undefined || partSequence === undefined) {
        return;
      }
      if (definitionIndex < 0 || definitionIndex >= lines.length) {
        return;
      }
      onPartSequenceChange(normalizeLyricsPartSequence(lines.length, [...partSequence, definitionIndex]));
    },
    [lines.length, onPartSequenceChange, partSequence]
  );

  const handlePaletteKeyDown = useCallback(
    (definitionIndex: number) => {
      return (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        handleAppendDefinitionToForm(definitionIndex);
      };
    },
    [handleAppendDefinitionToForm]
  );

  const updateSongFormDropIndicator = useCallback((clientX: number): void => {
    const strip: HTMLDivElement | null = songFormStripRef.current;
    const track: HTMLDivElement | null = songFormTrackRef.current;
    if (strip === null || track === null) {
      return;
    }
    const stripRect: DOMRect = strip.getBoundingClientRect();
    const insertIndex: number = computeSongFormInsertIndexFromTrack(track, clientX);
    const chips: HTMLElement[] = Array.from(track.querySelectorAll<HTMLElement>("[data-lyrics-form-chip]"));
    let topPx: number;
    let heightPx: number;
    let leftPx: number = 10;
    if (chips.length === 0) {
      heightPx = EMPTY_SONG_FORM_DROP_LINE_HEIGHT_PX;
      topPx = (stripRect.height - heightPx) / 2;
      leftPx = stripRect.width / 2 - 1.5;
    } else if (insertIndex === 0) {
      const r0: DOMRect = chips[0]!.getBoundingClientRect();
      topPx = r0.top - stripRect.top;
      heightPx = r0.height;
      leftPx = r0.left - stripRect.left - 2;
    } else if (insertIndex >= chips.length) {
      const rLast: DOMRect = chips[chips.length - 1]!.getBoundingClientRect();
      topPx = rLast.top - stripRect.top;
      heightPx = rLast.height;
      leftPx = rLast.right - stripRect.left + 2;
    } else {
      const rPrev: DOMRect = chips[insertIndex - 1]!.getBoundingClientRect();
      const rNext: DOMRect = chips[insertIndex]!.getBoundingClientRect();
      const topEdge: number = Math.min(rPrev.top, rNext.top);
      const bottomEdge: number = Math.max(rPrev.bottom, rNext.bottom);
      topPx = topEdge - stripRect.top;
      heightPx = bottomEdge - topEdge;
      leftPx = (rPrev.right + rNext.left) / 2 - stripRect.left;
    }
    setSongFormDropIndicator((prev: SongFormDropIndicatorMetrics | null) => {
      const next: SongFormDropIndicatorMetrics = { leftPx, topPx, heightPx };
      if (
        prev !== null &&
        prev.leftPx === next.leftPx &&
        prev.topPx === next.topPx &&
        prev.heightPx === next.heightPx
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const handleSongFormStripDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      const types: readonly string[] = event.dataTransfer.types;
      if (types.includes(MIME_LYRICS_PALETTE)) {
        event.dataTransfer.dropEffect = "copy";
      } else {
        event.dataTransfer.dropEffect = "move";
      }
      const cx: number = event.clientX;
      if (songFormDragOverRafRef.current !== null) {
        window.cancelAnimationFrame(songFormDragOverRafRef.current);
      }
      songFormDragOverRafRef.current = window.requestAnimationFrame((): void => {
        songFormDragOverRafRef.current = null;
        updateSongFormDropIndicator(cx);
      });
    },
    [updateSongFormDropIndicator]
  );

  const handleSongFormStripDragLeave = useCallback((event: DragEvent<HTMLDivElement>): void => {
    const nextTarget: Node | null = event.relatedTarget as Node | null;
    if (nextTarget !== null && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setSongFormDropIndicator(null);
  }, []);

  const applyPartSequenceDropAtIndex = useCallback(
    (insertIndex: number, event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      if (onPartSequenceChange === undefined || partSequence === undefined) {
        return;
      }
      const seq: number[] = normalizeLyricsPartSequence(lines.length, partSequence);
      const palettePayload: string = event.dataTransfer.getData(MIME_LYRICS_PALETTE);
      if (palettePayload.length > 0) {
        const defIdx: number = Number.parseInt(palettePayload, 10);
        if (!Number.isInteger(defIdx) || defIdx < 0 || defIdx >= lines.length) {
          return;
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length));
        const next: number[] = [...seq.slice(0, boundedInsert), defIdx, ...seq.slice(boundedInsert)];
        onPartSequenceChange(normalizeLyricsPartSequence(lines.length, next));
        formSlotDropCommittedRef.current = true;
        return;
      }
      const slotPayload: string = event.dataTransfer.getData(MIME_LYRICS_FORM_SLOT);
      if (slotPayload.length > 0) {
        const fromSlot: number = Number.parseInt(slotPayload, 10);
        if (!Number.isInteger(fromSlot) || fromSlot < 0 || fromSlot >= seq.length) {
          return;
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length));
        const reordered: number[] = moveFormSlotToInsertIndex(seq, fromSlot, boundedInsert);
        onPartSequenceChange(normalizeLyricsPartSequence(lines.length, reordered));
        formSlotDropCommittedRef.current = true;
        return;
      }
      const raw: string = event.dataTransfer.getData(FORM_SLOT_DRAG_TYPE);
      if (raw.startsWith(PALETTE_DRAG_PREFIX)) {
        const defIdx: number = Number.parseInt(raw.slice(PALETTE_DRAG_PREFIX.length), 10);
        if (!Number.isInteger(defIdx) || defIdx < 0 || defIdx >= lines.length) {
          return;
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length));
        const next: number[] = [...seq.slice(0, boundedInsert), defIdx, ...seq.slice(boundedInsert)];
        onPartSequenceChange(normalizeLyricsPartSequence(lines.length, next));
        formSlotDropCommittedRef.current = true;
        return;
      }
      if (raw.startsWith(FORM_SLOT_DRAG_PREFIX)) {
        const fromSlot: number = Number.parseInt(raw.slice(FORM_SLOT_DRAG_PREFIX.length), 10);
        if (!Number.isInteger(fromSlot) || fromSlot < 0 || fromSlot >= seq.length) {
          return;
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length));
        const reordered: number[] = moveFormSlotToInsertIndex(seq, fromSlot, boundedInsert);
        onPartSequenceChange(normalizeLyricsPartSequence(lines.length, reordered));
        formSlotDropCommittedRef.current = true;
      }
    },
    [lines.length, onPartSequenceChange, partSequence]
  );

  const handleSongFormStripDrop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      const track: HTMLDivElement | null = songFormTrackRef.current;
      const insertIndex: number = track === null ? 0 : computeSongFormInsertIndexFromTrack(track, event.clientX);
      applyPartSequenceDropAtIndex(insertIndex, event);
      setSongFormDropIndicator(null);
      if (songFormDragOverRafRef.current !== null) {
        window.cancelAnimationFrame(songFormDragOverRafRef.current);
        songFormDragOverRafRef.current = null;
      }
    },
    [applyPartSequenceDropAtIndex]
  );

  const handleFormDragStart = useCallback((slotIndex: number) => {
    return (event: DragEvent<HTMLDivElement>): void => {
      formSlotDropCommittedRef.current = false;
      setDraggingFormSlotIndex(slotIndex);
      const slotText: string = String(slotIndex);
      event.dataTransfer.setData(MIME_LYRICS_FORM_SLOT, slotText);
      event.dataTransfer.setData(FORM_SLOT_DRAG_TYPE, `${FORM_SLOT_DRAG_PREFIX}${slotText}`);
      event.dataTransfer.effectAllowed = "copyMove";
    };
  }, []);

  const handlePaletteDragStart = useCallback((definitionIndex: number) => {
    return (event: DragEvent<HTMLDivElement>): void => {
      setDraggingPaletteIndex(definitionIndex);
      const defText: string = String(definitionIndex);
      event.dataTransfer.setData(MIME_LYRICS_PALETTE, defText);
      event.dataTransfer.setData(FORM_SLOT_DRAG_TYPE, `${PALETTE_DRAG_PREFIX}${defText}`);
      event.dataTransfer.effectAllowed = "copyMove";
    };
  }, []);

  const handleFormDragEnd = useCallback(
    (slotIndex: number) => {
      return (event: DragEvent<HTMLDivElement>): void => {
        setDraggingFormSlotIndex(null);
        setSongFormDropIndicator(null);
        if (formSlotDropCommittedRef.current) {
          formSlotDropCommittedRef.current = false;
          return;
        }
        if (onPartSequenceChange === undefined || partSequence === undefined) {
          return;
        }
        const strip: HTMLDivElement | null = songFormStripRef.current;
        if (strip === null) {
          return;
        }
        const rect: DOMRect = strip.getBoundingClientRect();
        const x: number = event.clientX;
        const y: number = event.clientY;
        const inside: boolean = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (!inside) {
          const next: number[] = partSequence.filter((_: number, i: number): boolean => i !== slotIndex);
          onPartSequenceChange(normalizeLyricsPartSequence(lines.length, next));
        }
      };
    },
    [lines.length, onPartSequenceChange, partSequence]
  );

  const handlePaletteDragEnd = useCallback((): void => {
    setDraggingPaletteIndex(null);
    setSongFormDropIndicator(null);
  }, []);

  if (variant === "split") {
    const sequence: number[] =
      partSequence !== undefined
        ? normalizeLyricsPartSequence(lines.length, partSequence)
        : normalizeLyricsPartSequence(lines.length, undefined);

    return (
      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby={`${fieldIdPrefix}-parts-heading`}>
          <div>
            <h2
              id={`${fieldIdPrefix}-parts-heading`}
              className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-50"
            >
              {PARTS_COLUMN_TITLE}
            </h2>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{PARTS_COLUMN_HELPER}</p>
          </div>
          <ol className="flex flex-col gap-4">
            {lines.flatMap((line: LyricsSongLine, index: number): ReactElement[] => {
              if (shouldHideLeadBlankInSplitPartsColumn(line, index, lines.length)) {
                return [];
              }
              return [
                <li
                  key={`${fieldIdPrefix}-split-part-${String(index)}`}
                  className="rounded-xl border border-black/[0.08] bg-neutral-50/80 p-3 dark:border-white/[0.1] dark:bg-white/[0.04]"
                >
                  <PartFieldsBlock
                    line={line}
                    index={index}
                    fieldIdPrefix={fieldIdPrefix}
                    onPartNameChange={handlePartNameChange}
                    onLyricsChange={handleLyricsChange}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-[10px] font-medium text-red-700 outline-none transition hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-500/15 dark:focus-visible:ring-red-400/40"
                      onClick={() => {
                        handleRemoveLine(index);
                      }}
                      disabled={lines.length <= MIN_LYRIC_PART_COUNT}
                    >
                      {REMOVE_PART_LABEL}
                    </button>
                  </div>
                </li>,
              ];
            })}
          </ol>
          <button
            type="button"
            className="w-full rounded-lg border border-dashed border-black/[0.14] py-2 text-[11px] font-medium text-neutral-700 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.18] dark:text-neutral-200 dark:hover:bg-white/[0.06] dark:focus-visible:ring-[#0a84ff]"
            onClick={handleAddLine}
          >
            {ADD_PART_LABEL}
          </button>
        </section>
        <section
          className="flex min-w-0 flex-col gap-5 border-t border-black/[0.06] pt-6 dark:border-white/[0.08] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
          aria-labelledby={`${fieldIdPrefix}-palette-heading`}
        >
          <div>
            <h2
              id={`${fieldIdPrefix}-palette-heading`}
              className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-50"
            >
              {SONG_PART_LIST_TITLE}
            </h2>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{SONG_PART_LIST_HELPER}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
              {lines.map((line: LyricsSongLine, definitionIndex: number) => {
                const chipStyle: string = PART_CHIP_STYLES[definitionIndex % PART_CHIP_STYLES.length]!;
                const label: string = chipDisplayLabel(line, definitionIndex);
                return (
                  <div
                    key={`${fieldIdPrefix}-palette-${String(definitionIndex)}`}
                    role="button"
                    tabIndex={0}
                    title={label}
                    draggable
                    onDragStart={handlePaletteDragStart(definitionIndex)}
                    onDragEnd={handlePaletteDragEnd}
                    onKeyDown={handlePaletteKeyDown(definitionIndex)}
                    className={`${CHIP_PALETTE_DRAG_CLASS} ${chipStyle}${
                      draggingPaletteIndex === definitionIndex ? " opacity-45" : ""
                    }`}
                    onClick={() => {
                      handleAppendDefinitionToForm(definitionIndex);
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-50">{SONG_FORM_TITLE}</h2>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{SONG_FORM_HELPER}</p>
            <div
              ref={songFormStripRef}
              className="relative mt-3 flex min-h-[44px] items-center overflow-x-auto rounded-xl border border-dashed border-black/[0.12] bg-white/90 p-2 dark:border-white/[0.14] dark:bg-[#2c2c2e]/80"
            >
              {songFormDropIndicator !== null ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute z-20 w-[3px] rounded-full bg-[#0071e3] shadow-[0_0_0_1px_rgba(255,255,255,0.4)] dark:bg-[#0a84ff] dark:shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                  style={{
                    left: songFormDropIndicator.leftPx,
                    top: songFormDropIndicator.topPx,
                    height: songFormDropIndicator.heightPx,
                  }}
                />
              ) : null}
              <div
                ref={songFormTrackRef}
                className="flex min-h-10 w-full min-w-0 flex-wrap items-center content-center gap-2"
                onDragOver={handleSongFormStripDragOver}
                onDragLeave={handleSongFormStripDragLeave}
                onDrop={handleSongFormStripDrop}
              >
                {sequence.length === 0 ? (
                  <div className="flex min-h-12 w-full flex-1 items-center justify-center rounded-lg border border-dashed border-transparent px-2">
                    <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500">
                      {EMPTY_SONG_FORM_HINT}
                    </p>
                  </div>
                ) : (
                  sequence
                    .map((defIdx: number, slot: number) => ({ defIdx, slot }))
                    .filter((row: { defIdx: number; slot: number }): boolean => lines[row.defIdx] !== undefined)
                    .map((row: { defIdx: number; slot: number }): ReactElement => {
                      const { defIdx, slot } = row;
                      const lineForSlot: LyricsSongLine = lines[defIdx]!;
                      const chipStyle: string = PART_CHIP_STYLES[defIdx % PART_CHIP_STYLES.length]!;
                      const label: string = chipDisplayLabel(lineForSlot, defIdx);
                      const isDraggingSlot: boolean = draggingFormSlotIndex === slot;
                      return (
                        <div
                          key={`${fieldIdPrefix}-form-slot-${String(slot)}`}
                          className={`flex shrink-0 will-change-transform${isDraggingSlot ? " opacity-45" : ""}`}
                          data-lyrics-form-chip
                          data-slot={String(slot)}
                          title={label}
                        >
                          <div
                            draggable
                            onDragStart={handleFormDragStart(slot)}
                            onDragEnd={handleFormDragEnd(slot)}
                            className={`${CHIP_FORM_TILE_CLASS} ${chipStyle}`}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {lines.map((line: LyricsSongLine, index: number) => (
          <li
            key={`${fieldIdPrefix}-lyrics-part-${String(index)}`}
            className="rounded-xl border border-black/[0.08] bg-neutral-50/80 p-3 dark:border-white/[0.1] dark:bg-white/[0.04]"
          >
            <PartFieldsBlock
              line={line}
              index={index}
              fieldIdPrefix={fieldIdPrefix}
              onPartNameChange={handlePartNameChange}
              onLyricsChange={handleLyricsChange}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="rounded-md border border-black/[0.1] bg-white px-2 py-1 text-[10px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                onClick={() => {
                  handleMoveLineUp(index);
                }}
                disabled={index === 0}
              >
                {MOVE_UP_LABEL}
              </button>
              <button
                type="button"
                className="rounded-md border border-black/[0.1] bg-white px-2 py-1 text-[10px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                onClick={() => {
                  handleMoveLineDown(index);
                }}
                disabled={index === lines.length - 1}
              >
                {MOVE_DOWN_LABEL}
              </button>
              <button
                type="button"
                className="ml-auto rounded-md px-2 py-1 text-[10px] font-medium text-red-700 outline-none transition hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-500/15 dark:focus-visible:ring-red-400/40"
                onClick={() => {
                  handleRemoveLine(index);
                }}
                disabled={lines.length <= MIN_LYRIC_PART_COUNT}
              >
                {REMOVE_PART_LABEL}
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="w-full rounded-lg border border-dashed border-black/[0.14] py-2 text-[11px] font-medium text-neutral-700 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.18] dark:text-neutral-200 dark:hover:bg-white/[0.06] dark:focus-visible:ring-[#0a84ff]"
        onClick={handleAddLine}
      >
        {ADD_PART_LABEL}
      </button>
    </div>
  );
};
