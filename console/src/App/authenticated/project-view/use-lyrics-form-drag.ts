import * as React from 'react'

import { moveFormSlotToInsertIndex } from '@/lib/lyrics-form'
import { LYRICS_FORM_BLANK_SEQUENCE_INDEX, normalizeLyricsPartSequence } from '@/lib/lyrics-part-sequence'

import type { DragEvent } from 'react'

const MIME_LYRICS_PALETTE: string = 'application/x-chat-ppt-lyrics-palette'
const MIME_LYRICS_PALETTE_BLANK: string = 'application/x-chat-ppt-lyrics-palette-blank'
const MIME_LYRICS_FORM_SLOT: string = 'application/x-chat-ppt-lyrics-form-slot'
const FORM_SLOT_DRAG_TYPE: string = 'text/plain'
const PALETTE_DRAG_PREFIX: string = 'lyricsPaletteDef='
const PALETTE_BLANK_DRAG_PREFIX: string = 'lyricsPaletteBlank='
const FORM_SLOT_DRAG_PREFIX: string = 'lyricsFormSlot='

const EMPTY_SONG_FORM_DROP_LINE_HEIGHT_PX: number = 32

export interface SongFormDropIndicatorMetrics {
  leftPx: number
  topPx: number
  heightPx: number
}

function computeInsertIndexFromTrack(track: HTMLElement, clientX: number): number {
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

export interface UseLyricsFormDragOptions {
  readonly linesLength: number
  readonly partSequence: readonly number[]
  readonly onPartSequenceChange: (next: number[]) => void
  readonly songFormStripRef: React.RefObject<HTMLDivElement | null>
  readonly songFormTrackRef: React.RefObject<HTMLDivElement | null>
}

export interface UseLyricsFormDragResult {
  readonly songFormDropIndicator: SongFormDropIndicatorMetrics | null
  readonly draggingFormSlotIndex: number | null
  readonly draggingPaletteIndex: number | null
  readonly draggingBlankPalette: boolean
  readonly formSlotDropCommittedRef: React.RefObject<boolean>
  readonly handleFormDragStart: (slotIndex: number) => (event: DragEvent<HTMLDivElement>) => void
  readonly handleFormDragEnd: (slotIndex: number) => (event: DragEvent<HTMLDivElement>) => void
  readonly handlePaletteDragStart: (definitionIndex: number) => (event: DragEvent<HTMLDivElement>) => void
  readonly handlePaletteDragEnd: () => void
  readonly handleBlankPaletteDragStart: (event: DragEvent<HTMLDivElement>) => void
  readonly handleSongFormStripDragOver: (event: DragEvent<HTMLDivElement>) => void
  readonly handleSongFormStripDragLeave: (event: DragEvent<HTMLDivElement>) => void
  readonly handleSongFormStripDrop: (event: DragEvent<HTMLDivElement>) => void
}

export function useLyricsFormDrag({
  linesLength,
  partSequence,
  onPartSequenceChange,
  songFormStripRef,
  songFormTrackRef,
}: UseLyricsFormDragOptions): UseLyricsFormDragResult {
  const songFormDragOverRafRef = React.useRef<number | null>(null)
  const formSlotDropCommittedRef = React.useRef<boolean>(false)

  const [songFormDropIndicator, setSongFormDropIndicator] = React.useState<SongFormDropIndicatorMetrics | null>(null)
  const [draggingFormSlotIndex, setDraggingFormSlotIndex] = React.useState<number | null>(null)
  const [draggingPaletteIndex, setDraggingPaletteIndex] = React.useState<number | null>(null)
  const [draggingBlankPalette, setDraggingBlankPalette] = React.useState<boolean>(false)

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

  const updateSongFormDropIndicator = React.useCallback(
    (clientX: number): void => {
      const strip: HTMLDivElement | null = songFormStripRef.current
      const track: HTMLDivElement | null = songFormTrackRef.current
      if (strip === null || track === null) {
        return
      }
      const stripRect: DOMRect = strip.getBoundingClientRect()
      const insertIndex: number = computeInsertIndexFromTrack(track, clientX)
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
    },
    [songFormStripRef, songFormTrackRef]
  )

  const applyPartSequenceDropAtIndex = React.useCallback(
    (insertIndex: number, event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault()
      event.stopPropagation()
      const seq: number[] = normalizeLyricsPartSequence(linesLength, partSequence)
      const paletteBlankPayload: string = event.dataTransfer.getData(MIME_LYRICS_PALETTE_BLANK)
      if (paletteBlankPayload.length > 0) {
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const next: number[] = [
          ...seq.slice(0, boundedInsert),
          LYRICS_FORM_BLANK_SEQUENCE_INDEX,
          ...seq.slice(boundedInsert),
        ]
        onPartSequenceChange(normalizeLyricsPartSequence(linesLength, next))
        formSlotDropCommittedRef.current = true
        return
      }
      const palettePayload: string = event.dataTransfer.getData(MIME_LYRICS_PALETTE)
      if (palettePayload.length > 0) {
        const defIdx: number = Number.parseInt(palettePayload, 10)
        if (!Number.isInteger(defIdx) || defIdx < 0 || defIdx >= linesLength) {
          return
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const next: number[] = [...seq.slice(0, boundedInsert), defIdx, ...seq.slice(boundedInsert)]
        onPartSequenceChange(normalizeLyricsPartSequence(linesLength, next))
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
        onPartSequenceChange(normalizeLyricsPartSequence(linesLength, reordered))
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
        onPartSequenceChange(normalizeLyricsPartSequence(linesLength, next))
        formSlotDropCommittedRef.current = true
        return
      }
      if (raw.startsWith(PALETTE_DRAG_PREFIX)) {
        const defIdx: number = Number.parseInt(raw.slice(PALETTE_DRAG_PREFIX.length), 10)
        if (!Number.isInteger(defIdx) || defIdx < 0 || defIdx >= linesLength) {
          return
        }
        const boundedInsert: number = Math.max(0, Math.min(insertIndex, seq.length))
        const next: number[] = [...seq.slice(0, boundedInsert), defIdx, ...seq.slice(boundedInsert)]
        onPartSequenceChange(normalizeLyricsPartSequence(linesLength, next))
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
        onPartSequenceChange(normalizeLyricsPartSequence(linesLength, reordered))
        formSlotDropCommittedRef.current = true
      }
    },
    [linesLength, onPartSequenceChange, partSequence]
  )

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

  const handleSongFormStripDrop = React.useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      const track: HTMLDivElement | null = songFormTrackRef.current
      const insertIndex: number = track === null ? 0 : computeInsertIndexFromTrack(track, event.clientX)
      applyPartSequenceDropAtIndex(insertIndex, event)
      setSongFormDropIndicator(null)
      if (songFormDragOverRafRef.current !== null) {
        window.cancelAnimationFrame(songFormDragOverRafRef.current)
        songFormDragOverRafRef.current = null
      }
    },
    [applyPartSequenceDropAtIndex, songFormTrackRef]
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
          const seq: number[] = normalizeLyricsPartSequence(linesLength, partSequence)
          const next: number[] = seq.filter((_: number, i: number): boolean => i !== slotIndex)
          onPartSequenceChange(normalizeLyricsPartSequence(linesLength, next))
        }
      }
    },
    [linesLength, onPartSequenceChange, partSequence, songFormStripRef]
  )

  const handlePaletteDragEnd = React.useCallback((): void => {
    setDraggingPaletteIndex(null)
    setDraggingBlankPalette(false)
    setSongFormDropIndicator(null)
  }, [])

  return {
    songFormDropIndicator,
    draggingFormSlotIndex,
    draggingPaletteIndex,
    draggingBlankPalette,
    formSlotDropCommittedRef,
    handleFormDragStart,
    handleFormDragEnd,
    handlePaletteDragStart,
    handlePaletteDragEnd,
    handleBlankPaletteDragStart,
    handleSongFormStripDragOver,
    handleSongFormStripDragLeave,
    handleSongFormStripDrop,
  }
}
