import * as React from 'react'

import { useLyricsFormDrag } from '@/App/authenticated/project-view/use-lyrics-form-drag'
import { VariableSlashTextarea, VariableSlashTextInput } from '@/App/authenticated/project-view/VariableSlashField'
import type { LyricsPart } from '@/domain/valueobjects/song'
import { chipDisplayLabel, deriveDefaultPartLabel, shouldOmitOptionalLeadBlankRow } from '@/lib/lyrics-form'
import {
  LYRICS_FORM_BLANK_SEQUENCE_INDEX,
  normalizeLyricsPartSequence,
  resequenceAfterDefinitionRemoved,
} from '@/lib/lyrics-part-sequence'
import { cn } from '@/lib/utils'

import type { KeyboardEvent, ReactElement } from 'react'

const MIN_LYRIC_PART_COUNT: number = 1

const FLIP_MOVE_DURATION_MS: number = 220
const FLIP_MOVE_EASING: string = 'cubic-bezier(0.25, 0.1, 0.25, 1)'

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
        <VariableSlashTextInput
          id={`${fieldIdPrefix}-part-name-${String(index)}`}
          type="text"
          className="border-input bg-background focus:border-ring mt-1 w-full rounded-md border px-2 py-1.5 text-sm outline-none"
          value={line.part}
          onValueChange={(next: string): void => {
            onPartNameChange(index, next)
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
        <VariableSlashTextarea
          id={`${fieldIdPrefix}-part-body-${String(index)}`}
          className="border-input bg-background focus:border-ring mt-1 min-h-22 w-full resize-y rounded-md border px-2 py-1.5 text-sm outline-none"
          value={line.lyrics}
          onValueChange={(next: string): void => {
            onLyricsChange(index, next)
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
  const formChipFirstRectBySlotRef = React.useRef<Map<number, DOMRect> | null>(null)

  const {
    songFormDropIndicator,
    draggingFormSlotIndex,
    draggingPaletteIndex,
    draggingBlankPalette,
    handleFormDragStart,
    handleFormDragEnd,
    handlePaletteDragStart,
    handlePaletteDragEnd,
    handleBlankPaletteDragStart,
    handleSongFormStripDragOver,
    handleSongFormStripDragLeave,
    handleSongFormStripDrop,
  } = useLyricsFormDrag({
    linesLength: lines.length,
    partSequence,
    onPartSequenceChange,
    songFormStripRef,
    songFormTrackRef,
  })
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
