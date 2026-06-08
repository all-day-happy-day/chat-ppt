import type { LyricsPart } from '@/domain/valueobjects/song'
import { LYRIC_BLANK_PART_NAME } from '@/lib/lyrics-part-sequence'

export function deriveDefaultPartLabel(ordinal: number): string {
  return `Part ${String(ordinal)}`
}

export function chipDisplayLabel(line: LyricsPart, definitionIndex: number): string {
  const trimmed: string = line.part.trim()
  if (trimmed.length > 0) {
    return trimmed
  }
  return deriveDefaultPartLabel(definitionIndex + 1)
}

export function shouldOmitOptionalLeadBlankRow(line: LyricsPart, definitionIndex: number, lineCount: number): boolean {
  if (lineCount <= 1) {
    return false
  }
  return definitionIndex === 0 && line.part.trim().toLowerCase() === LYRIC_BLANK_PART_NAME && line.lyrics.trim() === ''
}

export function moveFormSlotToInsertIndex(sequence: number[], fromSlot: number, insertBefore: number): number[] {
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
