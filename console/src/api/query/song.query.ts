import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { songUseCase } from '@/di/usecases'
import type { LyricsPart } from '@/domain/valueobjects/song'

import { QUERY_KEY } from './key'

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

export function useScrapeLyrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: { title: string; artist?: string | null; overwrite?: boolean }) =>
      songUseCase.scrapeLyrics(requestBody),
    onSuccess: (_, requestBody) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.LIST(requestBody.title) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.LIST_ALL })
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
      requestBody: { title?: string; artist?: string | null }
    }) => songUseCase.patchSong(songId, requestBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.LIST_ALL })
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.SONG.LIST_ALL })
    },
  })
}
