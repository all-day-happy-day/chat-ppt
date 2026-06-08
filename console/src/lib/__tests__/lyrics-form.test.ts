import type { LyricsPart } from '@/domain/valueobjects/song'
import {
  chipDisplayLabel,
  deriveDefaultPartLabel,
  moveFormSlotToInsertIndex,
  shouldOmitOptionalLeadBlankRow,
} from '@/lib/lyrics-form'

describe('deriveDefaultPartLabel', () => {
  it('returns "Part 1" for ordinal 1', () => {
    expect(deriveDefaultPartLabel(1)).toBe('Part 1')
  })

  it('returns "Part 5" for ordinal 5', () => {
    expect(deriveDefaultPartLabel(5)).toBe('Part 5')
  })

  it('returns "Part 0" for ordinal 0', () => {
    expect(deriveDefaultPartLabel(0)).toBe('Part 0')
  })
})

describe('chipDisplayLabel', () => {
  it('returns trimmed part name when non-empty', () => {
    const line: LyricsPart = { part: '  Verse  ', lyrics: '' }
    expect(chipDisplayLabel(line, 0)).toBe('Verse')
  })

  it('falls back to "Part <ordinal+1>" when part is empty', () => {
    const line: LyricsPart = { part: '', lyrics: 'some lyrics' }
    expect(chipDisplayLabel(line, 0)).toBe('Part 1')
    expect(chipDisplayLabel(line, 2)).toBe('Part 3')
  })

  it('falls back when part is whitespace only', () => {
    const line: LyricsPart = { part: '   ', lyrics: '' }
    expect(chipDisplayLabel(line, 3)).toBe('Part 4')
  })
})

describe('shouldOmitOptionalLeadBlankRow', () => {
  it('returns false when lineCount is 1', () => {
    const line: LyricsPart = { part: 'blank', lyrics: '' }
    expect(shouldOmitOptionalLeadBlankRow(line, 0, 1)).toBe(false)
  })

  it('returns false when lineCount is 0', () => {
    const line: LyricsPart = { part: 'blank', lyrics: '' }
    expect(shouldOmitOptionalLeadBlankRow(line, 0, 0)).toBe(false)
  })

  it('returns true for first blank lead row in multi-part list', () => {
    const line: LyricsPart = { part: 'blank', lyrics: '' }
    expect(shouldOmitOptionalLeadBlankRow(line, 0, 3)).toBe(true)
  })

  it('returns false when definitionIndex is not 0', () => {
    const line: LyricsPart = { part: 'blank', lyrics: '' }
    expect(shouldOmitOptionalLeadBlankRow(line, 1, 3)).toBe(false)
  })

  it('returns false when part name is not blank', () => {
    const line: LyricsPart = { part: 'Verse', lyrics: '' }
    expect(shouldOmitOptionalLeadBlankRow(line, 0, 3)).toBe(false)
  })

  it('returns false when lyrics are non-empty', () => {
    const line: LyricsPart = { part: 'blank', lyrics: 'some words' }
    expect(shouldOmitOptionalLeadBlankRow(line, 0, 3)).toBe(false)
  })

  it('is case-insensitive for part name', () => {
    const line: LyricsPart = { part: 'BLANK', lyrics: '' }
    expect(shouldOmitOptionalLeadBlankRow(line, 0, 2)).toBe(true)
  })

  it('trims whitespace in part name comparison', () => {
    const line: LyricsPart = { part: '  blank  ', lyrics: '' }
    expect(shouldOmitOptionalLeadBlankRow(line, 0, 2)).toBe(true)
  })
})

describe('moveFormSlotToInsertIndex', () => {
  it('moves an item forward in the sequence', () => {
    // [0,1,2,3] move slot 0 to before index 3 → [1,2,0,3]
    expect(moveFormSlotToInsertIndex([0, 1, 2, 3], 0, 3)).toEqual([1, 2, 0, 3])
  })

  it('moves an item backward in the sequence', () => {
    // [0,1,2,3] move slot 3 to before index 1 → [0,3,1,2]
    expect(moveFormSlotToInsertIndex([0, 1, 2, 3], 3, 1)).toEqual([0, 3, 1, 2])
  })

  it('moving to same position leaves sequence unchanged', () => {
    // [0,1,2] move slot 1 insertBefore 1 → [0,1,2]
    expect(moveFormSlotToInsertIndex([0, 1, 2], 1, 1)).toEqual([0, 1, 2])
  })

  it('moving to end of sequence', () => {
    // [0,1,2] move slot 0 to end (insertBefore 3) → [1,2,0]
    expect(moveFormSlotToInsertIndex([0, 1, 2], 0, 3)).toEqual([1, 2, 0])
  })

  it('clamps insertBefore below 0 to 0', () => {
    // [0,1,2] move slot 2 insertBefore -5 (clamped to 0) → [2,0,1]
    expect(moveFormSlotToInsertIndex([0, 1, 2], 2, -5)).toEqual([2, 0, 1])
  })

  it('clamps insertBefore above sequence.length to sequence.length', () => {
    // [0,1,2] move slot 0 insertBefore 100 (clamped to 3) → [1,2,0]
    expect(moveFormSlotToInsertIndex([0, 1, 2], 0, 100)).toEqual([1, 2, 0])
  })

  it('works with a single-element sequence (no-op)', () => {
    expect(moveFormSlotToInsertIndex([7], 0, 0)).toEqual([7])
  })

  it('moves first element to position 2 in 4-element sequence', () => {
    // [A,B,C,D] move slot 0 insertBefore 2 → [B,A,C,D]
    expect(moveFormSlotToInsertIndex([10, 20, 30, 40], 0, 2)).toEqual([20, 10, 30, 40])
  })
})
