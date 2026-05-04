import { httpClient } from '@/api/client'
import { buildPagingSearchParams, type PageResult, type PagingQuery } from '@/domain/list-query'
import type { ScrapeLyricsPreview, ScrapeSearchSongsResult, Song } from '@/domain/models/song'
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
  SaveSongRequestWire,
  SaveSongResponseWire,
  ScrapeLyricsResponseWire,
  ScrapeSearchSongsResponseWire,
  SongPageResponse,
} from './messages/remote-song-message'
import { toScrapeSearchSongsResult, toSong } from './messages/remote-song-message'

/** `GET /song/list-songs/page?page&size&sort` */
const songListPagePath: string = '/song/list-songs/page'

/** `GET /song/list-songs/partial?size=` */
const songPartialPath: string = '/song/list-songs/partial'

/** `GET /song/scrape-search-songs?title&artist&page` */
const songScrapeSearchSongsPath: string = '/song/scrape-search-songs'

/** `GET /song/lyrics/scrape?title&artist` */
const songLyricsScrapePath: string = '/song/lyrics/scrape'

/** `POST /song/save` */
const songSavePath: string = '/song/save'

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

  async scrapeSearchSongs(params: {
    title: string
    artist?: string | null
    page: number
  }): Promise<ScrapeSearchSongsResult> {
    const search: URLSearchParams = new URLSearchParams()
    search.set('title', params.title)
    search.set('artist', params.artist ?? '')
    search.set('page', String(params.page))
    const { response } = await httpClient.get<ScrapeSearchSongsResponseWire>(songScrapeSearchSongsPath, undefined, search)
    return toScrapeSearchSongsResult(response)
  }

  async scrapeLyrics(params: { title: string; artist?: string | null }): Promise<ScrapeLyricsPreview> {
    const search: URLSearchParams = new URLSearchParams()
    search.set('title', params.title)
    search.set('artist', params.artist ?? '')
    const { response } = await httpClient.get<ScrapeLyricsResponseWire>(songLyricsScrapePath, undefined, search)
    return {
      matchedArtist: response.artist,
      lyrics: response.lyrics,
    }
  }

  async saveSong(requestBody: {
    userId: string
    title: string
    artist?: string | null
    lyrics: LyricsPart[]
  }): Promise<{ song: Song; lyrics: Lyrics }> {
    const { response } = await httpClient.post<SaveSongRequestWire, SaveSongResponseWire>(songSavePath, requestBody)
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
