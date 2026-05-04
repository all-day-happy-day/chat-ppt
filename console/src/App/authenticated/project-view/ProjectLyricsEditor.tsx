import * as React from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { GripVerticalIcon, SlidersHorizontalIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { QUERY_KEY } from '@/api/query/key'
import { useListAllSongs, usePatchLyrics } from '@/api/query/song.query'
import { TemplateLayoutSlide } from '@/App/authenticated/template/components/TemplateLayoutSlide'
import { Button } from '@/components/ui/button/Button'
import { songUseCase } from '@/di/usecases'
import type { Layout, Shape } from '@/domain/models/powerpoint'
import { shapePlaceholderApiName } from '@/domain/models/powerpoint'
import type { LyricsPart } from '@/domain/models/project'
import type { Song } from '@/domain/models/song'
import type { Size } from '@/domain/valueobjects/powerpoint'
import type { LyricsContent, LyricsContents } from '@/domain/valueobjects/project'
import type { LyricsPart as LyricLine } from '@/domain/valueobjects/song'
import { normalizeLyricsPartSequence, readLyricsPartSequenceFromRow } from '@/lib/lyrics-part-sequence'
import { cn, LAYOUT_SELECTION_ACTIVE_CHROME } from '@/lib/utils'

import {
  LyricsSongConfigureOverlay,
  type LyricsSongConfigureSnapshot,
} from './LyricsSongConfigureOverlay'

const MIME_LYRICS_SONG_REORDER: string = 'application/x-chat-ppt-lyrics-song-reorder'

export interface ProjectLyricsEditorProps {
  readonly layouts: readonly Layout[]
  readonly fallbackSlideSize: Size
  readonly part: LyricsPart
  readonly onCommit: (next: LyricsPart) => void
  /** After heavy lyrics commits (e.g. song-form overlay), run project PATCH immediately (microtask). */
  readonly onFlushWorkspace?: () => void
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

function layoutPlaceholderCount(layout: Layout): number {
  return sortedPlaceholderShapes(layout).length
}

function emptyLyricsContent(): LyricsContent {
  return {
    title: '',
    artist: null,
    matchedBackendSongId: null,
    lyrics: [{ part: 'blank', lyrics: '' }],
    lyricsPartSequence: [],
    lyricsPartsConfigured: false,
    includeTitleSlide: true,
  }
}

function effectivePlaceholderSelection(
  stored: string[] | null | undefined,
  placeholders: readonly Shape[]
): Set<string> {
  const allIds: string[] = placeholders.map((s: Shape): string => s.id)
  if (stored === null || stored === undefined || stored.length === 0) {
    return new Set<string>(allIds)
  }
  const valid: string[] = stored.filter((id: string): boolean => allIds.includes(id))
  if (valid.length === 0) {
    return new Set<string>(allIds)
  }
  return new Set<string>(valid)
}

function selectionToStoredField(selected: ReadonlySet<string>, allIds: readonly string[]): string[] | undefined {
  if (selected.size === allIds.length) {
    return undefined
  }
  return [...selected]
}

function syncLegacyIncludeTitleForFirstCard(contents: LyricsContents): LyricsContents {
  const rows: LyricsContent[] = contents.contents
  const first: LyricsContent | undefined = rows[0]
  const includeFirst: boolean = first === undefined ? true : first.includeTitleSlide !== false
  return { ...contents, includeTitleForFirstCard: includeFirst }
}

function normalizeMatchKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) {
    return b.length
  }
  if (b.length === 0) {
    return a.length
  }
  const row: number[] = Array.from({ length: b.length + 1 }, (_, j): number => j)
  for (let i = 1; i <= a.length; i++) {
    let prevDiagonal: number = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const buffer: number = row[j]!
      const cost: number = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prevDiagonal + cost)
      prevDiagonal = buffer
    }
  }
  return row[b.length]!
}

function levenshteinRatio(a: string, b: string): number {
  const maxLen: number = Math.max(a.length, b.length)
  if (maxLen === 0) {
    return 1
  }
  const dist: number = levenshteinDistance(a, b)
  return 1 - dist / maxLen
}

function subsequenceMatchRatio(query: string, text: string): number {
  if (query.length === 0) {
    return 0
  }
  let qi = 0
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      qi++
    }
  }
  return qi / query.length
}

function tokenHitRatio(queryNorm: string, haystackNorm: string): number {
  const tokens: string[] = queryNorm.split(' ').filter((tok: string): boolean => tok.length > 0)
  if (tokens.length === 0) {
    return 0
  }
  let hits = 0
  for (const tok of tokens) {
    if (haystackNorm.includes(tok)) {
      hits++
    }
  }
  return hits / tokens.length
}

function scoreSongAgainstQuery(queryNorm: string, title: string, artist: string | null): number {
  if (queryNorm.length === 0) {
    return 0
  }
  const titleNorm: string = normalizeMatchKey(title)
  const artistNorm: string = artist !== null ? normalizeMatchKey(artist) : ''
  const haystack: string = `${titleNorm} ${artistNorm}`.trim()
  let score = 0
  if (titleNorm.startsWith(queryNorm)) {
    score += 130
  } else if (titleNorm.includes(queryNorm)) {
    score += 100
  }
  score += subsequenceMatchRatio(queryNorm, titleNorm) * 75
  score += tokenHitRatio(queryNorm, haystack) * 55
  if (artistNorm.length > 0) {
    if (artistNorm.includes(queryNorm)) {
      score += 45
    }
    score += subsequenceMatchRatio(queryNorm, artistNorm) * 30
  }
  const maxSl: number = Math.max(queryNorm.length, titleNorm.length)
  if (maxSl <= 48) {
    score += levenshteinRatio(queryNorm, titleNorm) * 65
  }
  return score
}

const SONG_SEARCH_SCORE_THRESHOLD = 28
const SONG_SEARCH_MAX_RESULTS = 8

function rankUserSongsByTitle(songs: readonly Song[], rawQuery: string): Song[] {
  const queryNorm: string = normalizeMatchKey(rawQuery)
  if (queryNorm.length === 0) {
    return []
  }
  const threshold: number = queryNorm.length <= 2 ? 18 : SONG_SEARCH_SCORE_THRESHOLD
  const scored: { song: Song; score: number }[] = []
  for (const song of songs) {
    const s: number = scoreSongAgainstQuery(queryNorm, song.title, song.artist)
    if (s >= threshold) {
      scored.push({ song, score: s })
    }
  }
  scored.sort((a: { song: Song; score: number }, b: { song: Song; score: number }): number => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return normalizeMatchKey(a.song.title).localeCompare(normalizeMatchKey(b.song.title))
  })
  return scored.slice(0, SONG_SEARCH_MAX_RESULTS).map((row: { song: Song; score: number }): Song => row.song)
}

function formatSongLibraryLabel(song: Song): string {
  if (song.artist !== null && song.artist.trim().length > 0) {
    return `${song.title} - ${song.artist}`
  }
  return song.title
}

/**
 * Resolves library song id for `/song/lyrics/get/:id`: explicit link first, else a single unambiguous
 * title (+ artist) match in the loaded library list.
 */
function resolveSongIdForLyricsFetch(row: LyricsContent, library: readonly Song[] | undefined): string {
  const explicit: string = row.matchedBackendSongId?.trim() ?? ''
  if (explicit.length > 0) {
    return explicit
  }
  if (library === undefined || library.length === 0) {
    return ''
  }
  const titleNorm: string = normalizeMatchKey(row.title)
  if (titleNorm.length === 0) {
    return ''
  }
  const cardArtistNorm: string = row.artist !== null ? normalizeMatchKey(row.artist) : ''
  const byTitle: Song[] = library.filter((s: Song): boolean => normalizeMatchKey(s.title) === titleNorm)
  if (byTitle.length === 0) {
    return ''
  }
  if (cardArtistNorm.length > 0) {
    const withArtist: Song[] = byTitle.filter((s: Song): boolean => {
      const libArtistNorm: string = s.artist !== null ? normalizeMatchKey(s.artist) : ''
      return libArtistNorm === cardArtistNorm
    })
    return withArtist.length === 1 ? withArtist[0]!.id : ''
  }
  return byTitle.length === 1 ? byTitle[0]!.id : ''
}

interface SongTitleComboboxProps {
  readonly song: LyricsContent
  readonly userSongs: readonly Song[] | undefined
  readonly songsLoading: boolean
  readonly songsError: boolean
  readonly onTitleChange: (raw: string) => void
  readonly onPickLibrarySong: (picked: Song) => void
  readonly titlePlaceholder: string
  readonly searchHint: string
  readonly loadingLabel: string
  readonly errorLabel: string
  readonly pickAriaLabel: string
  readonly titleFieldsLocked: boolean
}

function SongTitleCombobox({
  song,
  userSongs,
  songsLoading,
  songsError,
  onTitleChange,
  onPickLibrarySong,
  titlePlaceholder,
  searchHint,
  loadingLabel,
  errorLabel,
  pickAriaLabel,
  titleFieldsLocked,
}: SongTitleComboboxProps): React.ReactElement {
  const [open, setOpen] = React.useState<boolean>(false)
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const matches: Song[] = React.useMemo((): Song[] => {
    if (userSongs === undefined || song.title.trim().length === 0) {
      return []
    }
    return rankUserSongsByTitle(userSongs, song.title)
  }, [song.title, userSongs])

  React.useEffect((): (() => void) => {
    return (): void => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn('relative min-w-0', titleFieldsLocked && 'opacity-80')}>
      <input
        type="text"
        value={song.title}
        disabled={titleFieldsLocked}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
          onTitleChange(ev.target.value)
        }}
        onFocus={(): void => {
          if (titleFieldsLocked) {
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
          'border-input bg-background w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none',
          titleFieldsLocked
            ? 'text-muted-foreground border-muted/80 bg-muted/30 cursor-not-allowed'
            : 'focus:border-ring'
        )}
        placeholder={titlePlaceholder}
        aria-autocomplete="list"
        aria-expanded={!titleFieldsLocked && open && matches.length > 0}
      />
      {!titleFieldsLocked ? (
        <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug">{searchHint}</p>
      ) : null}
      {!titleFieldsLocked && songsLoading ? (
        <p className="text-muted-foreground mt-1 text-xs">{loadingLabel}</p>
      ) : null}
      {!titleFieldsLocked && songsError ? <p className="text-destructive mt-1 text-xs">{errorLabel}</p> : null}
      {!titleFieldsLocked && open && matches.length > 0 ? (
        <ul
          className="border-border bg-background scrollbar-hide absolute z-30 mt-1 max-h-48 w-full min-w-0 overflow-y-auto rounded-md border py-1 shadow-md"
          role="listbox"
        >
          {matches.map((hit: Song): React.ReactElement => (
            <li key={hit.id} role="option">
              <button
                type="button"
                className="hover:bg-muted/80 focus:bg-muted/80 w-full px-2 py-1.5 text-left text-sm outline-none"
                aria-label={`${pickAriaLabel}: ${formatSongLibraryLabel(hit)}`}
                onMouseDown={(ev: React.MouseEvent<HTMLButtonElement>): void => {
                  ev.preventDefault()
                  onPickLibrarySong(hit)
                  setOpen(false)
                }}
              >
                <span className="block min-w-0 truncate">{formatSongLibraryLabel(hit)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ProjectLyricsEditor({
  layouts,
  fallbackSlideSize,
  part,
  onCommit,
  onFlushWorkspace,
}: ProjectLyricsEditorProps): React.ReactElement {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const songsQuery = useListAllSongs()
  const patchLyricsMutation = usePatchLyrics()

  const patchContents = React.useCallback(
    (mutate: (prev: LyricsContents) => LyricsContents): void => {
      onCommit({
        ...part,
        contents: syncLegacyIncludeTitleForFirstCard(mutate(part.contents)),
      })
    },
    [onCommit, part]
  )

  const [configureSnapshot, setConfigureSnapshot] = React.useState<LyricsSongConfigureSnapshot | null>(null)
  const [configureLoadingSongIndex, setConfigureLoadingSongIndex] = React.useState<number | null>(null)

  const isSongListReorderLocked: boolean =
    configureSnapshot !== null || configureLoadingSongIndex !== null

  const openSongConfigure = React.useCallback(
    (songIndex: number): void => {
      const song: LyricsContent | undefined = part.contents.contents[songIndex]
      if (song === undefined) {
        return
      }
      const run = async (): Promise<void> => {
        const library: Song[] | undefined = songsQuery.data
        const backendId: string = resolveSongIdForLyricsFetch(song, library)
        const showLoad: boolean = backendId.length > 0
        if (showLoad) {
          setConfigureLoadingSongIndex(songIndex)
        }
        try {
          let lines: LyricLine[] = song.lyrics.map((l: LyricLine): LyricLine => ({ ...l }))
          const lineCountBeforeFetch: number = song.lyrics.length
          const sequenceFromCard: number[] = readLyricsPartSequenceFromRow(song, lineCountBeforeFetch)
          let sequence: number[] = sequenceFromCard
          let fetchOk: boolean = false
          if (showLoad) {
            try {
              const data = await queryClient.fetchQuery({
                queryKey: QUERY_KEY.SONG.GET_LYRICS(backendId),
                queryFn: (): ReturnType<typeof songUseCase.getLyrics> => songUseCase.getLyrics(backendId),
              })
              const fromDb: LyricLine[] = data.lyrics.lyrics.map(
                (l: LyricLine): LyricLine => ({ part: l.part, lyrics: l.lyrics })
              )
              lines = fromDb
              sequence = normalizeLyricsPartSequence(fromDb.length, sequenceFromCard)
              fetchOk = true
            } catch {
              toast.error(t('page.project_view.lyrics_configure_library_load_error'))
            }
          }
          const shouldPersistLink: boolean =
            fetchOk &&
            backendId.length > 0 &&
            (song.matchedBackendSongId?.trim() ?? '') !== backendId
          if (shouldPersistLink) {
            patchContents((prev: LyricsContents): LyricsContents => ({
              ...prev,
              contents: prev.contents.map(
                (row: LyricsContent, i: number): LyricsContent =>
                  i === songIndex ? { ...row, matchedBackendSongId: backendId } : row
              ),
            }))
          }
          setConfigureSnapshot({
            songIndex,
            title: song.title,
            artist: song.artist,
            lines,
            sequence,
            configured: song.lyricsPartsConfigured,
            revision: Date.now(),
          })
        } finally {
          if (showLoad) {
            setConfigureLoadingSongIndex(null)
          }
        }
      }
      void run()
    },
    [part, patchContents, queryClient, songsQuery.data, t]
  )

  const applySongConfigure = React.useCallback(
    (
      songIndex: number,
      payload: { readonly lines: LyricLine[]; readonly sequence: number[]; readonly configured: boolean }
    ): void => {
      const rowBefore: LyricsContent | undefined = part.contents.contents[songIndex]
      if (rowBefore === undefined) {
        return
      }
      const librarySongId: string = resolveSongIdForLyricsFetch(rowBefore, songsQuery.data)
      const lyricsForLibrary: LyricLine[] = payload.lines.map((l: LyricLine): LyricLine => ({ ...l }))

      flushSync((): void => {
        patchContents((prev: LyricsContents): LyricsContents => {
          if (songIndex < 0 || songIndex >= prev.contents.length) {
            return prev
          }
          return {
            ...prev,
            contents: prev.contents.map(
              (row: LyricsContent, i: number): LyricsContent =>
                i === songIndex
                  ? {
                      ...row,
                      lyrics: payload.lines.map((l: LyricLine): LyricLine => ({ ...l })),
                      lyricsPartSequence: normalizeLyricsPartSequence(payload.lines.length, payload.sequence),
                      lyricsPartsConfigured: payload.configured,
                    }
                  : row
            ),
          }
        })
      })

      if (onFlushWorkspace !== undefined) {
        queueMicrotask((): void => {
          onFlushWorkspace()
        })
      }

      if (librarySongId.length === 0) {
        return
      }
      patchLyricsMutation.mutate(
        { songId: librarySongId, requestBody: { lyrics: lyricsForLibrary } },
        {
          onError: (error: unknown): void => {
            const detail: string = error instanceof Error ? error.message : ''
            toast.error(
              detail.length > 0
                ? `${t('page.project_view.lyrics_library_save_failed')} (${detail})`
                : t('page.project_view.lyrics_library_save_failed')
            )
          },
        }
      )
    },
    [onFlushWorkspace, patchContents, patchLyricsMutation, part.contents.contents, songsQuery.data, t]
  )

  const titleLayout: Layout | undefined = React.useMemo((): Layout | undefined => {
    if (part.titleLayoutId === null || part.titleLayoutId.length === 0) {
      return undefined
    }
    return layouts.find((l: Layout): boolean => l.id === part.titleLayoutId)
  }, [layouts, part.titleLayoutId])

  const lyricsLayout: Layout | undefined = React.useMemo((): Layout | undefined => {
    if (part.lyricsLayoutId === null || part.lyricsLayoutId.length === 0) {
      return undefined
    }
    return layouts.find((l: Layout): boolean => l.id === part.lyricsLayoutId)
  }, [layouts, part.lyricsLayoutId])

  const lyricsPlaceholders: Shape[] = React.useMemo((): Shape[] => {
    return lyricsLayout !== undefined ? sortedPlaceholderShapes(lyricsLayout) : []
  }, [lyricsLayout])

  const selectedPhIds: Set<string> = React.useMemo((): Set<string> => {
    return effectivePlaceholderSelection(part.contents.lyricsPlaceholderShapeIds, lyricsPlaceholders)
  }, [lyricsPlaceholders, part.contents.lyricsPlaceholderShapeIds])

  const hasTitleSlide: boolean = titleLayout !== undefined

  const setTitleLayoutId = React.useCallback(
    (layoutId: string | null): void => {
      onCommit({
        ...part,
        titleLayoutId: layoutId,
      })
    },
    [onCommit, part]
  )

  const trySelectLyricsLayout = React.useCallback(
    (layout: Layout): void => {
      if (layoutPlaceholderCount(layout) === 0) {
        toast.error(t('page.project_view.lyrics_layout_requires_placeholder'))
        return
      }
      onCommit({
        ...part,
        lyricsLayoutId: layout.id,
        contents: syncLegacyIncludeTitleForFirstCard({
          ...part.contents,
          lyricsPlaceholderShapeIds: undefined,
        }),
      })
    },
    [onCommit, part, t]
  )

  const togglePlaceholder = React.useCallback(
    (shapeId: string, checked: boolean): void => {
      if (lyricsPlaceholders.length <= 1) {
        return
      }
      const allIds: string[] = lyricsPlaceholders.map((s: Shape): string => s.id)
      const next: Set<string> = new Set<string>(selectedPhIds)
      if (checked) {
        next.add(shapeId)
      } else {
        if (next.size <= 1) {
          toast.error(t('page.project_view.lyrics_keep_one_placeholder'))
          return
        }
        next.delete(shapeId)
      }
      onCommit({
        ...part,
        contents: syncLegacyIncludeTitleForFirstCard({
          ...part.contents,
          lyricsPlaceholderShapeIds: selectionToStoredField(next, allIds),
        }),
      })
    },
    [lyricsPlaceholders, onCommit, part, selectedPhIds, t]
  )

  const updateSongField = React.useCallback(
    (index: number, field: 'title' | 'artist', raw: string): void => {
      patchContents(
        (prev: LyricsContents): LyricsContents => ({
          ...prev,
          contents: prev.contents.map(
            (row: LyricsContent, i: number): LyricsContent => {
              if (i !== index) {
                return row
              }
              if (field === 'title') {
                return { ...row, title: raw, matchedBackendSongId: null }
              }
              const artist: string | null = raw.length === 0 ? null : raw
              return { ...row, artist, matchedBackendSongId: null }
            }
          ),
        })
      )
    },
    [patchContents]
  )

  const pickSongFromLibrary = React.useCallback(
    (index: number, picked: Song): void => {
      patchContents(
        (prev: LyricsContents): LyricsContents => ({
          ...prev,
          contents: prev.contents.map(
            (row: LyricsContent, i: number): LyricsContent =>
              i === index
                ? {
                    ...row,
                    title: picked.title,
                    artist: picked.artist,
                    matchedBackendSongId: picked.id,
                  }
                : row
          ),
        })
      )
    },
    [patchContents]
  )

  const setSongIncludeTitleSlide = React.useCallback(
    (index: number, checked: boolean): void => {
      patchContents(
        (prev: LyricsContents): LyricsContents => ({
          ...prev,
          contents: prev.contents.map(
            (row: LyricsContent, i: number): LyricsContent =>
              i === index ? { ...row, includeTitleSlide: checked } : row
          ),
        })
      )
    },
    [patchContents]
  )

  const addSong = React.useCallback((): void => {
    patchContents(
      (prev: LyricsContents): LyricsContents => ({
        ...prev,
        contents: [...prev.contents, emptyLyricsContent()],
      })
    )
  }, [patchContents])

  const removeSong = React.useCallback(
    (index: number): void => {
      patchContents(
        (prev: LyricsContents): LyricsContents => ({
          ...prev,
          contents: prev.contents.filter(
            (_: LyricsContent, i: number): boolean => i !== index
          ),
        })
      )
    },
    [patchContents]
  )

  const moveSongContents = React.useCallback(
    (fromIndex: number, toIndex: number): void => {
      if (isSongListReorderLocked) {
        return
      }
      if (fromIndex === toIndex) {
        return
      }
      patchContents((prev: LyricsContents): LyricsContents => {
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.contents.length ||
          toIndex >= prev.contents.length
        ) {
          return prev
        }
        const next: LyricsContent[] = [...prev.contents]
        const removed: LyricsContent | undefined = next.splice(fromIndex, 1)[0]
        if (removed === undefined) {
          return prev
        }
        next.splice(toIndex, 0, removed)
        return { ...prev, contents: next }
      })
    },
    [isSongListReorderLocked, patchContents]
  )

  const [dropTargetSongIndex, setDropTargetSongIndex] = React.useState<number | null>(null)

  React.useEffect((): (() => void) => {
    const clearDrop = (): void => {
      setDropTargetSongIndex(null)
    }
    document.addEventListener('dragend', clearDrop)
    return (): void => {
      document.removeEventListener('dragend', clearDrop)
    }
  }, [])

  const userSongs: Song[] | undefined = songsQuery.data
  const songsLoading: boolean = songsQuery.isLoading
  const songsError: boolean = songsQuery.isError

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="min-w-0">
        <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {t('page.project_view.lyrics_title_slide_heading')}
        </h3>
        <p className="text-muted-foreground mb-2 text-xs">{t('page.project_view.lyrics_title_slide_hint')}</p>
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
          {layouts.map((layout: Layout): React.ReactElement => {
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
          {t('page.project_view.lyrics_lyrics_slide_heading')}
        </h3>
        <p className="text-muted-foreground mb-2 text-xs">{t('page.project_view.lyrics_lyrics_slide_hint')}</p>
        <div className="scrollbar-hide flex min-w-0 gap-3 overflow-x-auto px-1 py-1.5">
          {layouts.map((layout: Layout): React.ReactElement => {
            const selected: boolean = lyricsLayout !== undefined && lyricsLayout.id === layout.id
            return (
              <button
                key={layout.id}
                type="button"
                aria-label={t('page.project_view.layout_option_aria', { name: layout.name })}
                aria-pressed={selected}
                onClick={(): void => {
                  trySelectLyricsLayout(layout)
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

      {lyricsLayout !== undefined && lyricsPlaceholders.length > 1 ? (
        <section>
          <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            {t('page.project_view.lyrics_placeholder_targets')}
          </h3>
          <div className="flex flex-col gap-2">
            {lyricsPlaceholders.map((shape: Shape): React.ReactElement => {
              const label: string =
                shape.text !== null && shape.text.trim().length > 0
                  ? shape.text.trim()
                  : shapePlaceholderApiName(shape)
              const checked: boolean = selectedPhIds.has(shape.id)
              return (
                <label key={shape.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="border-input size-4 rounded"
                    checked={checked}
                    onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                      togglePlaceholder(shape.id, ev.target.checked)
                    }}
                  />
                  <span className="text-foreground truncate text-sm">{label}</span>
                </label>
              )
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {t('page.project_view.lyrics_songs_heading')}
        </h3>
        <div className="flex flex-col gap-3">
          {part.contents.contents.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t('page.project_view.lyrics_songs_empty')}</p>
          ) : (
            part.contents.contents.map((song: LyricsContent, index: number): React.ReactElement => {
              const includeTitle: boolean = song.includeTitleSlide !== false
              const fieldsLocked: boolean = song.lyricsPartsConfigured
              return (
                <div
                  key={`${part.id}-song-${String(index)}`}
                  className={cn(
                    'border-border/60 flex flex-col gap-2 rounded-lg border p-3 transition-shadow',
                    dropTargetSongIndex === index && 'ring-ring ring-2 ring-offset-2 ring-offset-background'
                  )}
                  onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
                    if (isSongListReorderLocked) {
                      return
                    }
                    if (!e.dataTransfer.types.includes(MIME_LYRICS_SONG_REORDER)) {
                      return
                    }
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDropTargetSongIndex(index)
                  }}
                  onDragLeave={(e: React.DragEvent<HTMLDivElement>): void => {
                    if (isSongListReorderLocked) {
                      return
                    }
                    const nextTarget: Node | null = e.relatedTarget as Node | null
                    if (nextTarget !== null && e.currentTarget.contains(nextTarget)) {
                      return
                    }
                    setDropTargetSongIndex((prev: number | null): number | null =>
                      prev === index ? null : prev
                    )
                  }}
                  onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
                    if (isSongListReorderLocked) {
                      return
                    }
                    e.preventDefault()
                    setDropTargetSongIndex(null)
                    const raw: string = e.dataTransfer.getData(MIME_LYRICS_SONG_REORDER)
                    const fromIndex: number = Number.parseInt(raw, 10)
                    if (!Number.isInteger(fromIndex)) {
                      return
                    }
                    moveSongContents(fromIndex, index)
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-0.5">
                      <button
                        type="button"
                        draggable={!isSongListReorderLocked}
                        disabled={isSongListReorderLocked}
                        onDragStart={(ev: React.DragEvent<HTMLButtonElement>): void => {
                          if (isSongListReorderLocked) {
                            return
                          }
                          ev.dataTransfer.setData(MIME_LYRICS_SONG_REORDER, String(index))
                          ev.dataTransfer.effectAllowed = 'move'
                        }}
                        className={cn(
                          'text-muted-foreground hover:text-foreground mt-px shrink-0 rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSongListReorderLocked
                            ? 'cursor-not-allowed opacity-40'
                            : 'cursor-grab active:cursor-grabbing'
                        )}
                        aria-label={t('page.project_view.lyrics_song_reorder_aria')}
                      >
                        <GripVerticalIcon aria-hidden className="size-4" />
                      </button>
                      <span className="text-muted-foreground text-xs font-medium">
                        {t('page.project_view.lyrics_song_card_label', { index: String(index + 1) })}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {song.lyricsPartsConfigured ? (
                        <span
                          className="text-muted-foreground border-border bg-muted/50 inline-flex max-w-40 items-center truncate rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-normal tracking-wide uppercase"
                          title={t('page.project_view.lyrics_song_configured_badge')}
                        >
                          {t('page.project_view.lyrics_song_configured_badge')}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        disabled={isSongListReorderLocked}
                        aria-label={t('page.project_view.lyrics_remove_song_aria')}
                        className={cn(
                          'text-muted-foreground hover:text-destructive rounded p-1',
                          isSongListReorderLocked && 'pointer-events-none opacity-40'
                        )}
                        onClick={(): void => {
                          removeSong(index)
                        }}
                      >
                        <Trash2Icon aria-hidden className="size-4" />
                      </button>
                    </div>
                  </div>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2',
                      !hasTitleSlide && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="border-input size-4 rounded"
                      checked={includeTitle}
                      disabled={!hasTitleSlide}
                      onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                        setSongIncludeTitleSlide(index, ev.target.checked)
                      }}
                    />
                    <span className="text-foreground text-sm">{t('page.project_view.lyrics_include_title_slide')}</span>
                  </label>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-muted-foreground text-xs">{t('page.project_view.lyrics_song_title')}</span>
                    <SongTitleCombobox
                      song={song}
                      userSongs={userSongs}
                      songsLoading={songsLoading}
                      songsError={songsError}
                      titleFieldsLocked={fieldsLocked}
                      onTitleChange={(raw: string): void => {
                        updateSongField(index, 'title', raw)
                      }}
                      onPickLibrarySong={(picked: Song): void => {
                        pickSongFromLibrary(index, picked)
                      }}
                      titlePlaceholder={t('page.project_view.lyrics_song_title')}
                      searchHint={t('page.project_view.lyrics_song_search_hint')}
                      loadingLabel={t('page.project_view.lyrics_song_library_loading')}
                      errorLabel={t('page.project_view.lyrics_song_library_error')}
                      pickAriaLabel={t('page.project_view.lyrics_song_pick_aria')}
                    />
                  </div>
                  <label className="flex min-w-0 flex-col gap-1">
                    <span className="text-muted-foreground text-xs">{t('page.project_view.lyrics_song_artist')}</span>
                    <input
                      type="text"
                      value={song.artist ?? ''}
                      disabled={fieldsLocked}
                      onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                        updateSongField(index, 'artist', ev.target.value)
                      }}
                      className={cn(
                        'w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none',
                        fieldsLocked
                          ? 'text-muted-foreground border-muted/80 bg-muted/30 cursor-not-allowed'
                          : 'border-input bg-background focus:border-ring'
                      )}
                      placeholder={t('page.project_view.lyrics_song_artist')}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    disabled={configureLoadingSongIndex === index}
                    onClick={(): void => {
                      openSongConfigure(index)
                    }}
                  >
                    <SlidersHorizontalIcon aria-hidden className="size-3.5 shrink-0" />
                    {t('page.project_view.lyrics_configure_open')}
                  </Button>
                </div>
              )
            })
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isSongListReorderLocked}
            onClick={addSong}
          >
            {t('page.project_view.lyrics_add_song')}
          </Button>
        </div>
      </section>
      <LyricsSongConfigureOverlay
        snapshot={configureSnapshot}
        t={t}
        onClose={(): void => {
          setConfigureSnapshot(null)
        }}
        onApply={applySongConfigure}
      />
    </div>
  )
}
