import {
  type ChangeEvent,
  type Dispatch,
  type FocusEvent,
  forwardRef,
  Fragment,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import {
  type BiblePhraseProbeResult,
  type BibleVersionOption,
  fetchBibleBooks,
  fetchBibleChapters,
  fetchBibleVersions,
  probeBiblePhraseViaGetBible,
} from '../api/bible'
import type { BibleSlideRange, BibleVerseReference } from '../lib/bible-part-contents'
import {
  readBiblePhraseStartsFromPart,
  readBibleSlideSequenceFromPart,
  verseStringToPayloadVerseInt,
} from '../lib/bible-part-contents'
import { generateUlid } from '../lib/generate-ulid'
import { getProjectPartId, type TemplateLayoutChoice } from '../lib/project-parts-for-patch'

import {
  BIBLE_EDIT_PHRASE_LAYOUT_PALETTE_MENU_ID,
  BIBLE_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID,
  TemplateLayoutGalleryPicker,
} from './TemplateLayoutGalleryPicker'

const PHRASE_LAYOUT_FIELD_LABEL: string = 'Phrase slide layout'

const TITLE_LAYOUT_FIELD_LABEL: string = 'Title slide layout (optional)'

const REFERENCE_SECTION_LABEL: string = 'Verse references'

const VERSION_LABEL: string = 'Version'

const BOOK_LABEL: string = 'Book'

const CHAPTER_LABEL: string = 'Chapter'

const VERSE_LABEL: string = 'Verse'

const SAVE_BUTTON_LABEL: string = 'Save'

const SAVE_BUTTON_SAVING_LABEL: string = 'Saving…'

const ADD_PHRASE_LABEL: string = 'Add phrase'

const INSERT_TITLE_SLIDE_LABEL: string = 'Insert title slide'

const TITLE_SLIDE_CARD_LABEL: string = 'Title slide'

const REMOVE_PHRASE_LABEL: string = 'Remove'

const CHOOSE_PLACEHOLDER: string = 'Search or type…'

const LOADING_OPTIONS_LABEL: string = 'Loading…'

const VERSION_COMBO_NO_MATCHES_MESSAGE: string = 'No matching versions.'

const VERSION_COMBO_EMPTY_MESSAGE: string = 'No versions loaded.'

const BOOK_COMBO_NO_MATCHES_MESSAGE: string = 'No matching books.'

const BOOK_COMBO_EMPTY_CATALOG_MESSAGE: string = 'No books in this list yet.'

const CHAPTER_COMBO_NO_MATCHES_MESSAGE: string = 'No matching chapters.'

const CHAPTER_COMBO_EMPTY_CATALOG_MESSAGE: string = 'No chapters in this list yet.'

const FIELD_ERROR_EMPTY: string = 'This field is required.'

const FIELD_ERROR_NOT_IN_LIST: string = 'Not in the list.'

const FIELD_ERROR_VERSE_PARSE_FORMAT: string =
  'Verse format is invalid. Use digits and at most one separator (-, ~, or ,) between numbers.'

const FIELD_ERROR_VERSE_VALIDATE: string = 'Invalid verse reference.'

const TITLE_SLIDE_NEEDS_ADJACENT_PHRASE_MESSAGE: string =
  'Title slides must sit next to at least one completed phrase. Add or fix nearby phrases.'

const TITLE_SLIDES_REQUIRE_TITLE_LAYOUT_MESSAGE: string =
  'Choose a title slide layout above, or remove title slides, before saving.'

const TITLE_AT_MOST_ONE_BETWEEN_PHRASES_MESSAGE: string =
  'Only one title slide is allowed between any two phrases (and at most one before the first or after the last phrase).'

const MAX_SUGGESTION_ITEMS: number = 50

const TEXT_INPUT_CLASS: string =
  'mt-0.5 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]'

const TEXT_INPUT_ERROR_CLASS: string =
  'mt-0.5 w-full rounded-lg border border-red-500/70 bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-red-500/50 dark:border-red-500/50 dark:bg-[#2c2c2e] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-red-400/50'

/** Must sit above workspace chrome (e.g. canvas column z-10, bottom shell z-30, layout menus z-[480]). */
const COMBO_LIST_PORTAL_Z_INDEX: number = 2147483000

const COMBO_LIST_PORTAL_CLASS: string =
  'pointer-events-auto max-h-40 overflow-auto rounded-lg border border-black/[0.12] bg-white py-0.5 text-[12px] shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:shadow-[0_16px_48px_rgba(0,0,0,0.55)] dark:ring-white/[0.08] fixed'

const COMBO_LIST_ITEM_CLASS: string =
  'w-full cursor-pointer px-2.5 py-1.5 text-left text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-white/10'

const COMBO_LIST_STATUS_HINT_CLASS: string =
  'px-2.5 py-2.5 text-left text-[12px] leading-snug text-neutral-500 min-h-[2.75rem] dark:text-neutral-400'

const DRAFT_KEY_SEPARATOR: string = '\u001f'

const draftFieldKey = (rowId: string, field: 'version' | 'book' | 'chapter'): string =>
  `${rowId}${DRAFT_KEY_SEPARATOR}${field}`

const filterVersionOptions = (query: string, opts: BibleVersionOption[]): BibleVersionOption[] => {
  const q: string = query.trim().toLowerCase()
  if (q.length === 0) {
    return opts.slice(0, MAX_SUGGESTION_ITEMS)
  }
  return opts
    .filter(
      (o: BibleVersionOption): boolean =>
        o.key.toLowerCase().includes(q) || o.label.toLowerCase().includes(q) || o.memberName.toLowerCase().includes(q)
    )
    .slice(0, MAX_SUGGESTION_ITEMS)
}

const filterBookMatches = (query: string, books: string[]): string[] => {
  const q: string = query.trim().toLowerCase()
  if (q.length === 0) {
    return books.slice(0, MAX_SUGGESTION_ITEMS)
  }
  return books.filter((b: string): boolean => b.toLowerCase().includes(q)).slice(0, MAX_SUGGESTION_ITEMS)
}

const filterChapterMatches = (query: string, chapters: number[]): number[] => {
  const q: string = query.trim()
  if (q.length === 0) {
    return chapters.slice(0, MAX_SUGGESTION_ITEMS)
  }
  return chapters.filter((c: number): boolean => String(c).includes(q)).slice(0, MAX_SUGGESTION_ITEMS)
}

const resolveVersionDraftToKey = (draft: string, opts: BibleVersionOption[]): string | null => {
  const t: string = draft.trim()
  if (t.length === 0) {
    return null
  }
  const byKey: BibleVersionOption | undefined = opts.find((o: BibleVersionOption): boolean => o.key === t)
  if (byKey !== undefined) {
    return byKey.key
  }
  const byLabel: BibleVersionOption | undefined = opts.find((o: BibleVersionOption): boolean => o.label === t)
  if (byLabel !== undefined) {
    return byLabel.key
  }
  const byMember: BibleVersionOption | undefined = opts.find((o: BibleVersionOption): boolean => o.memberName === t)
  if (byMember !== undefined) {
    return byMember.key
  }
  const lower: string = t.toLowerCase()
  const one: BibleVersionOption | undefined = opts.find(
    (o: BibleVersionOption): boolean =>
      o.key.toLowerCase() === lower || o.label.toLowerCase() === lower || o.memberName.toLowerCase() === lower
  )
  return one !== undefined ? one.key : null
}

const resolveBookDraftToCanonical = (draft: string, books: string[]): string | null => {
  const t: string = draft.trim()
  if (t.length === 0) {
    return null
  }
  if (books.includes(t)) {
    return t
  }
  const lower: string = t.toLowerCase()
  const matches: string[] = books.filter((b: string): boolean => b.toLowerCase() === lower)
  if (matches.length === 1) {
    return matches[0]
  }
  return null
}

const resolveChapterDraftToNumber = (draft: string, chapters: number[]): number | null => {
  const t: string = draft.trim()
  if (t.length === 0) {
    return null
  }
  const n: number = Number.parseInt(t, 10)
  if (Number.isNaN(n) || !chapters.includes(n)) {
    return null
  }
  return n
}

export type BiblePartSavePayload = {
  slides: BibleSlideRange[]
}

export type BiblePartEditFormProps = {
  isOpen: boolean
  onClose: () => void
  partHeading: string
  layoutChoices: TemplateLayoutChoice[]
  phraseLayoutId: string | null
  titleLayoutId: string | null
  onChangePhraseLayoutId: (layoutId: string | null) => void
  onChangeTitleLayoutId: (layoutId: string | null) => void
  /** Current project part (BIBLE); used to hydrate fields when opening or switching parts. */
  partSnapshot: unknown
  emptyStateMessage: string | null
  isSaveDisabled: boolean
  isSaving: boolean
  onSave: (payload: BiblePartSavePayload) => void
}

type RefFieldKey = 'version' | 'book' | 'chapter' | 'verse'

type RowFieldErrors = Partial<Record<RefFieldKey, string>>

type PhraseRowState = {
  kind: 'phrase'
  id: string
  version: string
  book: string
  chapter: string
  verse: string
}

type TitleSlideRowState = {
  kind: 'title'
  id: string
}

type BibleSlideRowState = PhraseRowState | TitleSlideRowState

const buildComboDraftMapForRows = (
  rows: PhraseRowState[],
  versionOptions: BibleVersionOption[]
): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const row of rows) {
    let versionDraft: string = ''
    if (row.version.length > 0) {
      const vo: BibleVersionOption | undefined = versionOptions.find(
        (o: BibleVersionOption): boolean => o.key === row.version
      )
      versionDraft = vo !== undefined ? vo.label : row.version
    }
    out[draftFieldKey(row.id, 'version')] = versionDraft
    out[draftFieldKey(row.id, 'book')] = row.book
    out[draftFieldKey(row.id, 'chapter')] = row.chapter
  }
  return out
}

const buildComboDraftMapForSlideRows = (
  rows: BibleSlideRowState[],
  versionOptions: BibleVersionOption[]
): Record<string, string> => {
  const phraseRows: PhraseRowState[] = rows.filter((r: BibleSlideRowState): r is PhraseRowState => r.kind === 'phrase')
  return buildComboDraftMapForRows(phraseRows, versionOptions)
}

type RowCascadeState = {
  books: string[]
  chapters: number[]
  booksLoading: boolean
  chaptersLoading: boolean
  /** Version key used for `books` (from `fetchBibleBooks`). */
  booksVersionKey: string | null
}

const emptyRowCascade = (): RowCascadeState => ({
  books: [],
  chapters: [],
  booksLoading: false,
  chaptersLoading: false,
  booksVersionKey: null,
})

const isVersionGateOk = (
  row: PhraseRowState,
  versionOptions: BibleVersionOption[],
  errs: RowFieldErrors | undefined
): boolean => {
  if (row.version.length === 0) {
    return false
  }
  if (!versionOptions.some((vo: BibleVersionOption): boolean => vo.key === row.version)) {
    return false
  }
  if (errs?.version !== undefined) {
    return false
  }
  return true
}

const isBookGateOk = (
  row: PhraseRowState,
  cascade: RowCascadeState,
  versionOptions: BibleVersionOption[],
  errs: RowFieldErrors | undefined
): boolean => {
  if (!isVersionGateOk(row, versionOptions, errs)) {
    return false
  }
  if (row.book.length === 0) {
    return false
  }
  if (errs?.book !== undefined) {
    return false
  }
  return cascade.books.includes(row.book)
}

const isChapterGateOk = (
  row: PhraseRowState,
  cascade: RowCascadeState,
  versionOptions: BibleVersionOption[],
  errs: RowFieldErrors | undefined
): boolean => {
  if (!isBookGateOk(row, cascade, versionOptions, errs)) {
    return false
  }
  if (row.chapter.length === 0) {
    return false
  }
  const chNum: number = Number.parseInt(row.chapter, 10)
  if (Number.isNaN(chNum) || errs?.chapter !== undefined) {
    return false
  }
  return cascade.chapters.includes(chNum)
}

const versionLabelForPhraseRow = (row: PhraseRowState, versionOptions: BibleVersionOption[]): string => {
  const vo: BibleVersionOption | undefined = versionOptions.find(
    (o: BibleVersionOption): boolean => o.key === row.version
  )
  return vo !== undefined ? vo.label : row.version
}

const buildPhrasePreviewText = (row: PhraseRowState, versionOptions: BibleVersionOption[]): string => {
  const vl: string = versionLabelForPhraseRow(row, versionOptions)
  return `${vl} · ${row.book} ${row.chapter}:${row.verse.trim()}`
}

const canFoldPhraseRow = (
  row: PhraseRowState,
  cascade: RowCascadeState,
  versionOptions: BibleVersionOption[],
  errs: RowFieldErrors | undefined
): boolean => {
  if (!isChapterGateOk(row, cascade, versionOptions, errs)) {
    return false
  }
  return row.verse.trim().length > 0
}

const probeVerseRowAgainstGetBible = async (row: PhraseRowState): Promise<BiblePhraseProbeResult> => {
  const chNum: number = Number.parseInt(row.chapter, 10)
  if (
    row.version.length === 0 ||
    row.book.length === 0 ||
    row.chapter.length === 0 ||
    row.verse.length === 0 ||
    Number.isNaN(chNum)
  ) {
    return { ok: false, reason: 'other' }
  }
  try {
    return await probeBiblePhraseViaGetBible({
      version: row.version,
      book: row.book,
      chapter: String(chNum),
      verse: row.verse.trim(),
    })
  } catch {
    return { ok: false, reason: 'other' }
  }
}

const runFetchCascadeForPhraseRow = (
  row: PhraseRowState,
  isCancelled: () => boolean,
  setRowCascade: Dispatch<SetStateAction<Record<string, RowCascadeState>>>
): void => {
  if (row.version.length === 0) {
    return
  }
  void (async (): Promise<void> => {
    try {
      const books: string[] = await fetchBibleBooks(row.version)
      if (isCancelled()) {
        return
      }
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [row.id]: {
            ...(prev[row.id] ?? emptyRowCascade()),
            books,
            booksLoading: false,
            booksVersionKey: row.version,
          },
        })
      )
      if (row.book.length === 0 || !books.includes(row.book)) {
        return
      }
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [row.id]: {
            ...(prev[row.id] ?? emptyRowCascade()),
            chaptersLoading: true,
          },
        })
      )
      const chapters: number[] = await fetchBibleChapters(row.version, row.book)
      if (isCancelled()) {
        return
      }
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [row.id]: {
            ...(prev[row.id] ?? emptyRowCascade()),
            chapters,
            chaptersLoading: false,
          },
        })
      )
    } catch {
      if (isCancelled()) {
        return
      }
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [row.id]: emptyRowCascade(),
        })
      )
    }
  })()
}

const normalizeSlidePhraseVersionKeys = (
  rows: BibleSlideRowState[],
  opts: BibleVersionOption[]
): BibleSlideRowState[] => {
  if (opts.length === 0) {
    return rows
  }
  return rows.map((row: BibleSlideRowState): BibleSlideRowState => {
    if (row.kind === 'title') {
      return row
    }
    if (row.version.length === 0) {
      return row
    }
    if (opts.some((o: BibleVersionOption): boolean => o.key === row.version)) {
      return row
    }
    const byMember: BibleVersionOption | undefined = opts.find(
      (o: BibleVersionOption): boolean => o.memberName === row.version
    )
    if (byMember !== undefined) {
      return { ...row, version: byMember.key }
    }
    const found: BibleVersionOption | undefined = opts.find((o: BibleVersionOption): boolean => o.label === row.version)
    if (found !== undefined) {
      return { ...row, version: found.key }
    }
    return row
  })
}

/** Stable ids avoid Strict Mode / effect re-runs orphaning async cascade updates keyed by row id. */
const buildHydratedSlideRows = (partSnapshot: unknown, bibleHydrationKey: string): BibleSlideRowState[] => {
  const seq: BibleSlideRange[] = readBibleSlideSequenceFromPart(partSnapshot)
  if (seq.length === 0) {
    return []
  }
  return seq.map((item: BibleSlideRange, index: number): BibleSlideRowState => {
    if (item.slideType === 'title') {
      return {
        kind: 'title',
        id: `${bibleHydrationKey}:title:${String(index)}`,
      }
    }
    const r: BibleVerseReference = item.start
    return {
      kind: 'phrase',
      id: `${bibleHydrationKey}:phrase:${String(index)}`,
      version: r.version,
      book: r.book,
      chapter: String(r.chapter),
      verse: String(r.verse),
    }
  })
}

/** Titles strictly between the nearest phrase at or before `afterIndex` and the nearest phrase after `afterIndex`. */
const countTitlesInPhraseGapAfterRow = (rows: BibleSlideRowState[], afterIndex: number): number => {
  let prevPhrase: number = -1
  for (let i = 0; i <= afterIndex; i++) {
    if (rows[i]!.kind === 'phrase') {
      prevPhrase = i
    }
  }
  let nextPhrase: number = rows.length
  for (let i = afterIndex + 1; i < rows.length; i++) {
    if (rows[i]!.kind === 'phrase') {
      nextPhrase = i
      break
    }
  }
  let count: number = 0
  for (let i = prevPhrase + 1; i < nextPhrase; i++) {
    if (rows[i]!.kind === 'title') {
      count++
    }
  }
  return count
}

const canInsertTitleAfterRow = (rows: BibleSlideRowState[], afterIndex: number): boolean => {
  return countTitlesInPhraseGapAfterRow(rows, afterIndex) === 0
}

const hasAtMostOneTitleBetweenPhrasePairs = (rows: BibleSlideRowState[]): boolean => {
  const phraseIndices: number[] = []
  rows.forEach((r: BibleSlideRowState, i: number): void => {
    if (r.kind === 'phrase') {
      phraseIndices.push(i)
    }
  })
  if (phraseIndices.length === 0) {
    return true
  }
  const firstPhraseIdx: number = phraseIndices[0]!
  let titlesBeforeFirst: number = 0
  for (let i = 0; i < firstPhraseIdx; i++) {
    if (rows[i]!.kind === 'title') {
      titlesBeforeFirst++
    }
  }
  if (titlesBeforeFirst > 1) {
    return false
  }
  for (let k = 0; k < phraseIndices.length - 1; k++) {
    const a: number = phraseIndices[k]!
    const b: number = phraseIndices[k + 1]!
    let titlesBetween: number = 0
    for (let i = a + 1; i < b; i++) {
      if (rows[i]!.kind === 'title') {
        titlesBetween++
      }
    }
    if (titlesBetween > 1) {
      return false
    }
  }
  const lastPhraseIdx: number = phraseIndices[phraseIndices.length - 1]!
  let titlesAfterLast: number = 0
  for (let i = lastPhraseIdx + 1; i < rows.length; i++) {
    if (rows[i]!.kind === 'title') {
      titlesAfterLast++
    }
  }
  if (titlesAfterLast > 1) {
    return false
  }
  return true
}

/** Keeps at most one title per phrase gap (first wins). Used after removing a phrase that sat between two titles. */
const dedupeTitlesInPhraseGaps = (rows: BibleSlideRowState[]): BibleSlideRowState[] => {
  const phraseIndices: number[] = []
  rows.forEach((r: BibleSlideRowState, i: number): void => {
    if (r.kind === 'phrase') {
      phraseIndices.push(i)
    }
  })
  if (phraseIndices.length === 0) {
    return rows.filter((r: BibleSlideRowState): boolean => r.kind === 'phrase')
  }
  const dropTitleIds: Set<string> = new Set()
  const firstPhraseIdx: number = phraseIndices[0]!
  let seenTitle: boolean = false
  for (let i: number = 0; i < firstPhraseIdx; i++) {
    const r: BibleSlideRowState = rows[i]!
    if (r.kind === 'title') {
      if (seenTitle) {
        dropTitleIds.add(r.id)
      } else {
        seenTitle = true
      }
    }
  }
  for (let k: number = 0; k < phraseIndices.length - 1; k++) {
    const a: number = phraseIndices[k]!
    const b: number = phraseIndices[k + 1]!
    seenTitle = false
    for (let i: number = a + 1; i < b; i++) {
      const r: BibleSlideRowState = rows[i]!
      if (r.kind === 'title') {
        if (seenTitle) {
          dropTitleIds.add(r.id)
        } else {
          seenTitle = true
        }
      }
    }
  }
  const lastPhraseIdx: number = phraseIndices[phraseIndices.length - 1]!
  seenTitle = false
  for (let i: number = lastPhraseIdx + 1; i < rows.length; i++) {
    const r: BibleSlideRowState = rows[i]!
    if (r.kind === 'title') {
      if (seenTitle) {
        dropTitleIds.add(r.id)
      } else {
        seenTitle = true
      }
    }
  }
  return rows.filter((r: BibleSlideRowState): boolean => !dropTitleIds.has(r.id))
}

const stripTitleRowsFromSlideRows = (rows: BibleSlideRowState[]): BibleSlideRowState[] => {
  return rows.filter((r: BibleSlideRowState): boolean => r.kind !== 'title')
}

const resolveTitleSlideAnchor = (
  rows: BibleSlideRowState[],
  titleRowId: string,
  phraseRefById: Map<string, BibleVerseReference>
): BibleVerseReference | null => {
  const idx: number = rows.findIndex((r: BibleSlideRowState): boolean => r.id === titleRowId)
  if (idx === -1) {
    return null
  }
  for (let j: number = idx + 1; j < rows.length; j++) {
    const r: BibleSlideRowState = rows[j]!
    if (r.kind === 'phrase') {
      const ref: BibleVerseReference | undefined = phraseRefById.get(r.id)
      if (ref !== undefined) {
        return ref
      }
    }
  }
  for (let j: number = idx - 1; j >= 0; j--) {
    const r: BibleSlideRowState = rows[j]!
    if (r.kind === 'phrase') {
      const ref: BibleVerseReference | undefined = phraseRefById.get(r.id)
      if (ref !== undefined) {
        return ref
      }
    }
  }
  return null
}

const buildAddedPhraseRowId = (bibleHydrationKey: string): string => {
  return `${bibleHydrationKey}:add:${generateUlid()}`
}

export const BiblePartEditForm = forwardRef<HTMLElement, BiblePartEditFormProps>(function BiblePartEditForm(
  {
    isOpen,
    onClose,
    partHeading,
    layoutChoices,
    phraseLayoutId,
    titleLayoutId,
    onChangePhraseLayoutId,
    onChangeTitleLayoutId,
    partSnapshot,
    emptyStateMessage,
    isSaveDisabled,
    isSaving,
    onSave,
  },
  ref
): ReactElement | null {
  const [versionOptions, setVersionOptions] = useState<BibleVersionOption[]>([])
  const [slideRows, setSlideRows] = useState<BibleSlideRowState[]>([])
  const [rowCascade, setRowCascade] = useState<Record<string, RowCascadeState>>({})
  const [rowFieldErrors, setRowFieldErrors] = useState<Record<string, RowFieldErrors>>({})
  const [comboDrafts, setComboDrafts] = useState<Record<string, string>>({})
  const [openComboKey, setOpenComboKey] = useState<string | null>(null)
  const [fixedComboRect, setFixedComboRect] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const [referenceSectionError, setReferenceSectionError] = useState<string | null>(null)
  const [isSaveGatePending, setIsSaveGatePending] = useState<boolean>(false)
  /** When `true`, the phrase row is folded to a preview line. */
  const [collapsedPhraseRows, setCollapsedPhraseRows] = useState<Record<string, boolean>>({})
  const slideRowsRef = useRef<BibleSlideRowState[]>(slideRows)
  slideRowsRef.current = slideRows
  const rowCascadeRef = useRef<Record<string, RowCascadeState>>(rowCascade)
  rowCascadeRef.current = rowCascade
  const rowFieldErrorsRef = useRef<Record<string, RowFieldErrors>>({})
  rowFieldErrorsRef.current = rowFieldErrors
  const comboDraftsRef = useRef<Record<string, string>>({})
  comboDraftsRef.current = comboDrafts
  const versionOptionsRef = useRef<BibleVersionOption[]>([])
  versionOptionsRef.current = versionOptions
  const openComboAnchorRef = useRef<HTMLDivElement | null>(null)
  const openComboInputRef = useRef<HTMLInputElement | null>(null)
  const openComboDropdownRef = useRef<HTMLDivElement | null>(null)
  const partSnapshotRef = useRef<unknown>(partSnapshot)
  partSnapshotRef.current = partSnapshot

  const bibleHydrationKey: string = useMemo((): string => {
    const partId: string | null = getProjectPartId(partSnapshot)
    const seq: BibleSlideRange[] = readBibleSlideSequenceFromPart(partSnapshot)
    const seqKey: string = seq
      .map((s: BibleSlideRange): string => {
        const r: BibleVerseReference = s.start
        return `${s.slideType}|${r.version}|${r.book}|${String(r.chapter)}|${String(r.verse)}`
      })
      .join(';')
    return `${partId ?? ''}|${seqKey}`
  }, [partSnapshot])

  const handlePhraseLayoutFromGallery = useCallback(
    (layoutId: string | null): void => {
      onChangePhraseLayoutId(layoutId)
    },
    [onChangePhraseLayoutId]
  )

  const handleTitleLayoutFromGallery = useCallback(
    (layoutId: string | null): void => {
      onChangeTitleLayoutId(layoutId)
    },
    [onChangeTitleLayoutId]
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }
    let cancelled: boolean = false
    void (async (): Promise<void> => {
      try {
        const opts: BibleVersionOption[] = await fetchBibleVersions()
        if (cancelled) {
          return
        }
        setVersionOptions(opts)
        versionOptionsRef.current = opts
        setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] => normalizeSlidePhraseVersionKeys(prev, opts))
      } catch {
        if (!cancelled) {
          setVersionOptions([])
        }
      }
    })()
    return (): void => {
      cancelled = true
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) {
      return
    }
    let rows: BibleSlideRowState[] = buildHydratedSlideRows(partSnapshotRef.current, bibleHydrationKey)
    if (titleLayoutId === null || titleLayoutId.length === 0) {
      rows = stripTitleRowsFromSlideRows(rows)
    }
    setSlideRows(rows)
    setRowFieldErrors({})
    setReferenceSectionError(null)
    setOpenComboKey(null)
    const initialCascade: Record<string, RowCascadeState> = {}
    for (const row of rows) {
      if (row.kind === 'phrase') {
        initialCascade[row.id] = emptyRowCascade()
      }
    }
    setRowCascade(initialCascade)
    setComboDrafts(buildComboDraftMapForSlideRows(rows, versionOptionsRef.current))
  }, [isOpen, bibleHydrationKey])

  useEffect(() => {
    if (!isOpen || versionOptions.length === 0) {
      return
    }
    setComboDrafts((prev: Record<string, string>): Record<string, string> => {
      let changed: boolean = false
      const next: Record<string, string> = { ...prev }
      for (const row of slideRowsRef.current) {
        if (row.kind !== 'phrase' || row.version.length === 0) {
          continue
        }
        const vk: string = draftFieldKey(row.id, 'version')
        const vo: BibleVersionOption | undefined = versionOptions.find(
          (o: BibleVersionOption): boolean => o.key === row.version
        )
        if (vo !== undefined && next[vk] !== vo.label) {
          next[vk] = vo.label
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [isOpen, versionOptions])

  useLayoutEffect(() => {
    if (openComboKey === null) {
      setFixedComboRect(null)
      return
    }
    const updatePosition = (): void => {
      const inputEl: HTMLInputElement | null = openComboInputRef.current
      if (inputEl === null) {
        setFixedComboRect(null)
        return
      }
      const r: DOMRect = inputEl.getBoundingClientRect()
      setFixedComboRect({
        top: r.bottom + 4,
        left: r.left,
        width: r.width,
      })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return (): void => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [openComboKey])

  useEffect(() => {
    if (openComboKey === null) {
      return undefined
    }
    const onMouseDown = (ev: MouseEvent): void => {
      if (!(ev.target instanceof Node)) {
        return
      }
      const anchor: HTMLDivElement | null = openComboAnchorRef.current
      const dropdown: HTMLDivElement | null = openComboDropdownRef.current
      if (anchor !== null && anchor.contains(ev.target)) {
        return
      }
      if (dropdown !== null && dropdown.contains(ev.target)) {
        return
      }
      setOpenComboKey(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return (): void => {
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [openComboKey])

  /** Prefetch books/chapters only for parts that already have saved phrase refs (not blank new rows). */
  useEffect(() => {
    if (!isOpen || versionOptions.length === 0) {
      return
    }
    const refs: BibleVerseReference[] = readBiblePhraseStartsFromPart(partSnapshotRef.current)
    if (refs.length === 0) {
      return
    }
    let cancelled: boolean = false
    const isCancelled = (): boolean => cancelled
    const rows: BibleSlideRowState[] = slideRowsRef.current
    for (const row of rows) {
      if (row.kind !== 'phrase' || row.version.length === 0) {
        continue
      }
      runFetchCascadeForPhraseRow(row, isCancelled, setRowCascade)
    }
    return (): void => {
      cancelled = true
    }
  }, [isOpen, bibleHydrationKey, versionOptions])

  const clearRowFieldError = useCallback((rowId: string, key: RefFieldKey): void => {
    setRowFieldErrors((prev: Record<string, RowFieldErrors>): Record<string, RowFieldErrors> => {
      const rowErr: RowFieldErrors | undefined = prev[rowId]
      if (rowErr === undefined || rowErr[key] === undefined) {
        return prev
      }
      const nextRow: RowFieldErrors = { ...rowErr }
      delete nextRow[key]
      const next: Record<string, RowFieldErrors> = { ...prev }
      if (Object.keys(nextRow).length === 0) {
        delete next[rowId]
      } else {
        next[rowId] = nextRow
      }
      return next
    })
  }, [])

  const setRowFieldErrorMessage = useCallback((rowId: string, key: RefFieldKey, message: string): void => {
    setRowFieldErrors(
      (prev: Record<string, RowFieldErrors>): Record<string, RowFieldErrors> => ({
        ...prev,
        [rowId]: { ...(prev[rowId] ?? {}), [key]: message },
      })
    )
  }, [])

  /** Loads `fetchBibleBooks(versionKey)` — the canonical book list for that version. */
  const loadBooksForVersionKey = useCallback((rowId: string, versionKey: string): void => {
    if (versionKey.length === 0) {
      return
    }
    setRowCascade(
      (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
        ...prev,
        [rowId]: {
          ...(prev[rowId] ?? emptyRowCascade()),
          books: [],
          booksVersionKey: null,
          booksLoading: true,
        },
      })
    )
    void (async (): Promise<void> => {
      try {
        const books: string[] = await fetchBibleBooks(versionKey)
        const still: PhraseRowState | undefined = slideRowsRef.current.find(
          (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
        )
        if (still === undefined || still.version !== versionKey) {
          return
        }
        setRowCascade(
          (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
            ...prev,
            [rowId]: {
              ...(prev[rowId] ?? emptyRowCascade()),
              books,
              booksLoading: false,
              booksVersionKey: versionKey,
            },
          })
        )
      } catch {
        const still: PhraseRowState | undefined = slideRowsRef.current.find(
          (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
        )
        if (still === undefined || still.version !== versionKey) {
          return
        }
        setRowCascade(
          (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
            ...prev,
            [rowId]: emptyRowCascade(),
          })
        )
      }
    })()
  }, [])

  const ensureBooksLoadedForRow = useCallback(
    (rowId: string): void => {
      const row: PhraseRowState | undefined = slideRowsRef.current.find(
        (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
      )
      if (row === undefined || row.version.length === 0) {
        return
      }
      const snap: RowCascadeState = rowCascadeRef.current[rowId] ?? emptyRowCascade()
      if (snap.booksLoading) {
        return
      }
      if (snap.books.length > 0 && snap.booksVersionKey === row.version) {
        return
      }
      loadBooksForVersionKey(rowId, row.version)
    },
    [loadBooksForVersionKey]
  )

  const loadChaptersForBookRow = useCallback((rowId: string, versionKey: string, bookCanonical: string): void => {
    if (versionKey.length === 0 || bookCanonical.length === 0) {
      return
    }
    setRowCascade(
      (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
        ...prev,
        [rowId]: { ...(prev[rowId] ?? emptyRowCascade()), chaptersLoading: true },
      })
    )
    void (async (): Promise<void> => {
      try {
        const chapters: number[] = await fetchBibleChapters(versionKey, bookCanonical)
        const still: PhraseRowState | undefined = slideRowsRef.current.find(
          (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
        )
        if (still === undefined || still.version !== versionKey || still.book !== bookCanonical) {
          return
        }
        setRowCascade((prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => {
          const cur: RowCascadeState = prev[rowId] ?? emptyRowCascade()
          return {
            ...prev,
            [rowId]: { ...cur, chapters, chaptersLoading: false },
          }
        })
      } catch {
        setRowCascade((prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => {
          const cur: RowCascadeState = prev[rowId] ?? emptyRowCascade()
          return {
            ...prev,
            [rowId]: { ...cur, chapters: [], chaptersLoading: false },
          }
        })
      }
    })()
  }, [])

  const commitVersionFromDraft = useCallback(
    (rowId: string, draftRaw: string): void => {
      const opts: BibleVersionOption[] = versionOptionsRef.current
      const trimmed: string = draftRaw.trim()
      clearRowFieldError(rowId, 'version')
      if (trimmed.length === 0) {
        setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
          prev.map(
            (r: BibleSlideRowState): BibleSlideRowState =>
              r.id === rowId && r.kind === 'phrase' ? { ...r, version: '', book: '', chapter: '', verse: '' } : r
          )
        )
        setComboDrafts(
          (prev: Record<string, string>): Record<string, string> => ({
            ...prev,
            [draftFieldKey(rowId, 'version')]: '',
            [draftFieldKey(rowId, 'book')]: '',
            [draftFieldKey(rowId, 'chapter')]: '',
          })
        )
        setRowCascade(
          (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
            ...prev,
            [rowId]: emptyRowCascade(),
          })
        )
        return
      }
      const resolved: string | null = resolveVersionDraftToKey(draftRaw, opts)
      if (resolved === null) {
        setRowFieldErrorMessage(rowId, 'version', FIELD_ERROR_NOT_IN_LIST)
        return
      }
      const vo: BibleVersionOption | undefined = opts.find((o: BibleVersionOption): boolean => o.key === resolved)
      const label: string = vo !== undefined ? vo.label : resolved
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
        prev.map(
          (r: BibleSlideRowState): BibleSlideRowState =>
            r.id === rowId && r.kind === 'phrase' ? { ...r, version: resolved, book: '', chapter: '', verse: '' } : r
        )
      )
      setComboDrafts(
        (prev: Record<string, string>): Record<string, string> => ({
          ...prev,
          [draftFieldKey(rowId, 'version')]: label,
          [draftFieldKey(rowId, 'book')]: '',
          [draftFieldKey(rowId, 'chapter')]: '',
        })
      )
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [rowId]: emptyRowCascade(),
        })
      )
      window.setTimeout((): void => {
        loadBooksForVersionKey(rowId, resolved)
      }, 0)
    },
    [clearRowFieldError, loadBooksForVersionKey, setRowFieldErrorMessage]
  )

  const pickVersionOption = useCallback(
    (rowId: string, vo: BibleVersionOption): void => {
      clearRowFieldError(rowId, 'version')
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
        prev.map(
          (r: BibleSlideRowState): BibleSlideRowState =>
            r.id === rowId && r.kind === 'phrase' ? { ...r, version: vo.key, book: '', chapter: '', verse: '' } : r
        )
      )
      setComboDrafts(
        (prev: Record<string, string>): Record<string, string> => ({
          ...prev,
          [draftFieldKey(rowId, 'version')]: vo.label,
          [draftFieldKey(rowId, 'book')]: '',
          [draftFieldKey(rowId, 'chapter')]: '',
        })
      )
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [rowId]: emptyRowCascade(),
        })
      )
      setOpenComboKey(null)
      window.setTimeout((): void => {
        loadBooksForVersionKey(rowId, vo.key)
      }, 0)
    },
    [clearRowFieldError, loadBooksForVersionKey]
  )

  const commitBookFromDraft = useCallback(
    (rowId: string, draftRaw: string): void => {
      clearRowFieldError(rowId, 'book')
      const row: PhraseRowState | undefined = slideRowsRef.current.find(
        (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
      )
      const cascade: RowCascadeState = rowCascadeRef.current[rowId] ?? emptyRowCascade()
      const errs: RowFieldErrors | undefined = rowFieldErrorsRef.current[rowId]
      if (row === undefined || !isVersionGateOk(row, versionOptionsRef.current, errs)) {
        return
      }
      if (cascade.booksLoading) {
        return
      }
      if (cascade.books.length === 0) {
        if (draftRaw.trim().length > 0) {
          setRowFieldErrorMessage(rowId, 'book', FIELD_ERROR_NOT_IN_LIST)
        }
        return
      }
      const trimmed: string = draftRaw.trim()
      if (trimmed.length === 0) {
        setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
          prev.map(
            (r: BibleSlideRowState): BibleSlideRowState =>
              r.id === rowId && r.kind === 'phrase' ? { ...r, book: '', chapter: '', verse: '' } : r
          )
        )
        setComboDrafts(
          (prev: Record<string, string>): Record<string, string> => ({
            ...prev,
            [draftFieldKey(rowId, 'book')]: '',
            [draftFieldKey(rowId, 'chapter')]: '',
          })
        )
        setRowCascade(
          (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
            ...prev,
            [rowId]: { ...(prev[rowId] ?? emptyRowCascade()), chapters: [] },
          })
        )
        return
      }
      const resolved: string | null = resolveBookDraftToCanonical(trimmed, cascade.books)
      if (resolved === null) {
        setRowFieldErrorMessage(rowId, 'book', FIELD_ERROR_NOT_IN_LIST)
        return
      }
      const versionKey: string = row.version
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
        prev.map(
          (r: BibleSlideRowState): BibleSlideRowState =>
            r.id === rowId && r.kind === 'phrase' ? { ...r, book: resolved, chapter: '', verse: '' } : r
        )
      )
      setComboDrafts(
        (prev: Record<string, string>): Record<string, string> => ({
          ...prev,
          [draftFieldKey(rowId, 'book')]: resolved,
          [draftFieldKey(rowId, 'chapter')]: '',
        })
      )
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [rowId]: { ...(prev[rowId] ?? emptyRowCascade()), chapters: [] },
        })
      )
      loadChaptersForBookRow(rowId, versionKey, resolved)
    },
    [clearRowFieldError, loadChaptersForBookRow, setRowFieldErrorMessage]
  )

  const pickBookOption = useCallback(
    (rowId: string, bookCanonical: string): void => {
      clearRowFieldError(rowId, 'book')
      const row: PhraseRowState | undefined = slideRowsRef.current.find(
        (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
      )
      if (row === undefined) {
        return
      }
      const versionKey: string = row.version
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
        prev.map(
          (r: BibleSlideRowState): BibleSlideRowState =>
            r.id === rowId && r.kind === 'phrase' ? { ...r, book: bookCanonical, chapter: '', verse: '' } : r
        )
      )
      setComboDrafts(
        (prev: Record<string, string>): Record<string, string> => ({
          ...prev,
          [draftFieldKey(rowId, 'book')]: bookCanonical,
          [draftFieldKey(rowId, 'chapter')]: '',
        })
      )
      setRowCascade(
        (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
          ...prev,
          [rowId]: { ...(prev[rowId] ?? emptyRowCascade()), chapters: [] },
        })
      )
      setOpenComboKey(null)
      loadChaptersForBookRow(rowId, versionKey, bookCanonical)
    },
    [clearRowFieldError, loadChaptersForBookRow]
  )

  const commitChapterFromDraft = useCallback(
    (rowId: string, draftRaw: string): void => {
      clearRowFieldError(rowId, 'chapter')
      const row: PhraseRowState | undefined = slideRowsRef.current.find(
        (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
      )
      const cascade: RowCascadeState = rowCascadeRef.current[rowId] ?? emptyRowCascade()
      const errs: RowFieldErrors | undefined = rowFieldErrorsRef.current[rowId]
      if (row === undefined || !isBookGateOk(row, cascade, versionOptionsRef.current, errs)) {
        return
      }
      const trimmed: string = draftRaw.trim()
      if (trimmed.length === 0) {
        setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
          prev.map(
            (r: BibleSlideRowState): BibleSlideRowState =>
              r.id === rowId && r.kind === 'phrase' ? { ...r, chapter: '', verse: '' } : r
          )
        )
        setComboDrafts(
          (prev: Record<string, string>): Record<string, string> => ({
            ...prev,
            [draftFieldKey(rowId, 'chapter')]: '',
          })
        )
        return
      }
      const resolved: number | null = resolveChapterDraftToNumber(trimmed, cascade.chapters)
      if (resolved === null) {
        setRowFieldErrorMessage(rowId, 'chapter', FIELD_ERROR_NOT_IN_LIST)
        return
      }
      const asText: string = String(resolved)
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
        prev.map(
          (r: BibleSlideRowState): BibleSlideRowState =>
            r.id === rowId && r.kind === 'phrase' ? { ...r, chapter: asText, verse: '' } : r
        )
      )
      setComboDrafts(
        (prev: Record<string, string>): Record<string, string> => ({
          ...prev,
          [draftFieldKey(rowId, 'chapter')]: asText,
        })
      )
      clearRowFieldError(rowId, 'verse')
    },
    [clearRowFieldError, setRowFieldErrorMessage]
  )

  const pickChapterOption = useCallback(
    (rowId: string, chapterNumber: number): void => {
      clearRowFieldError(rowId, 'chapter')
      const asText: string = String(chapterNumber)
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
        prev.map(
          (r: BibleSlideRowState): BibleSlideRowState =>
            r.id === rowId && r.kind === 'phrase' ? { ...r, chapter: asText, verse: '' } : r
        )
      )
      setComboDrafts(
        (prev: Record<string, string>): Record<string, string> => ({
          ...prev,
          [draftFieldKey(rowId, 'chapter')]: asText,
        })
      )
      setOpenComboKey(null)
      clearRowFieldError(rowId, 'verse')
    },
    [clearRowFieldError]
  )

  const handleVerseChange = useCallback(
    (rowId: string, value: string): void => {
      clearRowFieldError(rowId, 'verse')
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] =>
        prev.map(
          (row: BibleSlideRowState): BibleSlideRowState =>
            row.id === rowId && row.kind === 'phrase' ? { ...row, verse: value } : row
        )
      )
    },
    [clearRowFieldError]
  )

  const validateVerseBlur = useCallback(
    async (rowId: string): Promise<void> => {
      const row: PhraseRowState | undefined = slideRowsRef.current.find(
        (r: BibleSlideRowState): r is PhraseRowState => r.id === rowId && r.kind === 'phrase'
      )
      const cascade: RowCascadeState = rowCascadeRef.current[rowId] ?? emptyRowCascade()
      const errs: RowFieldErrors | undefined = rowFieldErrorsRef.current[rowId]
      if (row === undefined || !isChapterGateOk(row, cascade, versionOptionsRef.current, errs)) {
        return
      }
      if (row.verse.trim().length === 0) {
        setRowFieldErrorMessage(rowId, 'verse', FIELD_ERROR_EMPTY)
        return
      }
      const outcome: BiblePhraseProbeResult = await probeVerseRowAgainstGetBible(row)
      if (outcome.ok === false) {
        setRowFieldErrorMessage(
          rowId,
          'verse',
          outcome.reason === 'parse_format' ? FIELD_ERROR_VERSE_PARSE_FORMAT : FIELD_ERROR_VERSE_VALIDATE
        )
        return
      }
      clearRowFieldError(rowId, 'verse')
    },
    [clearRowFieldError, setRowFieldErrorMessage]
  )

  const handleAddPhraseRow = useCallback((): void => {
    const newRow: PhraseRowState = {
      kind: 'phrase',
      id: buildAddedPhraseRowId(bibleHydrationKey),
      version: '',
      book: '',
      chapter: '',
      verse: '',
    }
    setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] => [...prev, newRow])
    setRowCascade(
      (prev: Record<string, RowCascadeState>): Record<string, RowCascadeState> => ({
        ...prev,
        [newRow.id]: emptyRowCascade(),
      })
    )
    setComboDrafts(
      (prev: Record<string, string>): Record<string, string> => ({
        ...prev,
        [draftFieldKey(newRow.id, 'version')]: '',
        [draftFieldKey(newRow.id, 'book')]: '',
        [draftFieldKey(newRow.id, 'chapter')]: '',
      })
    )
    setReferenceSectionError(null)
  }, [bibleHydrationKey])

  const handleRemoveSlideRow = useCallback((rowId: string): void => {
    const prev: BibleSlideRowState[] = slideRowsRef.current
    const filtered: BibleSlideRowState[] = prev.filter((r: BibleSlideRowState): boolean => r.id !== rowId)
    const next: BibleSlideRowState[] = dedupeTitlesInPhraseGaps(filtered)
    const nextIdSet: Set<string> = new Set(next.map((r: BibleSlideRowState): string => r.id))
    const removedIds: string[] = prev
      .filter((r: BibleSlideRowState): boolean => !nextIdSet.has(r.id))
      .map((r: BibleSlideRowState): string => r.id)
    setSlideRows(next)
    setRowCascade((prevCascade: Record<string, RowCascadeState>): Record<string, RowCascadeState> => {
      const out: Record<string, RowCascadeState> = { ...prevCascade }
      for (const id of removedIds) {
        delete out[id]
      }
      return out
    })
    setRowFieldErrors((prevErr: Record<string, RowFieldErrors>): Record<string, RowFieldErrors> => {
      const out: Record<string, RowFieldErrors> = { ...prevErr }
      for (const id of removedIds) {
        delete out[id]
      }
      return out
    })
    setComboDrafts((prevDraft: Record<string, string>): Record<string, string> => {
      const out: Record<string, string> = { ...prevDraft }
      for (const id of removedIds) {
        delete out[draftFieldKey(id, 'version')]
        delete out[draftFieldKey(id, 'book')]
        delete out[draftFieldKey(id, 'chapter')]
      }
      return out
    })
    setCollapsedPhraseRows((prevColl: Record<string, boolean>): Record<string, boolean> => {
      const out: Record<string, boolean> = { ...prevColl }
      for (const id of removedIds) {
        delete out[id]
      }
      return out
    })
  }, [])

  const handleInsertTitleAfter = useCallback(
    (afterIndex: number): void => {
      setSlideRows((prev: BibleSlideRowState[]): BibleSlideRowState[] => {
        if (!canInsertTitleAfterRow(prev, afterIndex)) {
          return prev
        }
        const newRow: TitleSlideRowState = {
          kind: 'title',
          id: `${bibleHydrationKey}:title:new:${generateUlid()}`,
        }
        const next: BibleSlideRowState[] = [...prev]
        next.splice(afterIndex + 1, 0, newRow)
        return next
      })
      setReferenceSectionError(null)
    },
    [bibleHydrationKey]
  )

  const handleCollapsePhraseRow = useCallback((rowId: string): void => {
    setOpenComboKey(null)
    setCollapsedPhraseRows(
      (prev: Record<string, boolean>): Record<string, boolean> => ({
        ...prev,
        [rowId]: true,
      })
    )
  }, [])

  const handleExpandPhraseRow = useCallback((rowId: string): void => {
    setCollapsedPhraseRows((prev: Record<string, boolean>): Record<string, boolean> => {
      const next: Record<string, boolean> = { ...prev }
      delete next[rowId]
      return next
    })
  }, [])

  useEffect((): void => {
    if (!isOpen) {
      return
    }
    if (titleLayoutId !== null && titleLayoutId.length > 0) {
      return
    }
    const prev: BibleSlideRowState[] = slideRowsRef.current
    const next: BibleSlideRowState[] = stripTitleRowsFromSlideRows(prev)
    if (next.length === prev.length) {
      return
    }
    const nextIdSet: Set<string> = new Set(next.map((r: BibleSlideRowState): string => r.id))
    const removedIds: string[] = prev
      .filter((r: BibleSlideRowState): boolean => !nextIdSet.has(r.id))
      .map((r: BibleSlideRowState): string => r.id)
    setSlideRows(next)
    setRowCascade((prevCascade: Record<string, RowCascadeState>): Record<string, RowCascadeState> => {
      const out: Record<string, RowCascadeState> = { ...prevCascade }
      for (const id of removedIds) {
        delete out[id]
      }
      return out
    })
    setRowFieldErrors((prevErr: Record<string, RowFieldErrors>): Record<string, RowFieldErrors> => {
      const out: Record<string, RowFieldErrors> = { ...prevErr }
      for (const id of removedIds) {
        delete out[id]
      }
      return out
    })
    setComboDrafts((prevDraft: Record<string, string>): Record<string, string> => {
      const out: Record<string, string> = { ...prevDraft }
      for (const id of removedIds) {
        delete out[draftFieldKey(id, 'version')]
        delete out[draftFieldKey(id, 'book')]
        delete out[draftFieldKey(id, 'chapter')]
      }
      return out
    })
    setCollapsedPhraseRows((prevColl: Record<string, boolean>): Record<string, boolean> => {
      const out: Record<string, boolean> = { ...prevColl }
      for (const id of removedIds) {
        delete out[id]
      }
      return out
    })
    setReferenceSectionError(null)
  }, [isOpen, titleLayoutId])

  useEffect((): void => {
    setCollapsedPhraseRows((prev: Record<string, boolean>): Record<string, boolean> => {
      let changed: boolean = false
      const next: Record<string, boolean> = { ...prev }
      for (const row of slideRows) {
        if (row.kind !== 'phrase') {
          continue
        }
        if (!prev[row.id]) {
          continue
        }
        const cascade: RowCascadeState = rowCascade[row.id] ?? emptyRowCascade()
        const errs: RowFieldErrors | undefined = rowFieldErrors[row.id]
        if (!canFoldPhraseRow(row, cascade, versionOptions, errs)) {
          delete next[row.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [slideRows, rowCascade, rowFieldErrors, versionOptions])

  const handleSaveClick = useCallback(async (): Promise<void> => {
    setReferenceSectionError(null)
    const hasPhraseRow: boolean = slideRows.some((r: BibleSlideRowState): boolean => r.kind === 'phrase')
    if (!hasPhraseRow) {
      setIsSaveGatePending(true)
      try {
        onSave({ slides: [] })
      } finally {
        setIsSaveGatePending(false)
      }
      return
    }
    if (
      slideRows.some((r: BibleSlideRowState): boolean => r.kind === 'title') &&
      (titleLayoutId === null || titleLayoutId.length === 0)
    ) {
      setReferenceSectionError(TITLE_SLIDES_REQUIRE_TITLE_LAYOUT_MESSAGE)
      return
    }
    if (!hasAtMostOneTitleBetweenPhrasePairs(slideRows)) {
      setReferenceSectionError(TITLE_AT_MOST_ONE_BETWEEN_PHRASES_MESSAGE)
      return
    }
    const nextErrors: Record<string, RowFieldErrors> = {}
    const opts: BibleVersionOption[] = versionOptionsRef.current
    const syncCandidates: PhraseRowState[] = []
    for (const row of slideRows) {
      if (row.kind !== 'phrase') {
        continue
      }
      const err: RowFieldErrors = {}
      if (row.version.length === 0) {
        err.version = FIELD_ERROR_EMPTY
      } else if (!opts.some((vo: BibleVersionOption): boolean => vo.key === row.version)) {
        err.version = FIELD_ERROR_NOT_IN_LIST
      }
      const cascade: RowCascadeState = rowCascade[row.id] ?? emptyRowCascade()
      if (row.book.length === 0) {
        err.book = FIELD_ERROR_EMPTY
      } else if (!cascade.books.includes(row.book)) {
        err.book = FIELD_ERROR_NOT_IN_LIST
      }
      if (row.chapter.length === 0) {
        err.chapter = FIELD_ERROR_EMPTY
      } else {
        const chNum: number = Number.parseInt(row.chapter, 10)
        if (Number.isNaN(chNum) || !cascade.chapters.includes(chNum)) {
          err.chapter = FIELD_ERROR_NOT_IN_LIST
        }
      }
      if (row.verse.length === 0) {
        err.verse = FIELD_ERROR_EMPTY
      } else if (Number.isNaN(verseStringToPayloadVerseInt(row.verse))) {
        err.verse = FIELD_ERROR_VERSE_PARSE_FORMAT
      }
      if (Object.keys(err).length > 0) {
        nextErrors[row.id] = err
        continue
      }
      syncCandidates.push(row)
    }
    if (Object.keys(nextErrors).length > 0) {
      setRowFieldErrors(nextErrors)
      return
    }
    setIsSaveGatePending(true)
    try {
      const verseOutcomes: BiblePhraseProbeResult[] = await Promise.all(
        syncCandidates.map((row: PhraseRowState): Promise<BiblePhraseProbeResult> => probeVerseRowAgainstGetBible(row))
      )
      const verseErrors: Record<string, RowFieldErrors> = {}
      let failed: boolean = false
      syncCandidates.forEach((row: PhraseRowState, i: number): void => {
        const outcome: BiblePhraseProbeResult = verseOutcomes[i]!
        if (outcome.ok === false) {
          failed = true
          verseErrors[row.id] = {
            ...(verseErrors[row.id] ?? {}),
            verse: outcome.reason === 'parse_format' ? FIELD_ERROR_VERSE_PARSE_FORMAT : FIELD_ERROR_VERSE_VALIDATE,
          }
        }
      })
      if (failed) {
        setRowFieldErrors(
          (prev: Record<string, RowFieldErrors>): Record<string, RowFieldErrors> => ({
            ...prev,
            ...verseErrors,
          })
        )
        return
      }
      setRowFieldErrors({})
      const phraseRefById: Map<string, BibleVerseReference> = new Map()
      syncCandidates.forEach((row: PhraseRowState): void => {
        const verseInt: number = verseStringToPayloadVerseInt(row.verse)
        phraseRefById.set(row.id, {
          version: row.version,
          book: row.book,
          chapter: Number.parseInt(row.chapter, 10),
          verse: verseInt,
        })
      })
      const slides: BibleSlideRange[] = []
      for (const row of slideRows) {
        if (row.kind === 'phrase') {
          const ref: BibleVerseReference | undefined = phraseRefById.get(row.id)
          if (ref === undefined) {
            continue
          }
          slides.push({ slideType: 'phrase', start: ref })
          continue
        }
        const anchor: BibleVerseReference | null = resolveTitleSlideAnchor(slideRows, row.id, phraseRefById)
        if (anchor === null) {
          setReferenceSectionError(TITLE_SLIDE_NEEDS_ADJACENT_PHRASE_MESSAGE)
          return
        }
        slides.push({ slideType: 'title', start: anchor })
      }
      onSave({ slides })
    } finally {
      setIsSaveGatePending(false)
    }
  }, [slideRows, rowCascade, onSave, titleLayoutId])

  const saveDisabled: boolean = isSaveDisabled || isSaving || isSaveGatePending

  const showTitleInsert: boolean = titleLayoutId !== null && titleLayoutId.length > 0

  if (!isOpen) {
    return null
  }

  return (
    <aside
      ref={ref}
      className="relative z-20 flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden border-t border-neutral-200/90 bg-white sm:h-full sm:max-h-none sm:w-[min(100%,18rem)] sm:rounded-2xl sm:border-t-0 sm:border-l sm:border-black/[0.06] dark:border-white/[0.08] dark:bg-[#1c1c1e] sm:dark:border-white/[0.08]"
      aria-label="Edit Bible part"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Edit part</h2>
          <p className="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{partHeading}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-black/[0.1] bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 transition outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-200 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
          onClick={onClose}
          aria-label="Close part editor"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {emptyStateMessage !== null ? (
          <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-400" role="status">
            {emptyStateMessage}
          </p>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <TemplateLayoutGalleryPicker
              layoutFieldLabel={PHRASE_LAYOUT_FIELD_LABEL}
              menuId={BIBLE_EDIT_PHRASE_LAYOUT_PALETTE_MENU_ID}
              layoutChoices={layoutChoices}
              selectedLayoutId={phraseLayoutId}
              onSelectLayout={handlePhraseLayoutFromGallery}
              showNoneChoiceInGallery={false}
            />
            <TemplateLayoutGalleryPicker
              layoutFieldLabel={TITLE_LAYOUT_FIELD_LABEL}
              menuId={BIBLE_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID}
              layoutChoices={layoutChoices}
              selectedLayoutId={titleLayoutId}
              onSelectLayout={handleTitleLayoutFromGallery}
              showNoneChoiceInGallery
              noneChoiceTileLabel="No title layout"
            />
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                {REFERENCE_SECTION_LABEL}
              </p>
              {referenceSectionError !== null ? (
                <p className="mt-1.5 text-[10px] text-red-600 dark:text-red-400" role="alert">
                  {referenceSectionError}
                </p>
              ) : null}
              <div className="mt-2 flex flex-col gap-4">
                {slideRows.map((row: BibleSlideRowState, index: number): ReactElement => {
                  const phraseOrdinal: number = slideRows
                    .slice(0, index + 1)
                    .filter((r: BibleSlideRowState): boolean => r.kind === 'phrase').length
                  if (row.kind === 'title') {
                    return (
                      <Fragment key={row.id}>
                        <div className="rounded-xl border border-dashed border-black/[0.12] bg-white/60 px-3 py-2.5 dark:border-white/[0.12] dark:bg-white/[0.03]">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                              {TITLE_SLIDE_CARD_LABEL}
                            </p>
                            <button
                              type="button"
                              className="shrink-0 rounded-md border border-black/[0.1] bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-300 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                              onClick={(): void => {
                                handleRemoveSlideRow(row.id)
                              }}
                              disabled={isSaving}
                              aria-label={`${REMOVE_PHRASE_LABEL} title slide`}
                            >
                              {REMOVE_PHRASE_LABEL}
                            </button>
                          </div>
                        </div>
                        {showTitleInsert && canInsertTitleAfterRow(slideRows, index) ? (
                          <button
                            type="button"
                            className="self-start rounded-md border border-black/[0.06] bg-transparent px-2 py-1 text-[10px] font-medium text-neutral-600 transition outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                            onClick={(): void => {
                              handleInsertTitleAfter(index)
                            }}
                            disabled={isSaving}
                          >
                            {INSERT_TITLE_SLIDE_LABEL}
                          </button>
                        ) : null}
                      </Fragment>
                    )
                  }
                  const cascade: RowCascadeState = rowCascade[row.id] ?? emptyRowCascade()
                  const errs: RowFieldErrors = rowFieldErrors[row.id] ?? {}
                  const versionInputId: string = `${row.id}-version`
                  const bookInputId: string = `${row.id}-book`
                  const chapterInputId: string = `${row.id}-chapter`
                  const verseInputId: string = `${row.id}-verse`
                  const versionComboKey: string = draftFieldKey(row.id, 'version')
                  const bookComboKey: string = draftFieldKey(row.id, 'book')
                  const chapterComboKey: string = draftFieldKey(row.id, 'chapter')
                  const versionDraft: string = comboDrafts[versionComboKey] ?? ''
                  const bookDraft: string = comboDrafts[bookComboKey] ?? ''
                  const chapterDraft: string = comboDrafts[chapterComboKey] ?? ''
                  const versionSuggestions: BibleVersionOption[] = filterVersionOptions(versionDraft, versionOptions)
                  const bookSuggestions: string[] = filterBookMatches(bookDraft, cascade.books)
                  const chapterSuggestions: number[] = filterChapterMatches(chapterDraft, cascade.chapters)
                  const versionDisabled: boolean = isSaving || versionOptions.length === 0
                  const bookDisabled: boolean = isSaving || !isVersionGateOk(row, versionOptions, errs)
                  const chapterDisabled: boolean = isSaving || !isBookGateOk(row, cascade, versionOptions, errs)
                  const verseDisabled: boolean = isSaving || !isChapterGateOk(row, cascade, versionOptions, errs)
                  const activeComboForRow: boolean =
                    openComboKey === versionComboKey ||
                    openComboKey === bookComboKey ||
                    openComboKey === chapterComboKey
                  const isCollapsed: boolean = collapsedPhraseRows[row.id] === true
                  const canFold: boolean = canFoldPhraseRow(row, cascade, versionOptions, errs)
                  const showCollapsed: boolean = isCollapsed && canFold
                  const phrasePreviewText: string = buildPhrasePreviewText(row, versionOptions)
                  if (showCollapsed) {
                    return (
                      <Fragment key={row.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-left text-[12px] text-neutral-800 transition outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                          onClick={(): void => {
                            handleExpandPhraseRow(row.id)
                          }}
                          disabled={isSaving}
                          aria-label={`Phrase ${String(phraseOrdinal)}: ${phrasePreviewText}. Click to edit.`}
                        >
                          <span className="block truncate text-neutral-800 dark:text-neutral-100">
                            {phrasePreviewText}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-neutral-500 dark:text-neutral-400">
                            Click to edit
                          </span>
                        </button>
                        {showTitleInsert && canInsertTitleAfterRow(slideRows, index) ? (
                          <button
                            type="button"
                            className="self-start rounded-md border border-black/[0.06] bg-transparent px-2 py-1 text-[10px] font-medium text-neutral-600 transition outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                            onClick={(): void => {
                              handleInsertTitleAfter(index)
                            }}
                            disabled={isSaving}
                          >
                            {INSERT_TITLE_SLIDE_LABEL}
                          </button>
                        ) : null}
                      </Fragment>
                    )
                  }
                  return (
                    <Fragment key={row.id}>
                      <div className="rounded-xl border border-black/[0.06] bg-neutral-50/80 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                        <div className="-mx-3 -mt-3 flex min-h-7 items-stretch gap-2 px-3 pt-2">
                          {canFold ? (
                            <button
                              type="button"
                              className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-left text-[11px] font-semibold text-neutral-700 shadow-none ring-0 outline-none hover:bg-transparent focus:bg-transparent focus:ring-0 focus:outline-none focus-visible:bg-transparent focus-visible:ring-0 focus-visible:outline-none active:bg-transparent disabled:opacity-50 dark:text-neutral-200"
                              onClick={(): void => {
                                handleCollapsePhraseRow(row.id)
                              }}
                              disabled={isSaving}
                              aria-expanded={true}
                              aria-label={`Collapse phrase ${String(phraseOrdinal)}`}
                            >
                              <span className="flex min-h-7 items-center">Phrase {String(phraseOrdinal)}</span>
                            </button>
                          ) : (
                            <p className="flex min-h-7 min-w-0 flex-1 items-center text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                              Phrase {String(phraseOrdinal)}
                            </p>
                          )}
                          <button
                            type="button"
                            className="shrink-0 self-center rounded-md border border-black/[0.1] bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-300 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                            onClick={(): void => {
                              handleRemoveSlideRow(row.id)
                            }}
                            disabled={isSaving}
                            aria-label={`${REMOVE_PHRASE_LABEL} phrase ${String(phraseOrdinal)}`}
                          >
                            {REMOVE_PHRASE_LABEL}
                          </button>
                        </div>
                        <div
                          ref={(el: HTMLDivElement | null): void => {
                            if (activeComboForRow) {
                              openComboAnchorRef.current = el
                            } else if (openComboAnchorRef.current === el) {
                              openComboAnchorRef.current = null
                            }
                          }}
                          className="relative mt-2 flex flex-col gap-3"
                        >
                          <div className="relative">
                            <label
                              htmlFor={versionInputId}
                              className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                            >
                              {VERSION_LABEL}
                            </label>
                            <input
                              id={versionInputId}
                              type="search"
                              autoComplete="off"
                              value={versionDraft}
                              placeholder={CHOOSE_PLACEHOLDER}
                              disabled={versionDisabled}
                              className={errs.version !== undefined ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS}
                              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                clearRowFieldError(row.id, 'version')
                                setComboDrafts(
                                  (prev: Record<string, string>): Record<string, string> => ({
                                    ...prev,
                                    [versionComboKey]: event.target.value,
                                  })
                                )
                              }}
                              onFocus={(event: FocusEvent<HTMLInputElement>): void => {
                                openComboInputRef.current = event.currentTarget
                                setOpenComboKey(versionComboKey)
                              }}
                              onBlur={(event: FocusEvent<HTMLInputElement>): void => {
                                window.setTimeout((): void => {
                                  commitVersionFromDraft(row.id, event.target.value)
                                }, 0)
                              }}
                            />
                            {openComboKey === versionComboKey && !versionDisabled && fixedComboRect !== null
                              ? createPortal(
                                  <div
                                    ref={(el: HTMLDivElement | null): void => {
                                      openComboDropdownRef.current = el
                                    }}
                                    role="listbox"
                                    className={COMBO_LIST_PORTAL_CLASS}
                                    style={{
                                      top: fixedComboRect.top,
                                      left: fixedComboRect.left,
                                      width: fixedComboRect.width,
                                      zIndex: COMBO_LIST_PORTAL_Z_INDEX,
                                    }}
                                  >
                                    {versionSuggestions.length === 0 ? (
                                      <div className={COMBO_LIST_STATUS_HINT_CLASS} role="status">
                                        {versionOptions.length === 0
                                          ? VERSION_COMBO_EMPTY_MESSAGE
                                          : VERSION_COMBO_NO_MATCHES_MESSAGE}
                                      </div>
                                    ) : (
                                      versionSuggestions.map(
                                        (vo: BibleVersionOption): ReactElement => (
                                          <button
                                            key={vo.key}
                                            type="button"
                                            role="option"
                                            className={COMBO_LIST_ITEM_CLASS}
                                            onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>): void => {
                                              event.preventDefault()
                                              pickVersionOption(row.id, vo)
                                            }}
                                          >
                                            {vo.label}
                                          </button>
                                        )
                                      )
                                    )}
                                  </div>,
                                  document.body
                                )
                              : null}
                            {errs.version !== undefined ? (
                              <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400" role="alert">
                                {errs.version}
                              </p>
                            ) : null}
                          </div>
                          <div className="relative">
                            <label
                              htmlFor={bookInputId}
                              className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                            >
                              {BOOK_LABEL}
                            </label>
                            <input
                              id={bookInputId}
                              type="search"
                              autoComplete="off"
                              value={bookDraft}
                              placeholder={cascade.booksLoading ? LOADING_OPTIONS_LABEL : CHOOSE_PLACEHOLDER}
                              disabled={bookDisabled}
                              className={errs.book !== undefined ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS}
                              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                clearRowFieldError(row.id, 'book')
                                setComboDrafts(
                                  (prev: Record<string, string>): Record<string, string> => ({
                                    ...prev,
                                    [bookComboKey]: event.target.value,
                                  })
                                )
                              }}
                              onFocus={(event: FocusEvent<HTMLInputElement>): void => {
                                openComboInputRef.current = event.currentTarget
                                ensureBooksLoadedForRow(row.id)
                                setOpenComboKey(bookComboKey)
                              }}
                              onBlur={(event: FocusEvent<HTMLInputElement>): void => {
                                window.setTimeout((): void => {
                                  commitBookFromDraft(row.id, event.target.value)
                                }, 0)
                              }}
                            />
                            {openComboKey === bookComboKey && !bookDisabled && fixedComboRect !== null
                              ? createPortal(
                                  <div
                                    ref={(el: HTMLDivElement | null): void => {
                                      openComboDropdownRef.current = el
                                    }}
                                    role="listbox"
                                    className={COMBO_LIST_PORTAL_CLASS}
                                    style={{
                                      top: fixedComboRect.top,
                                      left: fixedComboRect.left,
                                      width: fixedComboRect.width,
                                      zIndex: COMBO_LIST_PORTAL_Z_INDEX,
                                    }}
                                  >
                                    {bookSuggestions.length === 0 ? (
                                      <div className={COMBO_LIST_STATUS_HINT_CLASS} role="status">
                                        {cascade.booksLoading
                                          ? LOADING_OPTIONS_LABEL
                                          : cascade.books.length === 0
                                            ? BOOK_COMBO_EMPTY_CATALOG_MESSAGE
                                            : BOOK_COMBO_NO_MATCHES_MESSAGE}
                                      </div>
                                    ) : (
                                      bookSuggestions.map(
                                        (b: string): ReactElement => (
                                          <button
                                            key={b}
                                            type="button"
                                            role="option"
                                            className={COMBO_LIST_ITEM_CLASS}
                                            onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>): void => {
                                              event.preventDefault()
                                              pickBookOption(row.id, b)
                                            }}
                                          >
                                            {b}
                                          </button>
                                        )
                                      )
                                    )}
                                  </div>,
                                  document.body
                                )
                              : null}
                            {errs.book !== undefined ? (
                              <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400" role="alert">
                                {errs.book}
                              </p>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <label
                                htmlFor={chapterInputId}
                                className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                              >
                                {CHAPTER_LABEL}
                              </label>
                              <input
                                id={chapterInputId}
                                type="search"
                                inputMode="numeric"
                                autoComplete="off"
                                value={chapterDraft}
                                placeholder={cascade.chaptersLoading ? LOADING_OPTIONS_LABEL : CHOOSE_PLACEHOLDER}
                                disabled={chapterDisabled}
                                className={errs.chapter !== undefined ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS}
                                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                  clearRowFieldError(row.id, 'chapter')
                                  setComboDrafts(
                                    (prev: Record<string, string>): Record<string, string> => ({
                                      ...prev,
                                      [chapterComboKey]: event.target.value,
                                    })
                                  )
                                }}
                                onFocus={(event: FocusEvent<HTMLInputElement>): void => {
                                  openComboInputRef.current = event.currentTarget
                                  setOpenComboKey(chapterComboKey)
                                }}
                                onBlur={(event: FocusEvent<HTMLInputElement>): void => {
                                  window.setTimeout((): void => {
                                    commitChapterFromDraft(row.id, event.target.value)
                                  }, 0)
                                }}
                              />
                              {openComboKey === chapterComboKey && !chapterDisabled && fixedComboRect !== null
                                ? createPortal(
                                    <div
                                      ref={(el: HTMLDivElement | null): void => {
                                        openComboDropdownRef.current = el
                                      }}
                                      role="listbox"
                                      className={COMBO_LIST_PORTAL_CLASS}
                                      style={{
                                        top: fixedComboRect.top,
                                        left: fixedComboRect.left,
                                        width: fixedComboRect.width,
                                        zIndex: COMBO_LIST_PORTAL_Z_INDEX,
                                      }}
                                    >
                                      {chapterSuggestions.length === 0 ? (
                                        <div className={COMBO_LIST_STATUS_HINT_CLASS} role="status">
                                          {cascade.chaptersLoading
                                            ? LOADING_OPTIONS_LABEL
                                            : cascade.chapters.length === 0
                                              ? CHAPTER_COMBO_EMPTY_CATALOG_MESSAGE
                                              : CHAPTER_COMBO_NO_MATCHES_MESSAGE}
                                        </div>
                                      ) : (
                                        chapterSuggestions.map(
                                          (c: number): ReactElement => (
                                            <button
                                              key={String(c)}
                                              type="button"
                                              role="option"
                                              className={COMBO_LIST_ITEM_CLASS}
                                              onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>): void => {
                                                event.preventDefault()
                                                pickChapterOption(row.id, c)
                                              }}
                                            >
                                              {String(c)}
                                            </button>
                                          )
                                        )
                                      )}
                                    </div>,
                                    document.body
                                  )
                                : null}
                              {errs.chapter !== undefined ? (
                                <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400" role="alert">
                                  {errs.chapter}
                                </p>
                              ) : null}
                            </div>
                            <div>
                              <label
                                htmlFor={verseInputId}
                                className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                              >
                                {VERSE_LABEL}
                              </label>
                              <input
                                id={verseInputId}
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                value={row.verse}
                                placeholder={CHOOSE_PLACEHOLDER}
                                disabled={verseDisabled}
                                className={errs.verse !== undefined ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS}
                                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                  handleVerseChange(row.id, event.target.value)
                                }}
                                onBlur={(): void => {
                                  void validateVerseBlur(row.id)
                                }}
                              />
                              {errs.verse !== undefined ? (
                                <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400" role="alert">
                                  {errs.verse}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                      {showTitleInsert && canInsertTitleAfterRow(slideRows, index) ? (
                        <button
                          type="button"
                          className="self-start rounded-md border border-black/[0.06] bg-transparent px-2 py-1 text-[10px] font-medium text-neutral-600 transition outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                          onClick={(): void => {
                            handleInsertTitleAfter(index)
                          }}
                          disabled={isSaving}
                        >
                          {INSERT_TITLE_SLIDE_LABEL}
                        </button>
                      ) : null}
                    </Fragment>
                  )
                })}
                <button
                  type="button"
                  className="self-start rounded-md border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-800 transition outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                  onClick={handleAddPhraseRow}
                  disabled={isSaving}
                >
                  {ADD_PHRASE_LABEL}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 border-t border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
        <button
          type="button"
          className="rounded-md border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-800 transition outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md border border-[#0071e3]/40 bg-[#0071e3] px-2.5 py-1 text-[11px] font-medium text-white transition outline-none hover:bg-[#0066cf] focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#0a84ff]/50 dark:bg-[#0a84ff] dark:hover:bg-[#0990ff] dark:focus-visible:ring-[#0a84ff]"
          onClick={handleSaveClick}
          disabled={saveDisabled}
        >
          {isSaving ? SAVE_BUTTON_SAVING_LABEL : SAVE_BUTTON_LABEL}
        </button>
      </div>
    </aside>
  )
})
