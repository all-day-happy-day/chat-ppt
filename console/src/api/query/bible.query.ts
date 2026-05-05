import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { httpClient } from '@/api/client'
import type { AvailableBibleVersion } from '@/domain/enums/project'

import { QUERY_KEY } from './key'

interface GetBooksResponse {
  readonly books: string[]
}

interface GetChaptersResponse {
  readonly chapters: number[]
}

interface GetVersesResponse {
  readonly verses: number[]
}

export function useBibleBooks(version: AvailableBibleVersion | null): UseQueryResult<string[], Error> {
  return useQuery<string[]>({
    queryKey: QUERY_KEY.BIBLE.BOOKS(version ?? ''),
    queryFn: async (): Promise<string[]> => {
      if (version === null || version.length === 0) {
        return []
      }
      const { response } = await httpClient.get<GetBooksResponse>(`/bible/books/${encodeURIComponent(version)}`)
      return response.books
    },
    enabled: version !== null && version.length > 0,
  })
}

export function useBibleChapters(
  version: AvailableBibleVersion | null,
  book: string | null
): UseQueryResult<number[], Error> {
  const bookKey: string = book?.trim() ?? ''
  return useQuery<number[]>({
    queryKey: QUERY_KEY.BIBLE.CHAPTERS(version ?? '', bookKey),
    queryFn: async (): Promise<number[]> => {
      if (version === null || version.length === 0 || bookKey.length === 0) {
        return []
      }
      const { response } = await httpClient.get<GetChaptersResponse>(
        `/bible/chapters/${encodeURIComponent(version)}/${encodeURIComponent(bookKey)}`
      )
      return [...response.chapters].sort((a: number, b: number): number => a - b)
    },
    enabled: version !== null && version.length > 0 && bookKey.length > 0,
  })
}

export function useBibleVerses(
  version: AvailableBibleVersion | null,
  book: string | null,
  chapter: number | null
): UseQueryResult<number[], Error> {
  const bookKey: string = book?.trim() ?? ''
  return useQuery<number[]>({
    queryKey: QUERY_KEY.BIBLE.VERSES(version ?? '', bookKey, chapter ?? -1),
    queryFn: async (): Promise<number[]> => {
      if (
        version === null ||
        version.length === 0 ||
        bookKey.length === 0 ||
        chapter === null ||
        !Number.isInteger(chapter)
      ) {
        return []
      }
      const { response } = await httpClient.get<GetVersesResponse>(
        `/bible/verses/${encodeURIComponent(version)}/${encodeURIComponent(bookKey)}/${String(chapter)}`
      )
      return [...response.verses].sort((a: number, b: number): number => a - b)
    },
    enabled:
      version !== null &&
      version.length > 0 &&
      bookKey.length > 0 &&
      chapter !== null &&
      Number.isInteger(chapter),
  })
}
