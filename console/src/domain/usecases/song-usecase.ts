import type { PageResult, PagingQuery } from '../list-query'
import type { ScrapeLyricsPreview, ScrapeSearchSongsResult,Song } from '../models/song'
import type { SongRepository } from '../repositories/song-repository'
import type { Lyrics, LyricsPart } from '../valueobjects/song'

export class SongUseCase {
  private readonly songRepository: SongRepository

  constructor(songRepository: SongRepository) {
    this.songRepository = songRepository
  }

  async listSongs(params: { title: string }): Promise<Song[]> {
    return this.songRepository.listSongs(params)
  }

  async listAllSongs(): Promise<Song[]> {
    return this.songRepository.listAllSongs()
  }

  async listSongsPage(query: PagingQuery): Promise<PageResult<Song>> {
    return this.songRepository.listSongsPage(query)
  }

  async listSongsPartial(size: number): Promise<Song[]> {
    return this.songRepository.listSongsPartial(size)
  }

  async scrapeSearchSongs(params: {
    title: string
    artist?: string | null
    page: number
  }): Promise<ScrapeSearchSongsResult> {
    return this.songRepository.scrapeSearchSongs(params)
  }

  async scrapeLyrics(params: { title: string; artist?: string | null }): Promise<ScrapeLyricsPreview> {
    return this.songRepository.scrapeLyrics(params)
  }

  async saveSong(requestBody: {
    userId: string
    title: string
    artist?: string | null
    lyrics: LyricsPart[]
  }): Promise<{ song: Song; lyrics: Lyrics }> {
    return this.songRepository.saveSong(requestBody)
  }

  async getLyrics(songId: string): Promise<{ song: Song; lyrics: Lyrics }> {
    return this.songRepository.getLyrics(songId)
  }

  async patchSong(
    songId: string,
    requestBody: { userId: string; title?: string; artist?: string | null }
  ): Promise<Song> {
    return this.songRepository.patchSong(songId, requestBody)
  }

  async patchLyrics(songId: string, requestBody: { lyrics: LyricsPart[] }): Promise<Lyrics> {
    return this.songRepository.patchLyrics(songId, requestBody)
  }

  async deleteSong(songId: string): Promise<void> {
    return this.songRepository.deleteSong(songId)
  }
}
