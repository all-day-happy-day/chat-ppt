import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { songUseCase } from '@/di/usecases'
import type { PageResult, PagingQuery } from '@/domain/list-query'
import type { ScrapeSearchSongsResult, Song } from '@/domain/models/song'
import type { LyricsPart } from '@/domain/valueobjects/song'

import { QUERY_KEY } from './key'

function evictDeletedSongFromListCaches(queryClient: ReturnType<typeof useQueryClient>, songId: string): void {
  queryClient.setQueriesData<PageResult<Song>>(
    { queryKey: ['song', 'page'] },
    (previous: PageResult<Song> | undefined): PageResult<Song> | undefined => {
      if (previous === undefined) {
        return undefined
      }
      const nextItems: Song[] = previous.items.filter((item: Song): boolean => item.id !== songId)
      if (nextItems.length === previous.items.length) {
        return previous
      }
      const removed: number = previous.items.length - nextItems.length
      const nextTotalItems: number = Math.max(0, previous.totalItems - removed)
      const nextTotalPages: number = Math.max(1, Math.ceil(nextTotalItems / previous.size))
      return {
        ...previous,
        items: nextItems,
        totalItems: nextTotalItems,
        totalPages: nextTotalPages,
      }
    }
  )

  queryClient.setQueriesData<Song[]>(
    { queryKey: QUERY_KEY.SONG.LIST_ALL },
    (previous: Song[] | undefined): Song[] | undefined => {
      if (previous === undefined) {
        return undefined
      }
      const next: Song[] = previous.filter((item: Song): boolean => item.id !== songId)
      return next.length === previous.length ? previous : next
    }
  )

  queryClient.setQueriesData<Song[]>(
    { queryKey: ['song', 'partial'] },
    (previous: Song[] | undefined): Song[] | undefined => {
      if (previous === undefined) {
        return undefined
      }
      const next: Song[] = previous.filter((item: Song): boolean => item.id !== songId)
      return next.length === previous.length ? previous : next
    }
  )

  queryClient.setQueriesData<Song[]>(
    { queryKey: ['song', 'list', 'title'] },
    (previous: Song[] | undefined): Song[] | undefined => {
      if (previous === undefined) {
        return undefined
      }
      const next: Song[] = previous.filter((item: Song): boolean => item.id !== songId)
      return next.length === previous.length ? previous : next
    }
  )
}

async function invalidateSongListQueries(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.LIST_ALL, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['song', 'page'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['song', 'partial'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['song', 'list'], refetchType: 'all' }),
  ])
}

export function useListSongs(params: { title: string }) {
  return useQuery({
    queryKey: QUERY_KEY.SONG.LIST(params.title),
    queryFn: () => songUseCase.listSongs(params),
  })
}

export function useListAllSongs() {
  return useQuery({
    queryKey: QUERY_KEY.SONG.LIST_ALL,
    queryFn: () => songUseCase.listAllSongs(),
  })
}

export function useListSongsPage(query: PagingQuery) {
  return useQuery({
    queryKey: QUERY_KEY.SONG.PAGE(query.page, query.size, query.sort),
    queryFn: () => songUseCase.listSongsPage(query),
  })
}

export function useListSongsPartial(size: number) {
  return useQuery({
    queryKey: QUERY_KEY.SONG.PARTIAL(size),
    queryFn: () => songUseCase.listSongsPartial(size),
    enabled: size > 0,
  })
}

export interface ScrapeSearchSongsQueryParams {
  readonly title: string
  readonly artist: string
  readonly page: number
  readonly enabled: boolean
}

export function useScrapeSearchSongs(params: ScrapeSearchSongsQueryParams) {
  const trimmedTitle: string = params.title.trim()
  const trimmedArtist: string = params.artist.trim()
  const artistForRequest: string | null = trimmedArtist.length > 0 ? trimmedArtist : null

  return useQuery({
    queryKey: QUERY_KEY.SONG.SCRAPE_SEARCH(trimmedTitle, trimmedArtist, params.page),
    queryFn: (): Promise<ScrapeSearchSongsResult> =>
      songUseCase.scrapeSearchSongs({
        title: trimmedTitle,
        ...(artistForRequest !== null ? { artist: artistForRequest } : {}),
        page: params.page,
      }),
    enabled: params.enabled && trimmedTitle.length > 0,
  })
}

export function useScrapeLyrics() {
  return useMutation({
    mutationFn: (params: { title: string; artist?: string | null }) => songUseCase.scrapeLyrics(params),
  })
}

export function useSaveSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: { userId: string; title: string; artist?: string | null; lyrics: LyricsPart[] }) =>
      songUseCase.saveSong(requestBody),
    onSuccess: async (data): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.GET_LYRICS(data.song.id) })
      await invalidateSongListQueries(queryClient)
    },
  })
}

export function useGetLyrics(songId: string) {
  return useQuery({
    queryKey: QUERY_KEY.SONG.GET_LYRICS(songId),
    queryFn: () => songUseCase.getLyrics(songId),
    enabled: songId.length > 0,
  })
}

export function usePatchSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      songId,
      requestBody,
    }: {
      songId: string
      requestBody: { userId: string; title?: string; artist?: string | null }
    }) => songUseCase.patchSong(songId, requestBody),
    onSuccess: async (): Promise<void> => {
      await invalidateSongListQueries(queryClient)
    },
  })
}

export function usePatchLyrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ songId, requestBody }: { songId: string; requestBody: { lyrics: LyricsPart[] } }) =>
      songUseCase.patchLyrics(songId, requestBody),
    onSuccess: (_, { songId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.GET_LYRICS(songId) })
    },
  })
}

export function useDeleteSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (songId: string) => songUseCase.deleteSong(songId),
    onSuccess: async (_void, songId: string): Promise<void> => {
      evictDeletedSongFromListCaches(queryClient, songId)
      queryClient.removeQueries({ queryKey: QUERY_KEY.SONG.GET_LYRICS(songId) })
      await invalidateSongListQueries(queryClient)
    },
  })
}
