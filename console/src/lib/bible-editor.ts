import { type AvailableBibleVersion, AvailableBibleVersionsTypes } from '@/domain/enums/project'
import type { BibleContent, BibleContentRange } from '@/domain/valueobjects/project'

const ALL_BIBLE_VERSIONS: readonly AvailableBibleVersion[] = Object.values(AvailableBibleVersionsTypes)

export interface BiblePhraseEditorRow {
  readonly rowType: 'phrase'
  version: string
  book: string
  chapterInput: string
  verseInput: string
}

export interface BibleTitleEditorRow {
  readonly rowType: 'title'
}

export type BibleEditorRow = BibleTitleEditorRow | BiblePhraseEditorRow

/**
 * Client-only sentinel: verse `0` means "no verse entered yet" (empty `verseInput` / invalid draft).
 * Not a real Bible verse; export/readiness treats it as incomplete.
 */
export const DRAFT_VERSE_EMPTY: number = 0

export function normalizeVersionInput(raw: string): AvailableBibleVersion | null {
  const trimmed: string = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  for (const v of ALL_BIBLE_VERSIONS) {
    if (v === trimmed) {
      return v
    }
  }
  return null
}

export function emptyPhraseRow(): BiblePhraseEditorRow {
  return {
    rowType: 'phrase',
    version: '',
    book: '',
    chapterInput: '',
    verseInput: '',
  }
}

export function formatVerseInput(start: BibleContent, end: BibleContent | null | undefined): string {
  if (end === null || end === undefined) {
    return String(start.verse)
  }
  return `${String(start.verse)}-${String(end.verse)}`
}

/**
 * Parses a single verse or hyphen/tilde range (`3`, `3-5`, `3~5`). Comma lists are rejected (use another card).
 */
export function parseVerseRangeString(raw: string): { readonly from: number; readonly to: number | null } | null {
  const verse: string = raw.trim()
  if (verse.length === 0) {
    return null
  }
  if (!/^[\d~-]+$/.test(verse)) {
    return null
  }
  const separators: RegExpMatchArray | null = verse.match(/[-~]/g)
  if (separators !== null && separators.length > 1) {
    return null
  }
  const numbers: number[] = (verse.match(/\d+/g) ?? []).map((x: string): number => Number.parseInt(x, 10))
  if (numbers.length === 0 || numbers.some((n: number): boolean => !Number.isInteger(n))) {
    return null
  }
  if (separators === null || separators.length === 0) {
    return { from: numbers[0]!, to: null }
  }
  if (numbers.length !== 2) {
    return null
  }
  const a: number = numbers[0]!
  const b: number = numbers[1]!
  if (b < a) {
    return null
  }
  return { from: a, to: b }
}

export function phraseRowToRange(row: BiblePhraseEditorRow): BibleContentRange | null {
  const bookTrim: string = row.book.trim()
  if (bookTrim.length === 0) {
    return null
  }
  const versionResolved: AvailableBibleVersion | null = normalizeVersionInput(row.version)
  if (versionResolved === null) {
    return null
  }
  const chapterParsed: number = Number.parseInt(row.chapterInput.trim(), 10)
  if (!Number.isInteger(chapterParsed) || chapterParsed < 1) {
    return null
  }
  const parsed: { readonly from: number; readonly to: number | null } | null = parseVerseRangeString(row.verseInput)
  if (parsed === null) {
    return null
  }
  const start: BibleContent = {
    version: versionResolved,
    book: bookTrim,
    chapter: chapterParsed,
    verse: parsed.from,
  }
  const end: BibleContent | null =
    parsed.to === null ? null : { version: versionResolved, book: bookTrim, chapter: chapterParsed, verse: parsed.to }
  return { type: 'phrase', start, end }
}

/**
 * Valid version, book, chapter with an explicitly empty verse field — persist empty verse instead of
 * falling back to the previous saved phrase.
 */
export function phraseRowAlmostValidExceptEmptyVerse(row: BiblePhraseEditorRow): BibleContentRange | null {
  if (row.verseInput.trim().length > 0) {
    return null
  }
  const bookTrim: string = row.book.trim()
  if (bookTrim.length === 0) {
    return null
  }
  const versionResolved: AvailableBibleVersion | null = normalizeVersionInput(row.version)
  if (versionResolved === null) {
    return null
  }
  const chapterParsed: number = Number.parseInt(row.chapterInput.trim(), 10)
  if (!Number.isInteger(chapterParsed) || chapterParsed < 1) {
    return null
  }
  const start: BibleContent = {
    version: versionResolved,
    book: bookTrim,
    chapter: chapterParsed,
    verse: DRAFT_VERSE_EMPTY,
  }
  return { type: 'phrase', start, end: null }
}

/** Persist partial phrase rows from current inputs (never reuse a previous saved verse for this card). */
export function phraseRowToPersistedDraft(row: BiblePhraseEditorRow): BibleContentRange {
  const vFallback: AvailableBibleVersion = normalizeVersionInput(row.version) ?? AvailableBibleVersionsTypes.NIV
  const bookTrim: string = row.book.trim()
  const chapterParsed: number = Number.parseInt(row.chapterInput.trim(), 10)
  const chapter: number = Number.isInteger(chapterParsed) && chapterParsed > 0 ? chapterParsed : 1
  const parsed: { readonly from: number; readonly to: number | null } | null = parseVerseRangeString(row.verseInput)
  if (parsed === null) {
    const start: BibleContent = {
      version: vFallback,
      book: bookTrim,
      chapter,
      verse: DRAFT_VERSE_EMPTY,
    }
    return { type: 'phrase', start, end: null }
  }
  const start: BibleContent = {
    version: vFallback,
    book: bookTrim,
    chapter,
    verse: parsed.from,
  }
  const end: BibleContent | null =
    parsed.to === null ? null : { version: vFallback, book: bookTrim, chapter, verse: parsed.to }
  return { type: 'phrase', start, end }
}

/**
 * Builds ranges for PATCH: valid phrase rows serialize fully; drafts persist from the field model
 * (cleared verse stays empty via verse sentinel 0).
 */
export function rowsToRangesForCommit(rows: readonly BibleEditorRow[]): BibleContentRange[] {
  const out: BibleContentRange[] = []
  for (const row of rows) {
    if (row.rowType === 'title') {
      out.push({ type: 'title', start: null, end: null })
      continue
    }
    const built: BibleContentRange | null = phraseRowToRange(row)
    if (built !== null) {
      out.push(built)
      continue
    }
    const emptyVersePhrase: BibleContentRange | null = phraseRowAlmostValidExceptEmptyVerse(row)
    if (emptyVersePhrase !== null) {
      out.push(emptyVersePhrase)
      continue
    }
    out.push(phraseRowToPersistedDraft(row))
  }
  return out
}

export function rangesToRows(contents: readonly BibleContentRange[] | undefined): BibleEditorRow[] {
  const list: BibleContentRange[] = contents !== undefined ? [...contents] : []
  if (list.length === 0) {
    return []
  }
  return list.map((r: BibleContentRange): BibleEditorRow => {
    if (r.type === 'title') {
      return { rowType: 'title' }
    }
    if (r.start === null) {
      return emptyPhraseRow()
    }
    return {
      rowType: 'phrase',
      version: r.start.version,
      book: r.start.book,
      chapterInput: String(r.start.chapter),
      verseInput: r.start.verse === 0 ? '' : formatVerseInput(r.start, r.end),
    }
  })
}
