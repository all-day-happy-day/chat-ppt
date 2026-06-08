import type { BibleContent } from '@/domain/valueobjects/project'
import type { BibleEditorRow, BiblePhraseEditorRow } from '@/lib/bible-editor'
import {
  emptyPhraseRow,
  formatVerseInput,
  normalizeVersionInput,
  parseVerseRangeString,
  phraseRowAlmostValidExceptEmptyVerse,
  phraseRowToPersistedDraft,
  phraseRowToRange,
  rowsToRangesForCommit,
} from '@/lib/bible-editor'

describe('normalizeVersionInput', () => {
  it('returns the version for exact matches', () => {
    expect(normalizeVersionInput('NIV')).toBe('NIV')
    expect(normalizeVersionInput('KJV')).toBe('KJV')
    expect(normalizeVersionInput('ESV')).toBe('ESV')
    expect(normalizeVersionInput('개역개정')).toBe('개역개정')
  })

  it('trims whitespace before matching', () => {
    expect(normalizeVersionInput('  NIV  ')).toBe('NIV')
  })

  it('returns null for empty string', () => {
    expect(normalizeVersionInput('')).toBeNull()
    expect(normalizeVersionInput('   ')).toBeNull()
  })

  it('returns null for unknown version', () => {
    expect(normalizeVersionInput('NKJV')).toBeNull()
    expect(normalizeVersionInput('niv')).toBeNull()
  })
})

describe('formatVerseInput', () => {
  const base: BibleContent = { version: 'NIV', book: 'John', chapter: 3, verse: 16 }

  it('returns single verse string when end is null', () => {
    expect(formatVerseInput(base, null)).toBe('16')
  })

  it('returns single verse string when end is undefined', () => {
    expect(formatVerseInput(base, undefined)).toBe('16')
  })

  it('returns range string when end is provided (same book/chapter)', () => {
    const end: BibleContent = { version: 'NIV', book: 'John', chapter: 3, verse: 20 }
    expect(formatVerseInput(base, end)).toBe('16-20')
  })

  it('returns range string when end is from different book (still formats as range)', () => {
    const end: BibleContent = { version: 'NIV', book: 'Genesis', chapter: 1, verse: 5 }
    expect(formatVerseInput(base, end)).toBe('16-5')
  })
})

describe('parseVerseRangeString', () => {
  it('parses a single verse number', () => {
    expect(parseVerseRangeString('3')).toEqual({ from: 3, to: null })
  })

  it('parses a hyphen range', () => {
    expect(parseVerseRangeString('3-5')).toEqual({ from: 3, to: 5 })
  })

  it('parses a tilde range', () => {
    expect(parseVerseRangeString('3~5')).toEqual({ from: 3, to: 5 })
  })

  it('returns null for empty string', () => {
    expect(parseVerseRangeString('')).toBeNull()
    expect(parseVerseRangeString('   ')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseVerseRangeString('abc')).toBeNull()
    expect(parseVerseRangeString('3a')).toBeNull()
  })

  it('returns null for comma-separated values', () => {
    expect(parseVerseRangeString('3,5')).toBeNull()
  })

  it('returns null when end is less than start', () => {
    expect(parseVerseRangeString('5-3')).toBeNull()
  })

  it('returns null when more than one separator', () => {
    expect(parseVerseRangeString('3-5-7')).toBeNull()
  })

  it('returns null for a lone separator', () => {
    expect(parseVerseRangeString('-')).toBeNull()
  })

  it('trims whitespace before parsing', () => {
    expect(parseVerseRangeString('  4  ')).toEqual({ from: 4, to: null })
  })

  it('returns equal range when from === to', () => {
    expect(parseVerseRangeString('5-5')).toEqual({ from: 5, to: 5 })
  })
})

describe('phraseRowToRange', () => {
  const validRow: BiblePhraseEditorRow = {
    rowType: 'phrase',
    version: 'NIV',
    book: 'John',
    chapterInput: '3',
    verseInput: '16',
  }

  it('returns a phrase range for a fully valid row', () => {
    const result = phraseRowToRange(validRow)
    expect(result).not.toBeNull()
    expect(result?.type).toBe('phrase')
    expect(result?.start?.verse).toBe(16)
    expect(result?.end).toBeNull()
  })

  it('returns null when book is empty', () => {
    expect(phraseRowToRange({ ...validRow, book: '' })).toBeNull()
    expect(phraseRowToRange({ ...validRow, book: '   ' })).toBeNull()
  })

  it('returns null when version is unrecognized', () => {
    expect(phraseRowToRange({ ...validRow, version: 'UNKNOWN' })).toBeNull()
  })

  it('returns null when chapter is not a positive integer', () => {
    expect(phraseRowToRange({ ...validRow, chapterInput: '0' })).toBeNull()
    expect(phraseRowToRange({ ...validRow, chapterInput: 'abc' })).toBeNull()
    expect(phraseRowToRange({ ...validRow, chapterInput: '-1' })).toBeNull()
  })

  it('returns null when verseInput is invalid', () => {
    expect(phraseRowToRange({ ...validRow, verseInput: 'abc' })).toBeNull()
  })

  it('returns null when verseInput is empty', () => {
    expect(phraseRowToRange({ ...validRow, verseInput: '' })).toBeNull()
  })

  it('returns a range with end populated for a verse range', () => {
    const row: BiblePhraseEditorRow = { ...validRow, verseInput: '16-20' }
    const result = phraseRowToRange(row)
    expect(result?.start?.verse).toBe(16)
    expect(result?.end?.verse).toBe(20)
  })
})

describe('phraseRowAlmostValidExceptEmptyVerse', () => {
  const almostValid: BiblePhraseEditorRow = {
    rowType: 'phrase',
    version: 'NIV',
    book: 'John',
    chapterInput: '3',
    verseInput: '',
  }

  it('returns a phrase range with verse 0 when verse is empty and rest is valid', () => {
    const result = phraseRowAlmostValidExceptEmptyVerse(almostValid)
    expect(result).not.toBeNull()
    expect(result?.type).toBe('phrase')
    expect(result?.start?.verse).toBe(0)
    expect(result?.end).toBeNull()
  })

  it('returns null when verseInput is non-empty', () => {
    expect(phraseRowAlmostValidExceptEmptyVerse({ ...almostValid, verseInput: '5' })).toBeNull()
  })

  it('returns null when book is empty', () => {
    expect(phraseRowAlmostValidExceptEmptyVerse({ ...almostValid, book: '' })).toBeNull()
  })

  it('returns null when version is unrecognized', () => {
    expect(phraseRowAlmostValidExceptEmptyVerse({ ...almostValid, version: 'BAD' })).toBeNull()
  })

  it('returns null when chapter is invalid', () => {
    expect(phraseRowAlmostValidExceptEmptyVerse({ ...almostValid, chapterInput: '0' })).toBeNull()
  })
})

describe('phraseRowToPersistedDraft', () => {
  it('uses NIV fallback when version is unknown', () => {
    const row: BiblePhraseEditorRow = {
      rowType: 'phrase',
      version: 'UNKNOWN',
      book: 'Genesis',
      chapterInput: '1',
      verseInput: '',
    }
    const result = phraseRowToPersistedDraft(row)
    expect(result.start.version).toBe('NIV')
    expect(result.start.verse).toBe(0)
  })

  it('uses chapter 1 fallback when chapterInput is invalid', () => {
    const row: BiblePhraseEditorRow = {
      rowType: 'phrase',
      version: 'NIV',
      book: 'Genesis',
      chapterInput: 'abc',
      verseInput: '',
    }
    const result = phraseRowToPersistedDraft(row)
    expect(result.start.chapter).toBe(1)
  })

  it('persists valid verse when present', () => {
    const row: BiblePhraseEditorRow = {
      rowType: 'phrase',
      version: 'ESV',
      book: 'Romans',
      chapterInput: '8',
      verseInput: '28',
    }
    const result = phraseRowToPersistedDraft(row)
    expect(result.start.verse).toBe(28)
    expect(result.end).toBeNull()
  })

  it('persists verse range end when verse range is valid', () => {
    const row: BiblePhraseEditorRow = {
      rowType: 'phrase',
      version: 'NIV',
      book: 'Psalms',
      chapterInput: '23',
      verseInput: '1-6',
    }
    const result = phraseRowToPersistedDraft(row)
    expect(result.start.verse).toBe(1)
    expect(result.end?.verse).toBe(6)
  })
})

describe('rowsToRangesForCommit', () => {
  it('converts title row to title range', () => {
    const rows: BibleEditorRow[] = [{ rowType: 'title' }]
    expect(rowsToRangesForCommit(rows)).toEqual([{ type: 'title', start: null, end: null }])
  })

  it('converts a fully valid phrase row to phrase range', () => {
    const rows: BibleEditorRow[] = [
      { rowType: 'phrase', version: 'NIV', book: 'John', chapterInput: '3', verseInput: '16' },
    ]
    const result = rowsToRangesForCommit(rows)
    expect(result[0]?.type).toBe('phrase')
    expect((result[0] as { type: 'phrase'; start: BibleContent; end: null }).start.verse).toBe(16)
  })

  it('converts almost-valid (empty verse) row to verse-0 draft', () => {
    const rows: BibleEditorRow[] = [
      { rowType: 'phrase', version: 'NIV', book: 'John', chapterInput: '3', verseInput: '' },
    ]
    const result = rowsToRangesForCommit(rows)
    expect(result[0]?.type).toBe('phrase')
    expect((result[0] as { type: 'phrase'; start: BibleContent; end: null }).start.verse).toBe(0)
  })

  it('falls back to persisted draft for completely invalid rows', () => {
    const rows: BibleEditorRow[] = [{ rowType: 'phrase', version: '', book: '', chapterInput: '', verseInput: '' }]
    const result = rowsToRangesForCommit(rows)
    expect(result[0]?.type).toBe('phrase')
    // NIV fallback version, chapter 1 fallback, verse 0
    expect((result[0] as { type: 'phrase'; start: BibleContent; end: null }).start.version).toBe('NIV')
    expect((result[0] as { type: 'phrase'; start: BibleContent; end: null }).start.chapter).toBe(1)
    expect((result[0] as { type: 'phrase'; start: BibleContent; end: null }).start.verse).toBe(0)
  })

  it('handles mixed rows in order', () => {
    const rows: BibleEditorRow[] = [
      { rowType: 'title' },
      { rowType: 'phrase', version: 'ESV', book: 'Romans', chapterInput: '8', verseInput: '28' },
    ]
    const result = rowsToRangesForCommit(rows)
    expect(result).toHaveLength(2)
    expect(result[0]?.type).toBe('title')
    expect(result[1]?.type).toBe('phrase')
  })

  it('returns empty array for empty input', () => {
    expect(rowsToRangesForCommit([])).toEqual([])
  })
})

describe('emptyPhraseRow', () => {
  it('returns a phrase row with all fields empty', () => {
    expect(emptyPhraseRow()).toEqual({
      rowType: 'phrase',
      version: '',
      book: '',
      chapterInput: '',
      verseInput: '',
    })
  })
})
