import * as React from 'react'

import type { LyricsPart } from '@/domain/valueobjects/song'
import {
  LYRIC_BLANK_PART_NAME,
  LYRICS_FORM_BLANK_SEQUENCE_INDEX,
  normalizeLyricsPartSequence,
  resequenceAfterDefinitionRemoved,
} from '@/lib/lyrics-part-sequence'
import { cn } from '@/lib/utils'

import type { ChangeEvent, DragEvent, KeyboardEvent, ReactElement } from 'react'

const MIN_LYRIC_PART_COUNT: number = 1

const MIME_LYRICS_PALETTE: string = 'application/x-chat-ppt-lyrics-palette'
const MIME_LYRICS_PALETTE_BLANK: string = 'application/x-chat-ppt-lyrics-palette-blank'
const MIME_LYRICS_FORM_SLOT: string = 'application/x-chat-ppt-lyrics-form-slot'
const FORM_SLOT_DRAG_TYPE: string = 'text/plain'
const PALETTE_DRAG_PREFIX: string = 'lyricsPaletteDef='
const PALETTE_BLANK_DRAG_PREFIX: string = 'lyricsPaletteBlank='
const FORM_SLOT_DRAG_PREFIX: string = 'lyricsFormSlot='

const FLIP_MOVE_DURATION_MS: number = 220
const FLIP_MOVE_EASING: string = 'cubic-bezier(0.25, 0.1, 0.25, 1)'

const EMPTY_SONG_FORM_DROP_LINE_HEIGHT_PX: number = 32

const BLANK_FORM_CHIP_CLASS: string =
  'border-slate-300/90 bg-slate-100/95 text-slate-900 dark:border-slate-600/80 dark:bg-slate-900/50 dark:text-slate-100'

/** Outer shell: flex centering. Do not put `line-clamp-*` here — it forces `-webkit-box` and breaks flex alignment. */
const CHIP_SHELL_CLASS: string =
  'flex h-8 max-h-8 max-w-[4rem] min-w-0 shrink-0 items-center justify-center rounded-md border px-1 py-0 shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring'

const CHIP_LABEL_CLASS: string =
  'line-clamp-2 w-full min-w-0 text-center text-[9px] font-semibold leading-tight break-words [overflow-wrap:anywhere]'

const PART_CHIP_STYLES: readonly string[] = [
  'border-rose-200/80 bg-rose-100/90 text-rose-950 dark:border-rose-800/50 dark:bg-rose-950/35 dark:text-rose-100',
  'border-emerald-200/80 bg-emerald-100/90 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100',
  'border-violet-200/80 bg-violet-100/90 text-violet-950 dark:border-violet-800/50 dark:bg-violet-950/35 dark:text-violet-100',
  'border-amber-200/80 bg-amber-100/90 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100',
  'border-sky-200/80 bg-sky-100/90 text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-100',
  'border-fuchsia-200/80 bg-fuchsia-100/90 text-fuchsia-950 dark:border-fuchsia-800/50 dark:bg-fuchsia-950/35 dark:text-fuchsia-100',
] as const

function deriveDefaultPartLabel(ordinal: number): string {
  return `Part ${String(ordinal)}`
}

function chipDisplayLabel(line: LyricsPart, definitionIndex: number): string {
  const trimmed: string = line.part.trim()
  if (trimmed.length > 0) {
    return trimmed
  }
  return deriveDefaultPartLabel(definitionIndex + 1)
}

function shouldOmitOptionalLeadBlankRow(line: LyricsPart, definitionIndex: number, lineCount: number): boolean {
  if (lineCount <= 1) {
    return false
  }
  return definitionIndex === 0 && line.part.trim().toLowerCase() === LYRIC_BLANK_PART_NAME && line.lyrics.trim() === ''
}

function computeSongFormInsertIndexFromTrack(track: HTMLElement, clientX: number): number {
  const chips: HTMLElement[] = Array.from(track.querySelectorAll<HTMLElement>('[data-lyrics-form-chip]'))
  if (chips.length === 0) {
    return 0
  }
  for (let i = 0; i < chips.length; i++) {
    const r: DOMRect = chips[i]!.getBoundingClientRect()
    const midX: number = r.left + r.width / 2
    if (clientX < midX) {
      return i
    }
  }
  return chips.length
}

function moveFormSlotToInsertIndex(sequence: number[], fromSlot: number, insertBefore: number): number[] {
  const boundedInsertBefore: number = Math.max(0, Math.min(insertBefore, sequence.length))
  const next: number[] = [...sequence]
  const [moved] = next.splice(fromSlot, 1)
  let insertAt: number = boundedInsertBefore
  if (fromSlot < boundedInsertBefore) {
    insertAt -= 1
  }
  next.splice(insertAt, 0, moved!)
  return next
}

interface SongFormDropIndicatorMetrics {
  leftPx: number
  topPx: number
  heightPx: number
}

export interface LyricsSongSplitPartsEditorProps {
  readonly lines: readonly LyricsPart[]
  readonly onLinesChange: (next: LyricsPart[]) => void
  readonly partSequence: readonly number[]
  readonly onPartSequenceChange: (next: number[]) => void
  readonly fieldIdPrefix: string
  readonly labels: {
    readonly partsTitle: string
    readonly partsHint: string
    readonly partNameLabel: string
    readonly partLyricsLabel: string
    readonly removePartLabel: string
    readonly addPartLabel: string
    readonly poolTitle: string
    readonly poolHint: string
    readonly formTitle: string
    readonly formHint: string
    readonly formEmptyHint: string
    readonly blankTileLabel: string
  }
}

interface PartFieldsBlockProps {
  readonly line: LyricsPart
  readonly index: number
  readonly fieldIdPrefix: string
  readonly partNameLabel: string
  readonly partLyricsLabel: string
  readonly onPartNameChange: (index: number, value: string) => void
  readonly onLyricsChange: (index: number, value: string) => void
}

function PartFieldsBlock({
  line,
  index,
  fieldIdPrefix,
  partNameLabel,
  partLyricsLabel,
  onPartNameChange,
  onLyricsChange,
}: PartFieldsBlockProps): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label
          htmlFor={`${fieldIdPrefix}-part-name-${String(index)}`}
          className="text-muted-foreground text-[10px] font-medium"
        >
          {partNameLabel}
        </label>
        <input
          id={`${fieldIdPrefix}-part-name-${String(index)}`}
          type="text"
          className="border-input bg-background focus:border-ring mt-1 w-full rounded-md border px-2 py-1.5 text-sm outline-none"
          value={line.part}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => {
            onPartNameChange(index, event.target.value)
          }}
          autoComplete="off"
        />
      </div>
      <div>
        <label
          htmlFor={`${fieldIdPrefix}-part-body-${String(index)}`}
          className="text-muted-foreground text-[10px] font-medium"
        >
          {partLyricsLabel}
        </label>
        <textarea
          id={`${fieldIdPrefix}-part-body-${String(index)}`}
          className="border-input bg-background focus:border-ring mt-1 min-h-22 w-full resize-y rounded-md border px-2 py-1.5 text-sm outline-none"
          value={line.lyrics}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
            onLyricsChange(index, event.target.value)
          }}
          spellCheck
        />
      </div>
    </div>
  )
}

export function LyricsSongSplitPartsEditor({
  lines,
  onLinesChange,
  partSequence,
  onPartSequenceChange,
  fieldIdPrefix,
  labels,
}: LyricsSongSplitPartsEditorProps): ReactElement {
  const songFormStripRef = React.useRef<HTMLDivElement | null>(null)
  const songFormTrackRef = React.useRef<HTMLDivElement | null>(null)
  const songFormDragOverRafRef = React.useRef<number | null>(null)
  const formSlotDropCommittedRef = React.useRef<boolean>(false)

  const [songFormDropIndicator, setSongFormDropIndicator] = React.useState<SongFormDropIndicatorMetrics | null>(null)
  const [draggingFormSlotIndex, setDraggingFormSlotIndex] = React.useState<number | null>(null)
  const [draggingPaletteIndex, setDraggingPaletteIndex] = React.useState<number | null>(null)
  const [draggingBlankPalette, setDraggingBlankPalette] = React.useState<boolean>(false)
  const formChipFirstRectBySlotRef = React.useRef<Map<number, DOMRect> | null>(null)
  const formChipFlipGenerationRef = React.useRef<number>(0)

  React.useLayoutEffect((): void => {
    const seq: number[] = normalizeLyricsPartSequence(lines.length, partSequence)
    if (seq.length === 0) {
      formChipFirstRectBySlotRef.current = null
      return
    }
    const strip: HTMLDivElement | null = songFormStripRef.current
    if (strip === null) {
      return
    }
    const nodes: NodeListOf<HTMLElement> = strip.querySelectorAll<HTMLElement>('[data-lyrics-form-chip]')
    const lastBySlot: Map<number, DOMRect> = new Map()
    nodes.forEach((node: HTMLElement): void => {
      const slotText: string | undefined = node.dataset.slot
      if (slotText === undefined) {
        return
      }
      const slot: number = Number.parseInt(slotText, 10)
      if (!Number.isInteger(slot) || slot < 0) {
        return
      }
      lastBySlot.set(slot, node.getBoundingClientRect())
    })
    const firstBySlot: Map<number, DOMRect> | null = formChipFirstRectBySlotRef.current
    formChipFirstRectBySlotRef.current = lastBySlot
    if (firstBySlot === null || firstBySlot.size === 0) {
      return
    }
    formChipFlipGenerationRef.current += 1
    const generation: number = formChipFlipGenerationRef.current
    nodes.forEach((node: HTMLElement): void => {
      const slotText: string | undefined = node.dataset.slot
      if (slotText === undefined) {
        return
      }
      const slot: number = Number.parseInt(slotText, 10)
      if (!Number.isInteger(slot)) {
        return
      }
      const firstRect: DOMRect | undefined = firstBySlot.get(slot)
      const lastRect: DOMRect | undefined = lastBySlot.get(slot)
      if (firstRect === undefined || lastRect === undefined) {
        return
      }
      const dx: number = firstRect.left - lastRect.left
      const dy: number = firstRect.top - lastRect.top
      if (dx === 0 && dy === 0) {
        return
      }
      node.style.transform = `translate(${String(dx)}px, ${String(dy)}px)`
      node.style.transition = 'transform 0s'
      window.requestAnimationFrame((): void => {
        if (formChipFlipGenerationRef.current !== generation) {
          return
        }
        window.requestAnimationFrame((): void => {
          if (formChipFlipGenerationRef.current !== generation) {
            return
          }
          node.style.transition = `transform ${String(FLIP_MOVE_DURATION_MS)}ms ${FLIP_MOVE_EASING}`
          node.style.transform = ''
        })
      })
    })
  }, [lines.length, partSequence])

  React.useEffect((): (() => void) => {
    const clearSongFormDragUi = (): void => {
      setSongFormDropIndicator(null)
      setDraggingFormSlotIndex(null)
      setDraggingPaletteIndex(null)
      setDraggingBlankPalette(false)
      if (songFormDragOverRafRef.current !== null) {
        window.cancelAnimationFrame(songFormDragOverRafRef.current)
        songFormDragOverRafRef.current = null
      }
    }
    document.addEventListener('dragend', clearSongFormDragUi)
    return (): void => {
      document.removeEventListener('dragend', clearSongFormDragUi)
    }
  }, [])

  const handlePartNameChange = React.useCallback(
    (index: number, value: string): void => {
      onLinesChange(
        lines.map((line: LyricsPart, i: number): LyricsPart => (i === index ? { ...line, part: value } : line))
      )
    },
    [lines, onLinesChange]
  )

  const handleLyricsChange = React.useCallback(
    (index: number, value: string): void => {
      onLinesChange(
        lines.map((line: LyricsPart, i: number): LyricsPart => (i === index ? { ...line, lyrics: value } : line))
      )
    },
    [lines, onLinesChange]
  )

  const handleRemoveLine = React.useCallback(
    (index: number): void => {
      if (lines.length <= MIN_LYRIC_PART_COUNT) {
        return
      }
      const nextLines: LyricsPart[] = lines.filter((_: LyricsPart, i: number): boolean => i !== index)
      const nextSeq: number[] = resequenceAfterDefinitionRemoved(partSequence, index)
      onLinesChange(nextLines)
      onPartSequenceChange(normalizeLyricsPartSequence(nextLines.length, nextSeq))
    },
    [lines, onLinesChange, onPartSequenceChange, partSequence]
  )

  const handleAddLine = React.useCallback((): void => {
    const nextOrdinal: number = lines.length + 1
    const newLines: LyricsPart[] = [...lines, { part: deriveDefaultPartLabel(nextOrdinal), lyrics: '' }]
    onLinesChange(newLines)
    onPartSequenceChange(normalizeLyricsPartSequence(newLines.length, [...partSequence, newLines.length - 1]))
  }, [lines, onLinesChange, onPartSequenceChange, partSequence])

  const handleAppendDefinitionToForm = React.useCallback(
    (definitionIndex: number): void => {
      if (definitionIndex < 0 || definitionIndex >= lines.length) {
        return
      }
      onPartSequenceChange(normalizeLyricsPartSequence(lines.length, [...partSequence, definitionIndex]))
    },
    [lines.length, onPartSequenceChange, partSequence]
  )

  const handleAppendBlankToForm = React.useCallback((): void => {
    onPartSequenceChange(normalizeLyricsPartSequence(lines.length, [...partSequence, LYRICS_FORM_BLANK_SEQUENCE_INDEX]))
  }, [lines.length, onPartSequenceChange, partSequence])

  const handlePaletteKeyDown = React.useCallback(
    (definitionIndex: number) => {
      return (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return
        }
        event.preventDefault()
        handleAppendDefinitionToForm(definitionIndex)
      }
    },
    [handleAppendDefinitionToForm]
  )

  const handleBlankPaletteKeyDown = React.useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }
      event.preventDefault()
      handleAppendBlankToForm()
    },
    [handleAppendBlankToForm]
  )

  const updateSongFormDropIndicator = React.useCallback((clientX: number): void => {
    const strip: HTMLDivElement | null = songFormStripRef.current
    const track: HTMLDivElement | null = songFormTrackRef.current
    if (strip === null || track === null) {
      return
    }
    const stripRect: DOMRect = strip.getBoundingClientRect()
    const insertIndex: number = computeSongFormInsertIndexFromTrack(track, clientX)
    const chips: HTMLElement[] = Array.from(track.querySelectorAll<HTMLElement>('[data-lyrics-form-chip]'))
    let topPx: number
    let heightPx: number
    let leftPx: number = 10
    if (chips.length === 0) {
      heightPx = EMPTY_SONG_FORM_DROP_LINE_HEIGHT_PX
      topPx = (stripRect.height - heightPx) / 2
      leftPx = stripRect.width / 2 - 1.5
    } else if (insertIndex === 0) {
      const r0: DOMRect = chips[0]!.getBoundingClientRect()
      topPx = r0.top - stripRect.top
      heightPx = r0.height
      leftPx = r0.left - stripRect.left - 2
    } else if (insertIndex >= chips.length) {
      const rLast: DOMRect = chips[chips.length - 1]!.getBoundingClientRect()
      topPx = rLast.top - stripRect.top
      heightPx = rLast.height
      leftPx = rLast.right - stripRect.left + 2
    } else {
      const rPrev: DOMRect = chips[insertIndex - 1]!.getBoundingClientRect()
      const rNext: DOMRect = chips[insertIndex]!.getBoundingClientRect()
      const topEdge: number = Math.min(rPrev.top, rNext.top)
      const bottomEdge: number = Math.max(rPrev.bottom, rNext.bottom)
      topPx = topEdge - stripRect.top
      heightPx = bottomEdge - topEdge
      leftPx = (rPrev.right + rNext.left) / 2 - stripRect.left
    }
    setSongFormDropIndicator((prev: SongFormDropIndicatorMetrics | null) => {
      const next: SongFormDropIndicatorMetrics = { leftPx, topPx, heightPx }
      if (
        prev !== null &&
        prev.leftPx === next.leftPx &&
        prev.topPx === next.topPx &&
        prev.heightPx === next.heightPx
      ) {
        return prev
      }
      return next
    })
  }, [])

  const handleSongFormStripDragOver = React.useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault()
      const types: readonly string[] = event.dataTransfer.types
      if (types.includes(MIME_LYRICS_PALETTE) || types.includes(MIME_LYRICS_PALETTE_BLANK)) {
        event.dataTransfer.dropEffect = 'copy'
      } else {
        event.dataTransfer.dropEffect = 'move'
      }
      const cx: number = event.clientX
      if (songFormDragOverRafRef.current !== null) {
        window.cancelAnimationFrame(songFormDragOverRafRef.current)
      }
      songFormDragOverRafRef.current = window.requestAnimationFrame((): void => {
        songFormDragOverRafRef.current = null
        updateSongFormDropIndicator(cx)
      })
    },
    [updateSongFormDropIndicator]
  )

  const handleSongFormStripDragLeave = React.useCallback((event: DragEvent<HTMLDivElement>): void => {
    const nextTarget: Node | null = event.relatedTarget as Node | null
    if (nextTarget !== null && event.currentTarget.contains(nextTarget)) {
      return
    }
    setSongFormDropIndicator(null)
  }, [])

  const applyPartSequenceDropAtIndex = React.useCallback(
    (insertIndex: number, event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault()
      event.stopPropagation()
      const lineCount: number = lines.length
      const seq: number[] = normalizeLyricsPartSequence(lineCount, partSequence)
      const paletteBlankPayload: string = event.dataTransfer.getData(MIME_LYRICS_PALETTE_BLANK)
      if (paletteBlankPayload.length > 0) {
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const next: number[] = [
          ...seq.slice(0, boundedInsert),
          LYRICS_FORM_BLANK_SEQUENCE_INDEX,
          ...seq.slice(boundedInsert),
        ]
        onPartSequenceChange(normalizeLyricsPartSequence(lineCount, next))
        formSlotDropCommittedRef.current = true
        return
      }
      const palettePayload: string = event.dataTransfer.getData(MIME_LYRICS_PALETTE)
      if (palettePayload.length > 0) {
        const defIdx: number = Number.parseInt(palettePayload, 10)
        if (!Number.isInteger(defIdx) || defIdx < 0 || defIdx >= lineCount) {
          return
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const next: number[] = [...seq.slice(0, boundedInsert), defIdx, ...seq.slice(boundedInsert)]
        onPartSequenceChange(normalizeLyricsPartSequence(lineCount, next))
        formSlotDropCommittedRef.current = true
        return
      }
      const slotPayload: string = event.dataTransfer.getData(MIME_LYRICS_FORM_SLOT)
      if (slotPayload.length > 0) {
        const fromSlot: number = Number.parseInt(slotPayload, 10)
        if (!Number.isInteger(fromSlot) || fromSlot < 0 || fromSlot >= seq.length) {
          return
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const reordered: number[] = moveFormSlotToInsertIndex(seq, fromSlot, boundedInsert)
        onPartSequenceChange(normalizeLyricsPartSequence(lineCount, reordered))
        formSlotDropCommittedRef.current = true
        return
      }
      const raw: string = event.dataTransfer.getData(FORM_SLOT_DRAG_TYPE)
      if (raw.startsWith(PALETTE_BLANK_DRAG_PREFIX)) {
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const next: number[] = [
          ...seq.slice(0, boundedInsert),
          LYRICS_FORM_BLANK_SEQUENCE_INDEX,
          ...seq.slice(boundedInsert),
        ]
        onPartSequenceChange(normalizeLyricsPartSequence(lineCount, next))
        formSlotDropCommittedRef.current = true
        return
      }
      if (raw.startsWith(PALETTE_DRAG_PREFIX)) {
        const defIdx: number = Number.parseInt(raw.slice(PALETTE_DRAG_PREFIX.length), 10)
        if (!Number.isInteger(defIdx) || defIdx < 0 || defIdx >= lineCount) {
          return
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const next: number[] = [...seq.slice(0, boundedInsert), defIdx, ...seq.slice(boundedInsert)]
        onPartSequenceChange(normalizeLyricsPartSequence(lineCount, next))
        formSlotDropCommittedRef.current = true
        return
      }
      if (raw.startsWith(FORM_SLOT_DRAG_PREFIX)) {
        const fromSlot: number = Number.parseInt(raw.slice(FORM_SLOT_DRAG_PREFIX.length), 10)
        if (!Number.isInteger(fromSlot) || fromSlot < 0 || fromSlot >= seq.length) {
          return
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const reordered: number[] = moveFormSlotToInsertIndex(seq, fromSlot, boundedInsert)
        onPartSequenceChange(normalizeLyricsPartSequence(lineCount, reordered))
        formSlotDropCommittedRef.current = true
      }
    },
    [lines.length, onPartSequenceChange, partSequence]
  )

  const handleSongFormStripDrop = React.useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      const track: HTMLDivElement | null = songFormTrackRef.current
      const insertIndex: number = track === null ? 0 : computeSongFormInsertIndexFromTrack(track, event.clientX)
      applyPartSequenceDropAtIndex(insertIndex, event)
      setSongFormDropIndicator(null)
      if (songFormDragOverRafRef.current !== null) {
        window.cancelAnimationFrame(songFormDragOverRafRef.current)
        songFormDragOverRafRef.current = null
      }
    },
    [applyPartSequenceDropAtIndex]
  )

  const handleFormDragStart = React.useCallback((slotIndex: number) => {
    return (event: DragEvent<HTMLDivElement>): void => {
      formSlotDropCommittedRef.current = false
      setDraggingFormSlotIndex(slotIndex)
      const slotText: string = String(slotIndex)
      event.dataTransfer.setData(MIME_LYRICS_FORM_SLOT, slotText)
      event.dataTransfer.setData(FORM_SLOT_DRAG_TYPE, `${FORM_SLOT_DRAG_PREFIX}${slotText}`)
      event.dataTransfer.effectAllowed = 'copyMove'
    }
  }, [])

  const handlePaletteDragStart = React.useCallback((definitionIndex: number) => {
    return (event: DragEvent<HTMLDivElement>): void => {
      setDraggingPaletteIndex(definitionIndex)
      const defText: string = String(definitionIndex)
      event.dataTransfer.setData(MIME_LYRICS_PALETTE, defText)
      event.dataTransfer.setData(FORM_SLOT_DRAG_TYPE, `${PALETTE_DRAG_PREFIX}${defText}`)
      event.dataTransfer.effectAllowed = 'copyMove'
    }
  }, [])

  const handleBlankPaletteDragStart = React.useCallback((event: DragEvent<HTMLDivElement>): void => {
    setDraggingBlankPalette(true)
    event.dataTransfer.setData(MIME_LYRICS_PALETTE_BLANK, '1')
    event.dataTransfer.setData(FORM_SLOT_DRAG_TYPE, `${PALETTE_BLANK_DRAG_PREFIX}1`)
    event.dataTransfer.effectAllowed = 'copyMove'
  }, [])

  const handleFormDragEnd = React.useCallback(
    (slotIndex: number) => {
      return (event: DragEvent<HTMLDivElement>): void => {
        setDraggingFormSlotIndex(null)
        setSongFormDropIndicator(null)
        if (formSlotDropCommittedRef.current) {
          formSlotDropCommittedRef.current = false
          return
        }
        const strip: HTMLDivElement | null = songFormStripRef.current
        if (strip === null) {
          return
        }
        const rect: DOMRect = strip.getBoundingClientRect()
        const x: number = event.clientX
        const y: number = event.clientY
        const inside: boolean = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
        if (!inside) {
          const seq: number[] = normalizeLyricsPartSequence(lines.length, partSequence)
          const next: number[] = seq.filter((_: number, i: number): boolean => i !== slotIndex)
          onPartSequenceChange(normalizeLyricsPartSequence(lines.length, next))
        }
      }
    },
    [lines.length, onPartSequenceChange, partSequence]
  )

  const handlePaletteDragEnd = React.useCallback((): void => {
    setDraggingPaletteIndex(null)
    setDraggingBlankPalette(false)
    setSongFormDropIndicator(null)
  }, [])

  const sequence: number[] = normalizeLyricsPartSequence(lines.length, partSequence)

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
      <section className="flex min-w-0 flex-col gap-3" aria-labelledby={`${fieldIdPrefix}-parts-heading`}>
        <div>
          <h2
            id={`${fieldIdPrefix}-parts-heading`}
            className="text-foreground text-xs font-semibold tracking-wide uppercase"
          >
            {labels.partsTitle}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">{labels.partsHint}</p>
        </div>
        <ol className="flex flex-col gap-3">
          {lines.flatMap((line: LyricsPart, index: number): ReactElement[] => {
            if (shouldOmitOptionalLeadBlankRow(line, index, lines.length)) {
              return []
            }
            return [
              <li
                key={`${fieldIdPrefix}-split-part-${String(index)}`}
                className="border-border bg-muted/20 rounded-lg border p-3"
              >
                <PartFieldsBlock
                  line={line}
                  index={index}
                  fieldIdPrefix={fieldIdPrefix}
                  partNameLabel={labels.partNameLabel}
                  partLyricsLabel={labels.partLyricsLabel}
                  onPartNameChange={handlePartNameChange}
                  onLyricsChange={handleLyricsChange}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="text-destructive hover:text-destructive/90 focus-visible:ring-ring rounded-md px-2 py-1 text-[10px] font-medium outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      handleRemoveLine(index)
                    }}
                    disabled={lines.length <= MIN_LYRIC_PART_COUNT}
                  >
                    {labels.removePartLabel}
                  </button>
                </div>
              </li>,
            ]
          })}
        </ol>
        <button
          type="button"
          className="border-border text-foreground hover:bg-muted/30 focus-visible:ring-ring w-full rounded-lg border border-dashed py-2 text-xs font-medium outline-none focus-visible:ring-2"
          onClick={handleAddLine}
        >
          {labels.addPartLabel}
        </button>
      </section>
      <section
        className="border-border flex min-w-0 flex-col gap-5 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
        aria-labelledby={`${fieldIdPrefix}-palette-heading`}
      >
        <div>
          <h2
            id={`${fieldIdPrefix}-palette-heading`}
            className="text-foreground text-xs font-semibold tracking-wide uppercase"
          >
            {labels.poolTitle}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">{labels.poolHint}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {lines.map((line: LyricsPart, definitionIndex: number) => {
              const chipStyle: string = PART_CHIP_STYLES[definitionIndex % PART_CHIP_STYLES.length]!
              const label: string = chipDisplayLabel(line, definitionIndex)
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
                  className={cn(
                    CHIP_SHELL_CLASS,
                    'cursor-grab active:cursor-grabbing',
                    chipStyle,
                    draggingPaletteIndex === definitionIndex && 'opacity-45'
                  )}
                  onClick={() => {
                    handleAppendDefinitionToForm(definitionIndex)
                  }}
                >
                  <span className={CHIP_LABEL_CLASS}>{label}</span>
                </div>
              )
            })}
            <div
              key={`${fieldIdPrefix}-palette-blank`}
              role="button"
              tabIndex={0}
              title={labels.blankTileLabel}
              draggable
              onDragStart={handleBlankPaletteDragStart}
              onDragEnd={handlePaletteDragEnd}
              onKeyDown={handleBlankPaletteKeyDown}
              className={cn(
                CHIP_SHELL_CLASS,
                'cursor-grab active:cursor-grabbing',
                BLANK_FORM_CHIP_CLASS,
                draggingBlankPalette && 'opacity-45'
              )}
              onClick={handleAppendBlankToForm}
            >
              <span className={CHIP_LABEL_CLASS}>{labels.blankTileLabel}</span>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">{labels.formTitle}</h2>
          <p className="text-muted-foreground mt-1 text-xs">{labels.formHint}</p>
          <div
            ref={songFormStripRef}
            className="border-border bg-muted/15 relative mt-3 flex min-h-[52px] items-center overflow-x-auto rounded-xl border border-dashed p-2"
          >
            {songFormDropIndicator !== null ? (
              <div
                aria-hidden
                className="bg-primary pointer-events-none absolute z-20 w-[3px] rounded-full shadow-sm"
                style={{
                  left: songFormDropIndicator.leftPx,
                  top: songFormDropIndicator.topPx,
                  height: songFormDropIndicator.heightPx,
                }}
              />
            ) : null}
            <div
              ref={songFormTrackRef}
              className="flex min-h-10 w-full min-w-0 flex-1 flex-wrap content-center items-center gap-2"
              onDragOver={handleSongFormStripDragOver}
              onDragLeave={handleSongFormStripDragLeave}
              onDrop={handleSongFormStripDrop}
            >
              {sequence.length === 0 ? (
                <div className="text-muted-foreground flex min-h-10 w-full flex-1 items-center justify-center px-2 text-center text-[10px]">
                  {labels.formEmptyHint}
                </div>
              ) : (
                sequence
                  .map((defIdx: number, slot: number) => ({ defIdx, slot }))
                  .filter(
                    (row: { defIdx: number; slot: number }): boolean =>
                      row.defIdx === LYRICS_FORM_BLANK_SEQUENCE_INDEX || lines[row.defIdx] !== undefined
                  )
                  .map((row: { defIdx: number; slot: number }): ReactElement => {
                    const { defIdx, slot } = row
                    const isDraggingSlot: boolean = draggingFormSlotIndex === slot
                    if (defIdx === LYRICS_FORM_BLANK_SEQUENCE_INDEX) {
                      return (
                        <div
                          key={`${fieldIdPrefix}-form-slot-${String(slot)}`}
                          className={cn('flex shrink-0 will-change-transform', isDraggingSlot && 'opacity-45')}
                          data-lyrics-form-chip
                          data-slot={String(slot)}
                          title={labels.blankTileLabel}
                        >
                          <div
                            draggable
                            onDragStart={handleFormDragStart(slot)}
                            onDragEnd={handleFormDragEnd(slot)}
                            className={cn(
                              CHIP_SHELL_CLASS,
                              'cursor-grab active:cursor-grabbing',
                              BLANK_FORM_CHIP_CLASS
                            )}
                          >
                            <span className={CHIP_LABEL_CLASS}>{labels.blankTileLabel}</span>
                          </div>
                        </div>
                      )
                    }
                    const lineForSlot: LyricsPart = lines[defIdx]!
                    const chipStyle: string = PART_CHIP_STYLES[defIdx % PART_CHIP_STYLES.length]!
                    const label: string = chipDisplayLabel(lineForSlot, defIdx)
                    return (
                      <div
                        key={`${fieldIdPrefix}-form-slot-${String(slot)}`}
                        className={cn('flex shrink-0 will-change-transform', isDraggingSlot && 'opacity-45')}
                        data-lyrics-form-chip
                        data-slot={String(slot)}
                        title={label}
                      >
                        <div
                          draggable
                          onDragStart={handleFormDragStart(slot)}
                          onDragEnd={handleFormDragEnd(slot)}
                          className={cn(CHIP_SHELL_CLASS, 'cursor-grab active:cursor-grabbing', chipStyle)}
                        >
                          <span className={CHIP_LABEL_CLASS}>{label}</span>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
