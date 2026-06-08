import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { GripVerticalIcon, Trash2Icon } from 'lucide-react'

import { bibleProbeDetailToI18nKey, probeBibleReference } from '@/api/bible-reference-probe'
import { useBibleBooks, useBibleChapters } from '@/api/query/bible.query'
import { useOptionalProjectVariablesScope } from '@/App/authenticated/project-view/project-variables-scope-context'
import { useVariableSlash } from '@/App/authenticated/project-view/use-variable-slash'
import { VariableSlashTextInput } from '@/App/authenticated/project-view/VariableSlashField'
import { Button } from '@/components/ui/button/Button'
import { type AvailableBibleVersion, AvailableBibleVersionsTypes } from '@/domain/enums/project'
import {
  type BiblePhraseEditorRow,
  normalizeVersionInput,
  parseVerseRangeString,
  phraseRowToRange,
} from '@/lib/bible-editor'
import { cn } from '@/lib/utils'

import type { DragEvent, ReactElement } from 'react'

const ALL_BIBLE_VERSIONS: readonly AvailableBibleVersion[] = Object.values(AvailableBibleVersionsTypes)

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
  const { t } = useTranslation()
  const scope = useOptionalProjectVariablesScope()
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const variables = scope?.variables ?? []
  const slash = useVariableSlash({
    value,
    onValueChange: onChange,
    variables,
    inputRef,
    emptyListLabel: t('page.project_view.variables_slash_empty'),
    enabled: scope !== null && variables.length > 0 && !disabled,
  })
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

  const showList: boolean = !slash.menuOpen && !disabled && open && filtered.length > 0

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
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
        onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement>): void => {
          slash.onKeyDown(ev)
        }}
        onInput={(): void => {
          slash.onInput()
        }}
        onSelect={(): void => {
          slash.onSelectCapture()
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
          'border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2',
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
          {filtered.map(
            (item: string, itemIndex: number): ReactElement => (
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
            )
          )}
        </ul>
      ) : null}
      {slash.menuPortal}
    </div>
  )
}

type BibleReferenceProbeUi =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }

export interface BiblePhraseCardProps {
  readonly index: number
  readonly row: BiblePhraseEditorRow
  readonly phraseOrdinal: number
  readonly canRemovePhrase: boolean
  readonly showInsertTitleBelow: boolean
  readonly mimeReorder: string
  readonly onPatch: (patch: Partial<BiblePhraseEditorRow>) => void
  readonly onRemove: () => void
  readonly onInsertTitleBelow: () => void
  readonly registerBlocking: (cardId: string, blocking: boolean, options?: { readonly fromUnmount?: boolean }) => void
}

export function BiblePhraseCard({
  index,
  row,
  phraseOrdinal,
  canRemovePhrase,
  showInsertTitleBelow,
  mimeReorder,
  onPatch,
  onRemove,
  onInsertTitleBelow,
  registerBlocking,
}: BiblePhraseCardProps): ReactElement {
  const { t } = useTranslation()
  const versionResolved: AvailableBibleVersion | null = normalizeVersionInput(row.version)
  const booksQuery = useBibleBooks(versionResolved)
  const chaptersQuery = useBibleChapters(versionResolved, row.book.trim().length > 0 ? row.book.trim() : null)

  const chapterOptions: number[] = React.useMemo((): number[] => chaptersQuery.data ?? [], [chaptersQuery.data])
  const chapterSuggestions: string[] = React.useMemo(
    (): string[] => chapterOptions.map((n: number): string => String(n)),
    [chapterOptions]
  )

  const books: string[] = booksQuery.data ?? []

  const verseFieldInvalid: boolean = row.verseInput.trim().length > 0 && parseVerseRangeString(row.verseInput) === null

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
            i18nSuffix === 'bible_probe_generic' ? t(fullKey, { detail: result.detail }) : t(fullKey)
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
    verseFieldInvalid || booksQuery.isError || chaptersQuery.isError || referenceProbe.status === 'error'

  React.useEffect((): void | (() => void) => {
    registerBlocking(cardInstanceId, cardBlocks)
    return (): void => {
      registerBlocking(cardInstanceId, false, { fromUnmount: true })
    }
  }, [cardBlocks, cardInstanceId, registerBlocking])

  return (
    <div className={cn('border-border/60 flex flex-col gap-2 rounded-lg border p-3 transition-shadow')}>
      <div className="flex items-start gap-1">
        <div
          draggable
          role="button"
          tabIndex={0}
          aria-label={t('page.project_view.bible_card_reorder_aria')}
          className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab p-0.5 active:cursor-grabbing"
          onDragStart={(e: DragEvent<HTMLDivElement>): void => {
            e.dataTransfer.setData(mimeReorder, String(index))
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
              <VariableSlashTextInput
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
                  'border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2',
                  verseFieldInvalid ? 'border-destructive/80' : ''
                )}
                value={row.verseInput}
                onValueChange={(next: string): void => {
                  onPatch({ verseInput: next })
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
