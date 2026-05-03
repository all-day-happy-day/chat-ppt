import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { songUseCase } from '@/di/usecases'
import type { PagingQuery } from '@/domain/list-query'
import type { LyricsPart } from '@/domain/valueobjects/song'

import { QUERY_KEY } from './key'

function invalidateSongLists(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.LIST_ALL })
  queryClient.invalidateQueries({ queryKey: ['song', 'page'] })
  queryClient.invalidateQueries({ queryKey: ['song', 'partial'] })
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

export function useScrapeLyrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: {
      userId: string
      title: string
      artist?: string | null
      overwrite?: boolean
    }) => songUseCase.scrapeLyrics(requestBody),
    onSuccess: (_, requestBody) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.LIST(requestBody.title) })
      invalidateSongLists(queryClient)
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
    onSuccess: () => {
      invalidateSongLists(queryClient)
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
    onSuccess: () => {
      invalidateSongLists(queryClient)
    },
  })
}
