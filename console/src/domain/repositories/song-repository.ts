import type { PageResult, PagingQuery } from '@/domain/list-query'
import type { ScrapeLyricsPreview, ScrapeSearchSongsResult,Song } from '@/domain/models/song'
import type { Lyrics, LyricsPart } from '@/domain/valueobjects/song'

export abstract class SongRepository {
  abstract listSongs(params: { title: string }): Promise<Song[]>
  abstract listAllSongs(): Promise<Song[]>
  abstract listSongsPage(query: PagingQuery): Promise<PageResult<Song>>
  abstract listSongsPartial(size: number): Promise<Song[]>
  /** Bugs track search page; items are variable-length per response. */
  abstract scrapeSearchSongs(params: {
    title: string
    artist?: string | null
    page: number
  }): Promise<ScrapeSearchSongsResult>
  abstract scrapeLyrics(params: { title: string; artist?: string | null }): Promise<ScrapeLyricsPreview>
  abstract saveSong(requestBody: {
    userId: string
    title: string
    artist?: string | null
    lyrics: LyricsPart[]
  }): Promise<{ song: Song; lyrics: Lyrics }>
  abstract getLyrics(songId: string): Promise<{ song: Song; lyrics: Lyrics }>
  abstract patchSong(
    songId: string,
    requestBody: { userId: string; title?: string; artist?: string | null }
  ): Promise<Song>
  abstract patchLyrics(songId: string, requestBody: { lyrics: LyricsPart[] }): Promise<Lyrics>
  abstract deleteSong(songId: string): Promise<void>
}
