import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { GripVerticalIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { BiblePhraseCard } from '@/App/authenticated/project-view/BiblePhraseCard'
import { VariableChipTextField } from '@/App/authenticated/project-view/VariableSlashField'
import { TemplateLayoutSlide } from '@/App/authenticated/template/components/TemplateLayoutSlide'
import { Button } from '@/components/ui/button/Button'
import type { Layout, Shape } from '@/domain/models/powerpoint'
import { shapePlaceholderApiName } from '@/domain/models/powerpoint'
import type { BiblePart } from '@/domain/models/project'
import type { Size } from '@/domain/valueobjects/powerpoint'
import type { BibleContentRange } from '@/domain/valueobjects/project'
import {
  type BibleEditorRow,
  type BiblePhraseEditorRow,
  type BibleTitleEditorRow,
  emptyPhraseRow,
  rangesToRows,
  rowsToRangesForCommit,
} from '@/lib/bible-editor'
import { cn, LAYOUT_SELECTION_ACTIVE_CHROME } from '@/lib/utils'

import type { DragEvent, ReactElement } from 'react'

const MIME_BIBLE_CARD_REORDER: string = 'application/x-chat-ppt-bible-card-reorder'

export interface ProjectBibleEditorProps {
  readonly layouts: readonly Layout[]
  readonly fallbackSlideSize: Size
  readonly part: BiblePart
  /** True while any phrase card shows validation/probe/API errors (sidebar incomplete + export guard). */
  readonly onBlockingUiChange?: (blocking: boolean) => void
  readonly onCommit: (next: BiblePart) => void
  /** Push selected layout into main stage preview immediately. */
  readonly onPreviewLayoutSelect?: (layoutId: string | null) => void
}

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

function effectiveSinglePlaceholderSelection(
  stored: number | null | undefined,
  placeholders: readonly Shape[]
): number | null {
  const allIds: number[] = placeholders.map((s: Shape): number => s.shapeId)
  if (allIds.length === 0) {
    return null
  }
  if (stored !== null && stored !== undefined && allIds.includes(stored)) {
    return stored
  }
  return allIds[0] ?? null
}

function placeholderLabel(shape: Shape): string {
  if (shape.text !== null && shape.text.trim().length > 0) {
    return shape.text.trim()
  }
  return shapePlaceholderApiName(shape)
}

export function ProjectBibleEditor({
  layouts,
  fallbackSlideSize,
  part,
  onBlockingUiChange,
  onCommit,
  onPreviewLayoutSelect,
}: ProjectBibleEditorProps): ReactElement {
  const { t } = useTranslation()

  const [rows, setRows] = React.useState<BibleEditorRow[]>((): BibleEditorRow[] => rangesToRows(part.contents.contents))

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
  const titlePlaceholders: Shape[] = React.useMemo((): Shape[] => {
    return titleLayout !== undefined ? sortedPlaceholderShapes(titleLayout) : []
  }, [titleLayout])
  const phrasePlaceholders: Shape[] = React.useMemo((): Shape[] => {
    return phraseLayout !== undefined ? sortedPlaceholderShapes(phraseLayout) : []
  }, [phraseLayout])

  const titlePlaceholderIdsKey: string = React.useMemo((): string => {
    return titlePlaceholders.map((s: Shape): string => String(s.shapeId)).join('\0')
  }, [titlePlaceholders])
  const phrasePlaceholderIdsKey: string = React.useMemo((): string => {
    return phrasePlaceholders.map((s: Shape): string => String(s.shapeId)).join('\0')
  }, [phrasePlaceholders])

  const titlePlaceholderFillRef = React.useRef(part.contents.titlePlaceholderValues)
  React.useLayoutEffect((): void => {
    titlePlaceholderFillRef.current = part.contents.titlePlaceholderValues
  })

  const selectedPhrasePlaceholderId: number | null = React.useMemo((): number | null => {
    return effectiveSinglePlaceholderSelection(part.contents.phrasePlaceholderId, phrasePlaceholders)
  }, [part.contents.phrasePlaceholderId, phrasePlaceholders])
  const selectedPhraseRangePlaceholderId: number | null = React.useMemo((): number | null => {
    return effectiveSinglePlaceholderSelection(part.contents.phraseRangePlaceholderId, phrasePlaceholders)
  }, [part.contents.phraseRangePlaceholderId, phrasePlaceholders])

  const patchBibleContents = React.useCallback(
    (mutate: (prev: BiblePart['contents']) => BiblePart['contents']): void => {
      onCommit({
        ...part,
        contents: mutate(part.contents),
      })
    },
    [onCommit, part]
  )

  React.useEffect((): void => {
    if (titleLayout === undefined) {
      return
    }
    const allowedIds: ReadonlySet<number> = new Set(
      titlePlaceholderIdsKey
        .split('\0')
        .map((s: string): number => Number.parseInt(s, 10))
        .filter((n: number): boolean => Number.isInteger(n) && n > 0)
    )
    const prevFill: Readonly<Record<number, string>> | undefined = titlePlaceholderFillRef.current
    if (prevFill === undefined) {
      return
    }
    const orphanKeys: number[] = Object.keys(prevFill)
      .map((k: string): number => Number.parseInt(k, 10))
      .filter((k: number): boolean => Number.isInteger(k) && k > 0 && !allowedIds.has(k))
    if (orphanKeys.length === 0) {
      return
    }
    const nextFill: Record<number, string> = { ...prevFill }
    for (const k of orphanKeys) {
      delete nextFill[k]
    }
    patchBibleContents((prev: BiblePart['contents']): BiblePart['contents'] => ({
      ...prev,
      titlePlaceholderValues: nextFill,
    }))
  }, [titleLayout, titlePlaceholderIdsKey, patchBibleContents])

  React.useEffect((): void => {
    if (phraseLayout === undefined) {
      return
    }
    const ids: number[] = phrasePlaceholderIdsKey
      .split('\0')
      .map((s: string): number => Number.parseInt(s, 10))
      .filter((n: number): boolean => Number.isInteger(n) && n > 0)
    if (ids.length !== 1) {
      return
    }
    const onlyId: number = ids[0]!
    if (
      part.contents.phrasePlaceholderId === onlyId &&
      (part.contents.phraseRangePlaceholderId === undefined || part.contents.phraseRangePlaceholderId === null)
    ) {
      return
    }
    patchBibleContents((prev: BiblePart['contents']): BiblePart['contents'] => ({
      ...prev,
      phrasePlaceholderId: onlyId,
      phraseRangePlaceholderId: null,
    }))
  }, [
    phraseLayout,
    phrasePlaceholderIdsKey,
    part.contents.phrasePlaceholderId,
    part.contents.phraseRangePlaceholderId,
    patchBibleContents,
  ])

  const setTitleLayoutId = React.useCallback(
    (layoutId: string | null): void => {
      onPreviewLayoutSelect?.(layoutId)
      if (part.titleLayoutId === layoutId) {
        return
      }
      if (layoutId === null) {
        const withoutTitles: BibleContentRange[] = [...part.contents.contents].filter(
          (r: BibleContentRange): boolean => r.type !== 'title'
        )
        onCommit({
          ...part,
          titleLayoutId: null,
          contents: {
            ...part.contents,
            type: 'BIBLE',
            contents: withoutTitles,
            titlePlaceholderValues: {},
          },
        })
        return
      }
      onCommit({
        ...part,
        titleLayoutId: layoutId,
        contents: {
          ...part.contents,
          titlePlaceholderValues: {},
        },
      })
    },
    [onCommit, onPreviewLayoutSelect, part]
  )

  const trySelectPhraseLayout = React.useCallback(
    (layout: Layout): void => {
      onPreviewLayoutSelect?.(layout.id)
      const placeholders: Shape[] = sortedPlaceholderShapes(layout)
      if (placeholders.length === 0) {
        toast.error(t('page.project_view.lyrics_layout_requires_placeholder'))
        return
      }
      if (part.phraseLayoutId === layout.id) {
        return
      }
      onCommit({
        ...part,
        phraseLayoutId: layout.id,
        contents: {
          ...part.contents,
          phrasePlaceholderId: placeholders[0]!.shapeId,
          phraseRangePlaceholderId: placeholders.length > 1 ? placeholders[1]!.shapeId : null,
        },
      })
    },
    [onCommit, onPreviewLayoutSelect, part, t]
  )

  const setTitlePlaceholderShapeText = React.useCallback(
    (shapeId: number, raw: string): void => {
      const next: string = raw.trim()
      patchBibleContents((prev: BiblePart['contents']): BiblePart['contents'] => {
        const prevMap: Record<number, string> = { ...prev.titlePlaceholderValues }
        if (next.length === 0) {
          delete prevMap[shapeId]
        } else {
          prevMap[shapeId] = next
        }
        return {
          ...prev,
          titlePlaceholderValues: prevMap,
        }
      })
    },
    [patchBibleContents]
  )

  const setPhrasePlaceholderId = React.useCallback(
    (shapeId: number): void => {
      patchBibleContents((prev: BiblePart['contents']): BiblePart['contents'] => ({
        ...prev,
        phrasePlaceholderId: shapeId,
      }))
    },
    [patchBibleContents]
  )

  const setPhraseRangePlaceholderId = React.useCallback(
    (shapeId: number): void => {
      patchBibleContents((prev: BiblePart['contents']): BiblePart['contents'] => ({
        ...prev,
        phraseRangePlaceholderId: shapeId,
      }))
    },
    [patchBibleContents]
  )

  const flushRows = React.useCallback(
    (next: BibleEditorRow[]): void => {
      rowsRef.current = next
      setRows(next)
      const toSave: BibleContentRange[] = rowsToRangesForCommit(next)
      onCommit({
        ...part,
        contents: { ...part.contents, type: 'BIBLE', contents: toSave },
      })
    },
    [onCommit, part]
  )

  const blockingCardIdsRef = React.useRef<Set<string>>(new Set())
  const registerPhraseCardBlocking = React.useCallback(
    (cardId: string, blocking: boolean, options?: { readonly fromUnmount?: boolean }): void => {
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
      const next: BibleEditorRow[] = prev.map(
        (r: BibleEditorRow, i: number): BibleEditorRow =>
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
      flushRows(prev.filter((_: BibleEditorRow, i: number): boolean => i !== rowIndex))
    },
    [flushRows]
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
      const titleRow: BibleTitleEditorRow = { rowType: 'title' }
      const next: BibleEditorRow[] = [...prev.slice(0, afterIndex + 1), titleRow, ...prev.slice(afterIndex + 1)]
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
        {titleLayout !== undefined && titlePlaceholders.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-muted-foreground m-0 text-xs">
              {t('page.project_view.bible_title_placeholder_values_intro')}
            </p>
            {titlePlaceholders.map(
              (shape: Shape): ReactElement => (
                <label key={shape.shapeId} className="flex min-w-0 flex-col gap-1">
                  <span className="text-muted-foreground text-xs">{placeholderLabel(shape)}</span>
                  <div
                    className={
                      'border-input bg-background text-foreground focus-within:border-ring focus-within:ring-ring/50 w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none focus-within:ring-2'
                    }
                  >
                    <VariableChipTextField
                      aria-label={placeholderLabel(shape)}
                      spellCheck={false}
                      onPointerDown={(ev: React.PointerEvent<HTMLDivElement>): void => {
                        ev.stopPropagation()
                      }}
                      value={part.contents.titlePlaceholderValues[shape.shapeId] ?? ''}
                      onValueChange={(next: string): void => {
                        setTitlePlaceholderShapeText(shape.shapeId, next)
                      }}
                    />
                  </div>
                </label>
              )
            )}
          </div>
        ) : null}
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
        {phraseLayout !== undefined && phrasePlaceholders.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {phrasePlaceholders.length === 1 ? (
              <p className="text-muted-foreground m-0 text-xs">
                {t('page.project_view.bible_phrase_single_placeholder_hint')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-muted-foreground text-xs">
                    {t('page.project_view.bible_phrase_target_phrase_text')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {phrasePlaceholders.map(
                      (shape: Shape): ReactElement => (
                        <button
                          key={shape.shapeId}
                          type="button"
                          aria-pressed={selectedPhrasePlaceholderId === shape.shapeId}
                          onClick={(): void => {
                            setPhrasePlaceholderId(shape.shapeId)
                          }}
                          className={cn(
                            'border-input bg-background text-foreground hover:bg-muted/70 w-fit rounded-md border px-2 py-1 text-xs transition-colors',
                            selectedPhrasePlaceholderId === shape.shapeId
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : ''
                          )}
                        >
                          {placeholderLabel(shape)}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-muted-foreground text-xs">
                    {t('page.project_view.bible_phrase_target_scripture_range')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {phrasePlaceholders.map(
                      (shape: Shape): ReactElement => (
                        <button
                          key={shape.shapeId}
                          type="button"
                          aria-pressed={selectedPhraseRangePlaceholderId === shape.shapeId}
                          onClick={(): void => {
                            setPhraseRangePlaceholderId(shape.shapeId)
                          }}
                          className={cn(
                            'border-input bg-background text-foreground hover:bg-muted/70 w-fit rounded-md border px-2 py-1 text-xs transition-colors',
                            selectedPhraseRangePlaceholderId === shape.shapeId
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : ''
                          )}
                        >
                          {placeholderLabel(shape)}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
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
                    dropTargetIndex === index && 'ring-ring ring-offset-background ring-2 ring-offset-2'
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
                className={cn(dropTargetIndex === index && 'ring-ring ring-offset-background ring-2 ring-offset-2')}
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
                  canRemovePhrase={true}
                  showInsertTitleBelow={hasTitleSlide}
                  mimeReorder={MIME_BIBLE_CARD_REORDER}
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
