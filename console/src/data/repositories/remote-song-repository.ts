import { httpClient } from '@/api/client'
import { buildPagingSearchParams, type PageResult, type PagingQuery } from '@/domain/list-query'
import type { Song } from '@/domain/models/song'
import type { SongRepository } from '@/domain/repositories/song-repository'
import type { Lyrics, LyricsPart } from '@/domain/valueobjects/song'

import type {
  GetLyricsResponse,
  ListAllSongsResponse,
  ListSongsResponse,
  PatchLyricsRequest,
  PatchLyricsResponse,
  PatchSongRequest,
  PatchSongResponse,
  ScrapeLyricsRequest,
  ScrapeLyricsResponse,
  SongPageResponse,
} from './messages/remote-song-message'
import { toSong } from './messages/remote-song-message'

/** `GET /song/list-songs/page?page&size&sort` */
const songListPagePath: string = '/song/list-songs/page'

/** `GET /song/list-songs/partial?size=` */
const songPartialPath: string = '/song/list-songs/partial'

function pageItemsToSongs(items: ListSongsResponse[]): Song[] {
  return items.flatMap((cell: ListSongsResponse): Song[] => cell.songs.map((row) => toSong(row)))
}

export class RemoteSongRepository implements SongRepository {
  async listSongs(params: { title: string }): Promise<Song[]> {
    const { response } = await httpClient.get<ListSongsResponse>(`/song/list-songs?title=${params.title}`)
    return response.songs.map((row) => toSong(row))
  }

  async listAllSongs(): Promise<Song[]> {
    const { response } = await httpClient.get<ListAllSongsResponse>(`/song/list-all-songs`)
    return response.songs.map((row) => toSong(row))
  }

  async listSongsPage(query: PagingQuery): Promise<PageResult<Song>> {
    const { response } = await httpClient.get<SongPageResponse>(
      songListPagePath,
      undefined,
      buildPagingSearchParams(query)
    )
    return {
      items: pageItemsToSongs(response.items),
      page: response.page,
      size: response.size,
      totalItems: response.totalItems,
      totalPages: response.totalPages,
    }
  }

  async listSongsPartial(size: number): Promise<Song[]> {
    const params: URLSearchParams = new URLSearchParams()
    params.set('size', String(size))
    const { response } = await httpClient.get<ListSongsResponse>(songPartialPath, undefined, params)
    return response.songs.map((row) => toSong(row))
  }

  async scrapeLyrics(requestBody: {
    userId: string
    title: string
    artist?: string | null
    overwrite?: boolean
  }): Promise<{ song: Song; lyrics: Lyrics }> {
    const { response } = await httpClient.post<ScrapeLyricsRequest, ScrapeLyricsResponse>(
      `/song/lyrics/scrape`,
      requestBody
    )
    return { song: toSong(response.song), lyrics: response.lyrics }
  }

  async getLyrics(songId: string): Promise<{ song: Song; lyrics: Lyrics }> {
    const { response } = await httpClient.get<GetLyricsResponse>(`/song/lyrics/get/${songId}`)
    return { song: toSong(response.song), lyrics: response.lyrics }
  }

  async patchSong(
    songId: string,
    requestBody: { userId: string; title?: string; artist?: string | null }
  ): Promise<Song> {
    const { response } = await httpClient.patch<PatchSongRequest, PatchSongResponse>(`/song/${songId}`, requestBody)
    return toSong(response.song)
  }

  async patchLyrics(songId: string, requestBody: { lyrics: LyricsPart[] }): Promise<Lyrics> {
    const { response } = await httpClient.patch<PatchLyricsRequest, PatchLyricsResponse>(
      `/song/lyrics/${songId}`,
      requestBody
    )
    return response.lyrics
  }

  async deleteSong(songId: string): Promise<void> {
    await httpClient.delete<void>(`/song/${songId}`)
  }
}
