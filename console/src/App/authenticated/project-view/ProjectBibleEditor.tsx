import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { GripVerticalIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { bibleProbeDetailToI18nKey, probeBibleReference } from '@/api/bible-reference-probe'
import { useBibleBooks, useBibleChapters } from '@/api/query/bible.query'
import { TemplateLayoutSlide } from '@/App/authenticated/template/components/TemplateLayoutSlide'
import { Button } from '@/components/ui/button/Button'
import { type AvailableBibleVersion, AvailableBibleVersionsTypes } from '@/domain/enums/project'
import type { Layout, Shape } from '@/domain/models/powerpoint'
import type { BiblePart } from '@/domain/models/project'
import type { Size } from '@/domain/valueobjects/powerpoint'
import type { BibleContent, BibleContentRange } from '@/domain/valueobjects/project'
import { cn, LAYOUT_SELECTION_ACTIVE_CHROME } from '@/lib/utils'

import type { DragEvent, ReactElement } from 'react'

const MIME_BIBLE_CARD_REORDER: string = 'application/x-chat-ppt-bible-card-reorder'

const ALL_BIBLE_VERSIONS: readonly AvailableBibleVersion[] = Object.values(AvailableBibleVersionsTypes)

export interface ProjectBibleEditorProps {
  readonly layouts: readonly Layout[]
  readonly fallbackSlideSize: Size
  readonly part: BiblePart
  /** True while any phrase card shows validation/probe/API errors (sidebar incomplete + export guard). */
  readonly onBlockingUiChange?: (blocking: boolean) => void
  readonly onCommit: (next: BiblePart) => void
}

interface BibleTitleEditorRow {
  readonly rowType: 'title'
  readonly titleStart: BibleContent
}

interface BiblePhraseEditorRow {
  readonly rowType: 'phrase'
  /** Raw input; must match a known version string to load books/chapters and to save. */
  version: string
  book: string
  /** Raw input; parsed as a positive integer when saving. */
  chapterInput: string
  verseInput: string
}

type BibleEditorRow = BibleTitleEditorRow | BiblePhraseEditorRow

function sortedPlaceholderShapes(layout: Layout): Shape[] {
  return layout.shapes
    .filter((s: Shape): boolean => s.placeholder)
    .sort((a: Shape, b: Shape): number => {
      const dy: number = a.position.y - b.position.y
      if (dy !== 0) {
        return dy
      }
      return a.position.x - b.position.x
    })
}

function layoutPlaceholderCount(layout: Layout): number {
  return sortedPlaceholderShapes(layout).length
}

function normalizeVersionInput(raw: string): AvailableBibleVersion | null {
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

function emptyPhraseRow(): BiblePhraseEditorRow {
  return {
    rowType: 'phrase',
    version: '',
    book: '',
    chapterInput: '',
    verseInput: '',
  }
}

function formatVerseInput(start: BibleContent, end: BibleContent | null | undefined): string {
  if (end === null || end === undefined) {
    return String(start.verse)
  }
  if (start.book === end.book && start.chapter === end.chapter && start.version === end.version) {
    return `${String(start.verse)}-${String(end.verse)}`
  }
  return `${String(start.verse)}-${String(end.verse)}`
}

function rangesToRows(contents: readonly BibleContentRange[] | undefined): BibleEditorRow[] {
  const list: BibleContentRange[] = contents ?? []
  if (list.length === 0) {
    return [emptyPhraseRow()]
  }
  return list.map(
    (r: BibleContentRange): BibleEditorRow =>
      r.type === 'title'
        ? { rowType: 'title', titleStart: { ...r.start } }
        : {
            rowType: 'phrase',
            version: r.start.version,
            book: r.start.book,
            chapterInput: String(r.start.chapter),
            verseInput:
              r.start.verse === 0 ? '' : formatVerseInput(r.start, r.end),
          }
  )
}

/**
 * Parses a single verse or hyphen/tilde range (`3`, `3-5`, `3~5`). Comma lists are rejected (use another card).
 */
function parseVerseRangeString(raw: string): { readonly from: number; readonly to: number | null } | null {
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

function phraseRowToRange(row: BiblePhraseEditorRow): BibleContentRange | null {
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
    parsed.to === null
      ? null
      : { version: versionResolved, book: bookTrim, chapter: chapterParsed, verse: parsed.to }
  return { type: 'phrase', start, end }
}

/**
 * Client-only sentinel: verse `0` means "no verse entered yet" (empty `verseInput` / invalid draft).
 * Not a real Bible verse; export/readiness treats it as incomplete.
 */
const DRAFT_VERSE_EMPTY: number = 0

/**
 * Valid version, book, chapter with an explicitly empty verse field — persist empty verse instead of
 * falling back to the previous saved phrase.
 */
function phraseRowAlmostValidExceptEmptyVerse(row: BiblePhraseEditorRow): BibleContentRange | null {
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
function phraseRowToPersistedDraft(row: BiblePhraseEditorRow): BibleContentRange {
  const vFallback: AvailableBibleVersion =
    normalizeVersionInput(row.version) ?? AvailableBibleVersionsTypes.NIV
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
    parsed.to === null
      ? null
      : { version: vFallback, book: bookTrim, chapter, verse: parsed.to }
  return { type: 'phrase', start, end }
}

/**
 * Builds ranges for PATCH: valid phrase rows serialize fully; drafts persist from the field model
 * (cleared verse stays empty via verse sentinel 0).
 */
function rowsToRangesForCommit(rows: readonly BibleEditorRow[]): BibleContentRange[] {
  const out: BibleContentRange[] = []
  for (const row of rows) {
    if (row.rowType === 'title') {
      out.push({ type: 'title', start: { ...row.titleStart }, end: null })
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

function countPhrases(rows: readonly BibleEditorRow[]): number {
  let n: number = 0
  for (const row of rows) {
    if (row.rowType === 'phrase') {
      n++
    }
  }
  return n
}

function resolveTitleAnchor(rows: readonly BibleEditorRow[], afterIndex: number): BibleContent {
  for (let j: number = afterIndex + 1; j < rows.length; j++) {
    const row: BibleEditorRow | undefined = rows[j]
    if (row !== undefined && row.rowType === 'phrase') {
      const g: BibleContentRange | null = phraseRowToRange(row)
      if (g !== null) {
        return { ...g.start }
      }
      const v: AvailableBibleVersion | null = normalizeVersionInput(row.version)
      const ch: number = Number.parseInt(row.chapterInput.trim(), 10)
      return {
        version: v ?? AvailableBibleVersionsTypes.NIV,
        book: row.book.trim().length > 0 ? row.book.trim() : '',
        chapter: Number.isInteger(ch) && ch > 0 ? ch : 1,
        verse: 1,
      }
    }
  }
  for (let j: number = afterIndex; j >= 0; j--) {
    const row: BibleEditorRow | undefined = rows[j]
    if (row !== undefined && row.rowType === 'phrase') {
      const g: BibleContentRange | null = phraseRowToRange(row)
      if (g !== null) {
        return { ...g.start }
      }
      const v: AvailableBibleVersion | null = normalizeVersionInput(row.version)
      const ch: number = Number.parseInt(row.chapterInput.trim(), 10)
      return {
        version: v ?? AvailableBibleVersionsTypes.NIV,
        book: row.book.trim().length > 0 ? row.book.trim() : '',
        chapter: Number.isInteger(ch) && ch > 0 ? ch : 1,
        verse: 1,
      }
    }
  }
  return {
    version: AvailableBibleVersionsTypes.NIV,
    book: '',
    chapter: 1,
    verse: 1,
  }
}

interface BibleComboboxFieldProps {
  readonly value: string
  readonly onChange: (next: string) => void
  readonly suggestions: readonly string[]
  readonly placeholder: string
  readonly disabled?: boolean
  readonly 'aria-label': string
  readonly invalid?: boolean
}

function BibleComboboxField({
  value,
  onChange,
  suggestions,
  placeholder,
  disabled = false,
  'aria-label': ariaLabel,
  invalid = false,
}: BibleComboboxFieldProps): ReactElement {
  const [open, setOpen] = React.useState<boolean>(false)
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtered: string[] = React.useMemo((): string[] => {
    const q: string = value.trim().toLowerCase()
    const maxItems: number = 50
    if (q.length === 0) {
      return [...suggestions].slice(0, maxItems)
    }
    return suggestions.filter((s: string): boolean => s.toLowerCase().includes(q)).slice(0, maxItems)
  }, [suggestions, value])

  React.useEffect((): (() => void) => {
    return (): void => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const showList: boolean = !disabled && open && filtered.length > 0

  return (
    <div className="relative min-w-0">
      <input
        type="text"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showList}
        autoComplete="off"
        spellCheck={false}
        onPointerDown={(ev: React.PointerEvent<HTMLInputElement>): void => {
          ev.stopPropagation()
        }}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
          onChange(ev.target.value)
        }}
        onFocus={(): void => {
          if (disabled) {
            return
          }
          if (blurTimeoutRef.current !== null) {
            window.clearTimeout(blurTimeoutRef.current)
            blurTimeoutRef.current = null
          }
          setOpen(true)
        }}
        onBlur={(): void => {
          if (blurTimeoutRef.current !== null) {
            window.clearTimeout(blurTimeoutRef.current)
          }
          blurTimeoutRef.current = window.setTimeout((): void => {
            setOpen(false)
            blurTimeoutRef.current = null
          }, 150)
        }}
        className={cn(
          'border-input bg-background text-foreground w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2',
          disabled && 'cursor-not-allowed opacity-50',
          invalid && 'border-destructive/80'
        )}
        placeholder={placeholder}
      />
      {showList ? (
        <ul
          className="border-border bg-background scrollbar-hide absolute z-30 mt-1 max-h-48 w-full min-w-0 overflow-y-auto rounded-md border py-1 shadow-md"
          role="listbox"
        >
          {filtered.map((item: string, itemIndex: number): ReactElement => (
            <li key={`${item}-${String(itemIndex)}`} role="option">
              <button
                type="button"
                className="hover:bg-muted/80 focus:bg-muted/80 w-full px-2 py-1.5 text-left text-sm outline-none"
                onMouseDown={(ev: React.MouseEvent<HTMLButtonElement>): void => {
                  ev.preventDefault()
                  onChange(item)
                  setOpen(false)
                }}
              >
                <span className="block min-w-0 truncate">{item}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

type BibleReferenceProbeUi =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }

interface BiblePhraseCardProps {
  readonly index: number
  readonly row: BiblePhraseEditorRow
  readonly phraseOrdinal: number
  readonly canRemovePhrase: boolean
  readonly showInsertTitleBelow: boolean
  readonly onPatch: (patch: Partial<BiblePhraseEditorRow>) => void
  readonly onRemove: () => void
  readonly onInsertTitleBelow: () => void
  readonly registerBlocking: (
    cardId: string,
    blocking: boolean,
    options?: { readonly fromUnmount?: boolean }
  ) => void
}

function BiblePhraseCard({
  index,
  row,
  phraseOrdinal,
  canRemovePhrase,
  showInsertTitleBelow,
  onPatch,
  onRemove,
  onInsertTitleBelow,
  registerBlocking,
}: BiblePhraseCardProps): ReactElement {
  const { t } = useTranslation()
  const versionResolved: AvailableBibleVersion | null = normalizeVersionInput(row.version)
  const booksQuery = useBibleBooks(versionResolved)
  const chaptersQuery = useBibleChapters(
    versionResolved,
    row.book.trim().length > 0 ? row.book.trim() : null
  )

  const chapterOptions: number[] = React.useMemo((): number[] => chaptersQuery.data ?? [], [chaptersQuery.data])
  const chapterSuggestions: string[] = React.useMemo(
    (): string[] => chapterOptions.map((n: number): string => String(n)),
    [chapterOptions]
  )

  const books: string[] = booksQuery.data ?? []

  const verseFieldInvalid: boolean =
    row.verseInput.trim().length > 0 && parseVerseRangeString(row.verseInput) === null

  const [referenceProbe, setReferenceProbe] = React.useState<BibleReferenceProbeUi>({ status: 'idle' })
  const probeSeqRef = React.useRef<number>(0)

  React.useEffect((): void | (() => void) => {
    if (phraseRowToRange(row) === null) {
      probeSeqRef.current += 1
      queueMicrotask((): void => {
        setReferenceProbe({ status: 'idle' })
      })
      return (): void => {}
    }

    const ac: AbortController = new AbortController()
    const seq: number = ++probeSeqRef.current
    queueMicrotask((): void => {
      setReferenceProbe({ status: 'loading' })
    })

    const tid: ReturnType<typeof setTimeout> = window.setTimeout((): void => {
      void (async (): Promise<void> => {
        if (phraseRowToRange(row) === null) {
          return
        }
        const vRes: AvailableBibleVersion | null = normalizeVersionInput(row.version)
        if (vRes === null) {
          return
        }
        try {
          const result = await probeBibleReference(
            vRes,
            row.book.trim(),
            row.chapterInput.trim(),
            row.verseInput.trim(),
            ac.signal
          )
          if (ac.signal.aborted || seq !== probeSeqRef.current) {
            return
          }
          if (result.kind === 'ok') {
            setReferenceProbe({ status: 'idle' })
            return
          }
          const i18nSuffix: string = bibleProbeDetailToI18nKey(result.detail)
          const fullKey: string = `page.project_view.${i18nSuffix}`
          const message: string =
            i18nSuffix === 'bible_probe_generic'
              ? t(fullKey, { detail: result.detail })
              : t(fullKey)
          setReferenceProbe({ status: 'error', message })
        } catch (err: unknown) {
          if (ac.signal.aborted || seq !== probeSeqRef.current) {
            return
          }
          if (err instanceof DOMException && err.name === 'AbortError') {
            return
          }
          setReferenceProbe({
            status: 'error',
            message: t('page.project_view.bible_probe_network'),
          })
        }
      })()
    }, 300)

    return (): void => {
      ac.abort()
      window.clearTimeout(tid)
    }
    // phraseRowToRange(row) only depends on these primitives; full `row` identity churns each parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primitive fields fingerprint phrase probe inputs
  }, [row.version, row.book, row.chapterInput, row.verseInput, t])

  const cardInstanceId: string = React.useId()
  const cardBlocks: boolean =
    verseFieldInvalid ||
    booksQuery.isError ||
    chaptersQuery.isError ||
    referenceProbe.status === 'error'

  React.useEffect((): void | (() => void) => {
    registerBlocking(cardInstanceId, cardBlocks)
    return (): void => {
      registerBlocking(cardInstanceId, false, { fromUnmount: true })
    }
  }, [cardBlocks, cardInstanceId, registerBlocking])

  return (
    <div
      className={cn(
        'border-border/60 flex flex-col gap-2 rounded-lg border p-3 transition-shadow'
      )}
    >
      <div className="flex items-start gap-1">
        <div
          draggable
          role="button"
          tabIndex={0}
          aria-label={t('page.project_view.bible_card_reorder_aria')}
          className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab p-0.5 active:cursor-grabbing"
          onDragStart={(e: DragEvent<HTMLDivElement>): void => {
            e.dataTransfer.setData(MIME_BIBLE_CARD_REORDER, String(index))
            e.dataTransfer.effectAllowed = 'move'
          }}
        >
          <GripVerticalIcon aria-hidden className="size-4 shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground m-0 text-sm font-medium">
            {t('page.project_view.bible_phrase_card_label', { index: String(phraseOrdinal) })}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t('page.project_view.bible_version')}</span>
              <BibleComboboxField
                value={row.version}
                suggestions={ALL_BIBLE_VERSIONS}
                placeholder={t('page.project_view.bible_version_placeholder')}
                aria-label={t('page.project_view.bible_version')}
                onChange={(next: string): void => {
                  onPatch({ version: next })
                }}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-0.5 sm:col-span-2">
              <span className="text-muted-foreground text-xs">{t('page.project_view.bible_book')}</span>
              <BibleComboboxField
                value={row.book}
                suggestions={books}
                placeholder={t('page.project_view.bible_book_placeholder')}
                aria-label={t('page.project_view.bible_book')}
                onChange={(next: string): void => {
                  onPatch({ book: next })
                }}
              />
              {booksQuery.isError ? (
                <span className="text-destructive text-xs">{t('page.project_view.bible_books_error')}</span>
              ) : null}
            </label>
            <label className="flex min-w-0 flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{t('page.project_view.bible_chapter')}</span>
              <BibleComboboxField
                value={row.chapterInput}
                suggestions={chapterSuggestions}
                placeholder={t('page.project_view.bible_chapter_placeholder')}
                aria-label={t('page.project_view.bible_chapter')}
                onChange={(next: string): void => {
                  onPatch({ chapterInput: next })
                }}
              />
            </label>
            <div className="flex min-w-0 flex-col gap-0.5 sm:col-span-2">
              <span className="text-muted-foreground text-xs">{t('page.project_view.bible_verse')}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('page.project_view.bible_verse_placeholder')}
                aria-label={t('page.project_view.bible_verse')}
                spellCheck={false}
                onPointerDown={(ev: React.PointerEvent<HTMLInputElement>): void => {
                  ev.stopPropagation()
                }}
                className={cn(
                  'border-input bg-background text-foreground w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2',
                  verseFieldInvalid ? 'border-destructive/80' : ''
                )}
                value={row.verseInput}
                onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                  onPatch({ verseInput: ev.target.value })
                }}
              />
              <div className="min-h-9 pt-1" aria-live="polite">
                {referenceProbe.status === 'loading' ? (
                  <p className="text-muted-foreground m-0 text-xs">{t('page.project_view.bible_probe_checking')}</p>
                ) : null}
                {referenceProbe.status === 'error' ? (
                  <p className="text-destructive m-0 text-xs leading-snug">{referenceProbe.message}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label={t('page.project_view.bible_remove_phrase_aria')}
          className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0 rounded p-1"
          disabled={!canRemovePhrase}
          onClick={onRemove}
        >
          <Trash2Icon aria-hidden className="size-4" />
        </button>
      </div>
      {showInsertTitleBelow ? (
        <div className="pl-7">
          <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={onInsertTitleBelow}>
            {t('page.project_view.bible_insert_title_below')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function ProjectBibleEditor({
  layouts,
  fallbackSlideSize,
  part,
  onBlockingUiChange,
  onCommit,
}: ProjectBibleEditorProps): ReactElement {
  const { t } = useTranslation()

  const [rows, setRows] = React.useState<BibleEditorRow[]>((): BibleEditorRow[] =>
    rangesToRows(part.contents.contents)
  )

  const rowsRef = React.useRef<BibleEditorRow[]>(rows)
  React.useLayoutEffect((): void => {
    rowsRef.current = rows
  }, [rows])

  React.useEffect((): void => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server snapshot into local row model
    setRows(rangesToRows(part.contents.contents))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep transient local edits (e.g. "3-") while same card id is being edited
  }, [part.id])

  const [dropTargetIndex, setDropTargetIndex] = React.useState<number | null>(null)

  React.useEffect((): (() => void) => {
    const clear = (): void => {
      setDropTargetIndex(null)
    }
    document.addEventListener('dragend', clear)
    return (): void => {
      document.removeEventListener('dragend', clear)
    }
  }, [])

  const titleLayout: Layout | undefined = React.useMemo((): Layout | undefined => {
    if (part.titleLayoutId === null || part.titleLayoutId.length === 0) {
      return undefined
    }
    return layouts.find((l: Layout): boolean => l.id === part.titleLayoutId)
  }, [layouts, part.titleLayoutId])

  const phraseLayout: Layout | undefined = React.useMemo((): Layout | undefined => {
    if (part.phraseLayoutId === null || part.phraseLayoutId.length === 0) {
      return undefined
    }
    return layouts.find((l: Layout): boolean => l.id === part.phraseLayoutId)
  }, [layouts, part.phraseLayoutId])

  const hasTitleSlide: boolean = titleLayout !== undefined

  const setTitleLayoutId = React.useCallback(
    (layoutId: string | null): void => {
      if (layoutId === null) {
        const withoutTitles: BibleContentRange[] = part.contents.contents.filter(
          (r: BibleContentRange): boolean => r.type !== 'title'
        )
        onCommit({
          ...part,
          titleLayoutId: null,
          contents: { type: 'BIBLE', contents: withoutTitles },
        })
        return
      }
      onCommit({
        ...part,
        titleLayoutId: layoutId,
      })
    },
    [onCommit, part]
  )

  const trySelectPhraseLayout = React.useCallback(
    (layout: Layout): void => {
      if (layoutPlaceholderCount(layout) === 0) {
        toast.error(t('page.project_view.lyrics_layout_requires_placeholder'))
        return
      }
      onCommit({
        ...part,
        phraseLayoutId: layout.id,
      })
    },
    [onCommit, part, t]
  )

  const flushRows = React.useCallback(
    (next: BibleEditorRow[]): void => {
      rowsRef.current = next
      setRows(next)
      const toSave: BibleContentRange[] = rowsToRangesForCommit(next)
      onCommit({
        ...part,
        contents: { type: 'BIBLE', contents: toSave },
      })
    },
    [onCommit, part]
  )

  const blockingCardIdsRef = React.useRef<Set<string>>(new Set())
  const registerPhraseCardBlocking = React.useCallback(
    (
      cardId: string,
      blocking: boolean,
      options?: { readonly fromUnmount?: boolean }
    ): void => {
      if (blocking) {
        blockingCardIdsRef.current.add(cardId)
        onBlockingUiChange?.(true)
        return
      }
      blockingCardIdsRef.current.delete(cardId)
      if (blockingCardIdsRef.current.size > 0) {
        return
      }
      if (options?.fromUnmount === true) {
        return
      }
      onBlockingUiChange?.(false)
    },
    [onBlockingUiChange]
  )

  const patchPhraseRow = React.useCallback(
    (rowIndex: number, patch: Partial<BiblePhraseEditorRow>): void => {
      const prev: BibleEditorRow[] = rowsRef.current
      const next: BibleEditorRow[] = prev.map((r: BibleEditorRow, i: number): BibleEditorRow =>
        i === rowIndex && r.rowType === 'phrase' ? { ...r, ...patch } : r
      )
      flushRows(next)
    },
    [flushRows]
  )

  const removeRowAt = React.useCallback(
    (rowIndex: number): void => {
      const prev: BibleEditorRow[] = rowsRef.current
      const target: BibleEditorRow | undefined = prev[rowIndex]
      if (target === undefined) {
        return
      }
      if (target.rowType === 'phrase' && countPhrases(prev) <= 1) {
        toast.error(t('page.project_view.bible_keep_one_phrase'))
        return
      }
      flushRows(prev.filter((_: BibleEditorRow, i: number): boolean => i !== rowIndex))
    },
    [flushRows, t]
  )

  const addPhrase = React.useCallback((): void => {
    flushRows([...rowsRef.current, emptyPhraseRow()])
  }, [flushRows])

  const insertTitleAfter = React.useCallback(
    (afterIndex: number): void => {
      if (!hasTitleSlide) {
        return
      }
      const prev: BibleEditorRow[] = rowsRef.current
      const anchor: BibleContent = resolveTitleAnchor(prev, afterIndex)
      const titleRow: BibleTitleEditorRow = { rowType: 'title', titleStart: { ...anchor } }
      const next: BibleEditorRow[] = [
        ...prev.slice(0, afterIndex + 1),
        titleRow,
        ...prev.slice(afterIndex + 1),
      ]
      flushRows(next)
    },
    [flushRows, hasTitleSlide]
  )

  const moveRow = React.useCallback(
    (fromIndex: number, toIndex: number): void => {
      if (fromIndex === toIndex) {
        return
      }
      const prev: BibleEditorRow[] = rowsRef.current
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) {
        return
      }
      const next: BibleEditorRow[] = [...prev]
      const [removed]: BibleEditorRow[] = next.splice(fromIndex, 1)
      if (removed === undefined) {
        return
      }
      next.splice(toIndex, 0, removed)
      flushRows(next)
    },
    [flushRows]
  )

  let phraseOrdinal: number = 0

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="min-w-0">
        <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {t('page.project_view.bible_title_slide_heading')}
        </h3>
        <p className="text-muted-foreground mb-2 text-xs">{t('page.project_view.bible_title_slide_hint')}</p>
        <div className="scrollbar-hide flex min-w-0 gap-3 overflow-x-auto px-1 py-1.5">
          <button
            type="button"
            aria-label={t('page.project_view.lyrics_layout_none_aria')}
            aria-pressed={titleLayout === undefined}
            onClick={(): void => {
              setTitleLayoutId(null)
            }}
            className={cn(
              'border-border/60 hover:border-border flex w-[92px] shrink-0 flex-col rounded-lg border bg-transparent p-2 transition-[border-color,box-shadow]',
              titleLayout === undefined ? LAYOUT_SELECTION_ACTIVE_CHROME : ''
            )}
          >
            <div className="bg-muted/40 text-muted-foreground flex aspect-video w-full items-center justify-center rounded text-[10px] font-medium">
              {t('page.project_view.lyrics_layout_none')}
            </div>
            <span className="text-muted-foreground mt-1 block max-w-[92px] truncate text-center text-[10px] font-medium">
              {t('page.project_view.lyrics_layout_none')}
            </span>
          </button>
          {layouts.map((layout: Layout): ReactElement => {
            const selected: boolean = titleLayout !== undefined && titleLayout.id === layout.id
            return (
              <button
                key={layout.id}
                type="button"
                aria-label={t('page.project_view.layout_option_aria', { name: layout.name })}
                aria-pressed={selected}
                onClick={(): void => {
                  setTitleLayoutId(layout.id)
                }}
                className={cn(
                  'border-border/60 hover:border-border shrink-0 rounded-lg border bg-transparent p-2 transition-[border-color,box-shadow]',
                  selected ? LAYOUT_SELECTION_ACTIVE_CHROME : ''
                )}
              >
                <TemplateLayoutSlide
                  layout={layout}
                  fallbackSlideSize={fallbackSlideSize}
                  maxContentWidthPx={92}
                  disableHoverTip
                  showLayoutTitle={false}
                />
                <span className="text-muted-foreground mt-1 block max-w-[92px] truncate text-center text-[10px] font-medium">
                  {layout.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="min-w-0">
        <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {t('page.project_view.bible_phrase_slide_heading')}
        </h3>
        <p className="text-muted-foreground mb-2 text-xs">{t('page.project_view.bible_phrase_slide_hint')}</p>
        <div className="scrollbar-hide flex min-w-0 gap-3 overflow-x-auto px-1 py-1.5">
          {layouts.map((layout: Layout): ReactElement => {
            const selected: boolean = phraseLayout !== undefined && phraseLayout.id === layout.id
            return (
              <button
                key={layout.id}
                type="button"
                aria-label={t('page.project_view.layout_option_aria', { name: layout.name })}
                aria-pressed={selected}
                onClick={(): void => {
                  trySelectPhraseLayout(layout)
                }}
                className={cn(
                  'border-border/60 hover:border-border shrink-0 rounded-lg border bg-transparent p-2 transition-[border-color,box-shadow]',
                  selected ? LAYOUT_SELECTION_ACTIVE_CHROME : ''
                )}
              >
                <TemplateLayoutSlide
                  layout={layout}
                  fallbackSlideSize={fallbackSlideSize}
                  maxContentWidthPx={92}
                  disableHoverTip
                  showLayoutTitle={false}
                />
                <span className="text-muted-foreground mt-1 block max-w-[92px] truncate text-center text-[10px] font-medium">
                  {layout.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {t('page.project_view.bible_cards_heading')}
        </h3>
        <p className="text-muted-foreground mb-2 text-xs">{t('page.project_view.bible_cards_hint')}</p>
        <div className="flex flex-col gap-3">
          {rows.map((row: BibleEditorRow, index: number): ReactElement => {
            if (row.rowType === 'title') {
              return (
                <div
                  key={`title-${String(index)}-${String(part.id)}`}
                  className={cn(
                    'border-border/60 bg-muted/20 flex items-center gap-2 rounded-lg border p-3 transition-shadow',
                    dropTargetIndex === index && 'ring-ring ring-2 ring-offset-2 ring-offset-background'
                  )}
                  onDragOver={(e: DragEvent<HTMLDivElement>): void => {
                    if (!e.dataTransfer.types.includes(MIME_BIBLE_CARD_REORDER)) {
                      return
                    }
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDropTargetIndex(index)
                  }}
                  onDragLeave={(e: DragEvent<HTMLDivElement>): void => {
                    const nextTarget: Node | null = e.relatedTarget as Node | null
                    if (nextTarget !== null && e.currentTarget.contains(nextTarget)) {
                      return
                    }
                    setDropTargetIndex((prev: number | null): number | null => (prev === index ? null : prev))
                  }}
                  onDrop={(e: DragEvent<HTMLDivElement>): void => {
                    const raw: string = e.dataTransfer.getData(MIME_BIBLE_CARD_REORDER)
                    const fromIndex: number = Number.parseInt(raw, 10)
                    e.preventDefault()
                    setDropTargetIndex(null)
                    if (!Number.isInteger(fromIndex)) {
                      return
                    }
                    moveRow(fromIndex, index)
                  }}
                >
                  <div
                    draggable
                    role="button"
                    tabIndex={0}
                    aria-label={t('page.project_view.bible_card_reorder_aria')}
                    className="text-muted-foreground hover:text-foreground cursor-grab p-0.5 active:cursor-grabbing"
                    onDragStart={(ev: DragEvent<HTMLDivElement>): void => {
                      ev.dataTransfer.setData(MIME_BIBLE_CARD_REORDER, String(index))
                      ev.dataTransfer.effectAllowed = 'move'
                    }}
                  >
                    <GripVerticalIcon aria-hidden className="size-4 shrink-0" />
                  </div>
                  <p className="text-foreground m-0 min-w-0 flex-1 text-sm font-medium">
                    {t('page.project_view.bible_title_card_label')}
                  </p>
                  <button
                    type="button"
                    aria-label={t('page.project_view.bible_remove_title_aria')}
                    className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1"
                    onClick={(): void => {
                      removeRowAt(index)
                    }}
                  >
                    <Trash2Icon aria-hidden className="size-4" />
                  </button>
                </div>
              )
            }

            phraseOrdinal++
            const thisPhraseIndex: number = phraseOrdinal
            return (
              <div
                key={`phrase-${String(index)}-${String(part.id)}`}
                className={cn(dropTargetIndex === index && 'ring-ring ring-2 ring-offset-2 ring-offset-background')}
                onDragOver={(e: DragEvent<HTMLDivElement>): void => {
                  if (!e.dataTransfer.types.includes(MIME_BIBLE_CARD_REORDER)) {
                    return
                  }
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDropTargetIndex(index)
                }}
                onDragLeave={(e: DragEvent<HTMLDivElement>): void => {
                  const nextTarget: Node | null = e.relatedTarget as Node | null
                  if (nextTarget !== null && e.currentTarget.contains(nextTarget)) {
                    return
                  }
                  setDropTargetIndex((prev: number | null): number | null => (prev === index ? null : prev))
                }}
                onDrop={(e: DragEvent<HTMLDivElement>): void => {
                  const raw: string = e.dataTransfer.getData(MIME_BIBLE_CARD_REORDER)
                  const fromIndex: number = Number.parseInt(raw, 10)
                  e.preventDefault()
                  setDropTargetIndex(null)
                  if (!Number.isInteger(fromIndex)) {
                    return
                  }
                  moveRow(fromIndex, index)
                }}
              >
                <BiblePhraseCard
                  index={index}
                  row={row}
                  phraseOrdinal={thisPhraseIndex}
                  canRemovePhrase={countPhrases(rows) > 1}
                  showInsertTitleBelow={hasTitleSlide}
                  registerBlocking={registerPhraseCardBlocking}
                  onPatch={(patch: Partial<BiblePhraseEditorRow>): void => {
                    patchPhraseRow(index, patch)
                  }}
                  onRemove={(): void => {
                    removeRowAt(index)
                  }}
                  onInsertTitleBelow={(): void => {
                    insertTitleAfter(index)
                  }}
                />
              </div>
            )
          })}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={addPhrase}>
          {t('page.project_view.bible_add_phrase')}
        </Button>
      </section>
    </div>
  )
}
