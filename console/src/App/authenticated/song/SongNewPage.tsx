import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, FileTextIcon } from 'lucide-react'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useSaveSong, useScrapeLyrics, useScrapeSearchSongs } from '@/api/query/song.query'
import { Button } from '@/components/ui/button/Button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog/ConfirmDialog'
import { Spinner } from '@/components/ui/spinner/Spinner'
import type { ScrapeSearchSongHit } from '@/domain/models/song'
import type { User } from '@/domain/models/user'
import type { LyricsPart } from '@/domain/valueobjects/song'
import { cn, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import type { TFunction } from 'i18next'

const CATALOG_UI_PAGE_SIZE: number = 5
const CATALOG_API_PAGE_SIZE: number = 50

function formatPreviewLyrics(parts: readonly LyricsPart[]): string {
  return parts.map((p) => p.lyrics).join('\n\n')
}

function hitHasLyrics(hit: ScrapeSearchSongHit): boolean {
  return hit.lyricsText != null && hit.lyricsText !== ''
}

function catalogRowKey(hit: ScrapeSearchSongHit, rowIndex: number, catalogUiPage: number): string {
  return `scrape-ui-${catalogUiPage}-${rowIndex}-${hit.title}-${hit.artist ?? ''}`
}

interface LyricsTextDialogProps {
  readonly open: boolean
  readonly titleId: string
  readonly bodyId: string
  readonly title: string
  readonly body: string
  readonly closeLabel: string
  readonly onClose: () => void
}

function LyricsTextDialog({
  open,
  titleId,
  bodyId,
  title,
  body,
  closeLabel,
  onClose,
}: LyricsTextDialogProps): React.ReactElement | null {
  React.useEffect((): void | (() => void) => {
    if (!open) {
      return
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return (): void => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="border-border bg-popover text-popover-foreground relative z-10 flex w-full max-w-lg flex-col rounded-lg border p-6 shadow-lg"
        onClick={(e: React.MouseEvent<HTMLDivElement>): void => {
          e.stopPropagation()
        }}
      >
        <h2 id={titleId} className="text-foreground text-lg font-semibold">
          {title}
        </h2>
        <pre
          id={bodyId}
          className="text-muted-foreground mt-3 max-h-96 overflow-y-auto text-sm wrap-break-word whitespace-pre-wrap"
        >
          {body}
        </pre>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface RefineCatalogSearchDialogProps {
  readonly open: boolean
  readonly heading: string
  readonly description: string
  readonly titleLabel: string
  readonly artistLabel: string
  readonly artistHint: string
  readonly cancelLabel: string
  readonly confirmLabel: string
  readonly draftTitle: string
  readonly draftArtist: string
  readonly onDraftTitleChange: (value: string) => void
  readonly onDraftArtistChange: (value: string) => void
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly confirmDisabled: boolean
}

function RefineCatalogSearchDialog({
  open,
  heading,
  description,
  titleLabel,
  artistLabel,
  artistHint,
  cancelLabel,
  confirmLabel,
  draftTitle,
  draftArtist,
  onDraftTitleChange,
  onDraftArtistChange,
  onCancel,
  onConfirm,
  confirmDisabled,
}: RefineCatalogSearchDialogProps): React.ReactElement | null {
  const headingId: string = React.useId()
  const descId: string = React.useId()
  const refineTitleInputId: string = React.useId()
  const refineArtistInputId: string = React.useId()

  React.useEffect((): void | (() => void) => {
    if (!open) {
      return
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return (): void => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onCancel])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descId}
        className="border-border bg-popover text-popover-foreground relative z-10 flex w-full max-w-lg flex-col rounded-lg border p-6 shadow-lg"
        onClick={(e: React.MouseEvent<HTMLDivElement>): void => {
          e.stopPropagation()
        }}
      >
        <h2 id={headingId} className="text-foreground text-lg font-semibold">
          {heading}
        </h2>
        <p id={descId} className="text-muted-foreground mt-2 text-sm">
          {description}
        </p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e: React.FormEvent<HTMLFormElement>): void => {
            e.preventDefault()
            if (!confirmDisabled) {
              onConfirm()
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={refineTitleInputId} className="text-muted-foreground text-sm font-medium">
              {titleLabel}
            </label>
            <input
              id={refineTitleInputId}
              type="text"
              name="refineTitle"
              autoComplete="off"
              value={draftTitle}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                onDraftTitleChange(ev.target.value)
              }}
              className="border-input bg-background focus:border-ring h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={refineArtistInputId} className="text-muted-foreground text-sm font-medium">
              {artistLabel} <span className="text-muted-foreground/80 font-normal">{artistHint}</span>
            </label>
            <input
              id={refineArtistInputId}
              type="text"
              name="refineArtist"
              autoComplete="off"
              value={draftArtist}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                onDraftArtistChange(ev.target.value)
              }}
              className="border-input bg-background focus:border-ring h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={confirmDisabled}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export function SongNewPage(): React.ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scrapeLyrics = useScrapeLyrics()
  const saveSong = useSaveSong()

  const lyricsTitleId: string = React.useId()
  const lyricsBodyId: string = React.useId()

  const currentUser: User | undefined = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''

  const [title, setTitle] = React.useState<string>('')
  const [artist, setArtist] = React.useState<string>('')
  const [scrapePreview, setScrapePreview] = React.useState<{
    readonly userSearchTitle: string
    readonly matchedArtist: string
    readonly lyrics: LyricsPart[]
  } | null>(null)
  const [refineOpen, setRefineOpen] = React.useState<boolean>(false)
  const [refineDraftTitle, setRefineDraftTitle] = React.useState<string>('')
  const [refineDraftArtist, setRefineDraftArtist] = React.useState<string>('')
  const [catalogQuery, setCatalogQuery] = React.useState<{ title: string; artist: string } | null>(null)
  const [catalogUiPage, setCatalogUiPage] = React.useState<number>(1)
  const [lyricsPreview, setLyricsPreview] = React.useState<{ title: string; body: string } | null>(null)
  const [pickHit, setPickHit] = React.useState<ScrapeSearchSongHit | null>(null)

  const titleInputId: string = 'song-new-title'
  const artistInputId: string = 'song-new-artist'

  const trimmedTitle: string = title.trim()
  const trimmedArtist: string = artist.trim()

  const catalogGlobalStart: number = (catalogUiPage - 1) * CATALOG_UI_PAGE_SIZE
  const catalogApiPage: number = Math.floor(catalogGlobalStart / CATALOG_API_PAGE_SIZE) + 1
  const catalogSliceOffset: number = catalogGlobalStart % CATALOG_API_PAGE_SIZE

  const catalogSearch = useScrapeSearchSongs({
    title: catalogQuery?.title ?? '',
    artist: catalogQuery?.artist ?? '',
    page: catalogApiPage,
    enabled: catalogQuery !== null,
  })

  const catalogPageData = catalogSearch.data
  const batch: readonly ScrapeSearchSongHit[] = catalogPageData?.items ?? []
  const batchLen: number = batch.length
  const catalogRows: ScrapeSearchSongHit[] = [
    ...batch.slice(catalogSliceOffset, catalogSliceOffset + CATALOG_UI_PAGE_SIZE),
  ]
  const progressFrom: number = batchLen === 0 || catalogRows.length === 0 ? 0 : catalogGlobalStart + 1
  const progressTo: number = batchLen === 0 || catalogRows.length === 0 ? 0 : catalogGlobalStart + catalogRows.length
  const hasMoreInCurrentBatch: boolean = catalogSliceOffset + CATALOG_UI_PAGE_SIZE < batchLen
  const currentBatchIsFull: boolean = batchLen === CATALOG_API_PAGE_SIZE
  const canCatalogNext: boolean = batchLen > 0 && (hasMoreInCurrentBatch || currentBatchIsFull)
  const canCatalogPrev: boolean = catalogUiPage > 1

  const canSubmit: boolean = trimmedTitle.length > 0 && !scrapeLyrics.isPending

  const showScrapedBlock: boolean = scrapePreview !== null && catalogQuery === null
  const showCatalog: boolean = catalogQuery !== null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!canSubmit) {
      return
    }
    setScrapePreview(null)
    setCatalogQuery(null)
    setCatalogUiPage(1)
    setPickHit(null)
    setLyricsPreview(null)

    scrapeLyrics.mutate(
      {
        title: trimmedTitle,
        ...(trimmedArtist.length > 0 ? { artist: trimmedArtist } : {}),
      },
      {
        onSuccess: (result): void => {
          setScrapePreview({
            userSearchTitle: trimmedTitle,
            matchedArtist: result.matchedArtist,
            lyrics: [...result.lyrics],
          })
        },
      }
    )
  }

  const handleCatalogNext = (): void => {
    setCatalogUiPage((p: number): number => p + 1)
  }

  const handleCatalogPrev = (): void => {
    setCatalogUiPage((p: number): number => Math.max(1, p - 1))
  }

  const refineTrimmedTitle: string = refineDraftTitle.trim()

  if (currentUser === undefined) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  const pickArtistSuffix: string =
    pickHit != null && pickHit.artist != null && pickHit.artist.length > 0
      ? t('page.song_new.pick_confirm_suffix_by', { artist: pickHit.artist })
      : ''

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col items-center overflow-y-auto px-8 pt-8 pb-16 md:px-16">
      <RefineCatalogSearchDialog
        open={refineOpen}
        heading={t('page.song_new.refine_title')}
        description={t('page.song_new.refine_description')}
        titleLabel={t('page.song_new.title_label')}
        artistLabel={t('page.song_new.artist_label')}
        artistHint={t('page.song_new.artist_optional')}
        cancelLabel={t('page.song_new.refine_cancel')}
        confirmLabel={t('page.song_new.refine_confirm')}
        draftTitle={refineDraftTitle}
        draftArtist={refineDraftArtist}
        onDraftTitleChange={setRefineDraftTitle}
        onDraftArtistChange={setRefineDraftArtist}
        onCancel={(): void => {
          setRefineOpen(false)
        }}
        onConfirm={(): void => {
          if (refineTrimmedTitle.length === 0) {
            return
          }
          const nextArtist: string = refineDraftArtist.trim()
          setTitle(refineDraftTitle)
          setArtist(refineDraftArtist)
          setRefineOpen(false)
          setCatalogQuery({ title: refineTrimmedTitle, artist: nextArtist })
          setCatalogUiPage(1)
        }}
        confirmDisabled={refineTrimmedTitle.length === 0}
      />

      <ConfirmDialog
        open={pickHit !== null}
        title={t('page.song_new.pick_confirm_title')}
        description={
          pickHit === null
            ? ''
            : t('page.song_new.pick_confirm_description', {
                title: pickHit.title,
                artistSuffix: pickArtistSuffix,
              })
        }
        cancelLabel={t('page.song_new.refine_cancel')}
        confirmLabel={t('page.song_new.pick_confirm')}
        confirmLoading={pickHit !== null && saveSong.isPending}
        confirmLoadingLabel={t('page.song_new.saving')}
        onCancel={(): void => {
          if (saveSong.isPending) {
            return
          }
          setPickHit(null)
        }}
        onConfirm={(): void => {
          if (pickHit === null || userId.length === 0 || catalogQuery === null) {
            return
          }
          const hit: ScrapeSearchSongHit = pickHit
          const searchTitle: string = catalogQuery.title.trim()
          const rowArtist: string | null = hit.artist != null && hit.artist.trim().length > 0 ? hit.artist.trim() : null
          saveSong.mutate(
            {
              userId,
              title: searchTitle,
              artist: rowArtist,
              lyrics: [{ part: 'Default', lyrics: hit.lyricsText ?? '' }],
            },
            {
              onSuccess: (data): void => {
                setPickHit(null)
                navigate(`/songs/${data.song.id}/edit`)
              },
            }
          )
        }}
      />

      <LyricsTextDialog
        open={lyricsPreview !== null}
        titleId={lyricsTitleId}
        bodyId={lyricsBodyId}
        title={lyricsPreview?.title ?? t('page.song_new.lyrics_preview_title')}
        body={
          lyricsPreview === null
            ? ''
            : lyricsPreview.body.length > 0
              ? lyricsPreview.body
              : t('page.song_new.lyrics_preview_empty')
        }
        closeLabel={t('page.song_new.lyrics_preview_close')}
        onClose={(): void => {
          setLyricsPreview(null)
        }}
      />

      <div className="flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="flex w-full justify-start">
          <button
            type="button"
            onClick={(): void => {
              navigate('/songs')
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
            {t('page.song_new.back')}
          </button>
        </div>

        <div className="flex w-full flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('page.song_new.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('page.song_new.subtitle')}</p>
        </div>

        <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div className="flex w-full flex-col gap-2">
            <label htmlFor={titleInputId} className="text-muted-foreground text-sm font-medium">
              {t('page.song_new.title_label')}
            </label>
            <input
              id={titleInputId}
              type="text"
              name="songTitle"
              autoComplete="off"
              value={title}
              disabled={scrapeLyrics.isPending || saveSong.isPending}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                setTitle(ev.target.value)
              }}
              className="border-input bg-background focus:border-ring h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="flex w-full flex-col gap-2">
            <label htmlFor={artistInputId} className="text-muted-foreground text-sm font-medium">
              {t('page.song_new.artist_label')}{' '}
              <span className="text-muted-foreground/80 font-normal">{t('page.song_new.artist_optional')}</span>
            </label>
            <input
              id={artistInputId}
              type="text"
              name="songArtist"
              autoComplete="off"
              value={artist}
              disabled={scrapeLyrics.isPending || saveSong.isPending}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                setArtist(ev.target.value)
              }}
              className="border-input bg-background focus:border-ring h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>

          {scrapeLyrics.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {scrapeLyricsErrorMessage(scrapeLyrics.error, t)}
            </p>
          ) : null}
          {saveSong.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {scrapeLyricsErrorMessage(saveSong.error, t)}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit}
            loading={scrapeLyrics.isPending}
            loadingLabel={t('page.song_new.searching')}
          >
            {t('page.song_new.search')}
          </Button>
        </form>

        {showScrapedBlock && scrapePreview !== null ? (
          <section
            className="border-border flex w-full flex-col gap-4 border-t pt-6"
            aria-labelledby="song-new-scraped-heading"
          >
            <h2 id="song-new-scraped-heading" className="text-lg font-semibold">
              {t('page.song_new.scraped_heading')}
            </h2>
            <pre className="text-foreground max-h-96 overflow-y-auto text-sm wrap-break-word whitespace-pre-wrap">
              {formatPreviewLyrics(scrapePreview.lyrics)}
            </pre>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                disabled={userId.length === 0 || saveSong.isPending}
                loading={saveSong.isPending}
                loadingLabel={t('page.song_new.saving')}
                onClick={(): void => {
                  if (userId.length === 0 || scrapePreview === null) {
                    return
                  }
                  const artistForSave: string | null =
                    scrapePreview.matchedArtist.trim().length > 0 ? scrapePreview.matchedArtist.trim() : null
                  saveSong.mutate(
                    {
                      userId,
                      title: scrapePreview.userSearchTitle,
                      artist: artistForSave,
                      lyrics: [...scrapePreview.lyrics],
                    },
                    {
                      onSuccess: (data): void => {
                        navigate(`/songs/${data.song.id}/edit`)
                      },
                    }
                  )
                }}
              >
                {t('page.song_new.go_edit')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(): void => {
                  setRefineDraftTitle(title)
                  setRefineDraftArtist(artist)
                  setRefineOpen(true)
                }}
              >
                {t('page.song_new.not_this_song')}
              </Button>
            </div>
          </section>
        ) : null}

        {showCatalog ? (
          <section
            className="border-border flex w-full flex-col gap-4 border-t pt-6"
            aria-labelledby="song-new-catalog-heading"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="song-new-catalog-heading" className="text-lg font-semibold">
                {t('page.song_new.catalog_heading')}
              </h2>
              {catalogSearch.isFetching ? (
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Spinner className="text-muted-foreground" width={16} height={16} />
                  {t('page.song_new.catalog_loading')}
                </span>
              ) : null}
            </div>

            {catalogSearch.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {t('page.song_new.catalog_error')}
              </p>
            ) : null}

            {!catalogSearch.isError && catalogPageData !== undefined && batchLen === 0 ? (
              <p className="text-muted-foreground text-sm">{t('page.song_new.catalog_empty')}</p>
            ) : null}

            {!catalogSearch.isError && catalogPageData !== undefined && batchLen > 0 ? (
              <>
                <div className="border-border overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-md text-left text-sm">
                    <thead className="bg-muted/50 border-border border-b">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t('list.title')}</th>
                        <th className="px-3 py-2 font-medium">{t('list.artist')}</th>
                        <th className="w-16 px-3 py-2 text-center font-medium">
                          {t('page.song_new.catalog_col_lyrics')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogRows.map((hit: ScrapeSearchSongHit, rowIndex: number) => (
                        <tr
                          key={catalogRowKey(hit, rowIndex, catalogUiPage)}
                          role="button"
                          tabIndex={0}
                          className="hover:bg-muted/40 border-border cursor-pointer border-b last:border-b-0"
                          onClick={(): void => {
                            setPickHit(hit)
                          }}
                          onKeyDown={(ev: React.KeyboardEvent<HTMLTableRowElement>): void => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault()
                              setPickHit(hit)
                            }
                          }}
                        >
                          <td className="text-foreground px-3 py-2">{hit.title}</td>
                          <td className="text-muted-foreground px-3 py-2">
                            {hit.artist != null && hit.artist.length > 0 ? hit.artist : t('song.no_artist')}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              className={cn(
                                'focus-visible:ring-ring inline-flex rounded-md p-1.5 outline-none focus-visible:ring-2',
                                hitHasLyrics(hit)
                                  ? 'text-foreground hover:bg-muted cursor-pointer'
                                  : 'text-muted-foreground/35 cursor-not-allowed opacity-50'
                              )}
                              disabled={!hitHasLyrics(hit)}
                              aria-label={
                                hitHasLyrics(hit)
                                  ? t('page.song_new.lyrics_icon_aria_view', { title: hit.title })
                                  : t('page.song_new.lyrics_icon_aria_none')
                              }
                              onClick={(ev: React.MouseEvent<HTMLButtonElement>): void => {
                                ev.stopPropagation()
                                if (!hitHasLyrics(hit)) {
                                  return
                                }
                                setLyricsPreview({
                                  title: hit.title,
                                  body: hit.lyricsText ?? '',
                                })
                              }}
                            >
                              <FileTextIcon className="size-4 shrink-0" aria-hidden />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-sm">
                    {t('page.song_new.catalog_progress', {
                      ui: catalogUiPage,
                      remote: catalogApiPage,
                      from: progressFrom,
                      to: progressTo,
                      total: batchLen,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canCatalogPrev || catalogSearch.isFetching}
                      onClick={handleCatalogPrev}
                    >
                      {t('page.song_new.catalog_prev')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canCatalogNext || catalogSearch.isFetching}
                      onClick={handleCatalogNext}
                    >
                      {t('page.song_new.catalog_next')}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}

function scrapeLyricsErrorMessage(error: unknown, t: TFunction<'translation'>): string {
  if (!(error instanceof Error)) {
    return t('page.song_new.error_generic')
  }
  const message: string = error.message.toLowerCase()
  if (message.includes('conflict')) {
    return t('page.song_new.error_conflict')
  }
  if (message.includes('not found') || message.includes('404')) {
    return t('page.song_new.error_not_found')
  }
  return error.message.length > 0 ? error.message : t('page.song_new.error_generic')
}
