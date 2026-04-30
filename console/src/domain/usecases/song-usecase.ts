import type { Song } from '../models/song'
import type { SongRepository } from '../repositories/song-repository'
import type { Lyrics } from '../valueobjects/lyrics'

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

  async scrapeLyrics(requestBody: {
    title: string
    artist?: string | null
    overwrite?: boolean
  }): Promise<{ song: Song; lyrics: Lyrics }> {
    return this.songRepository.scrapeLyrics(requestBody)
  }

  async getLyrics(songId: string): Promise<{ songId: string; lyrics: Lyrics }> {
    return this.songRepository.getLyrics(songId)
  }

  async patchSong(songId: string, requestBody: { title?: string; artist?: string | null }): Promise<Song> {
    return this.songRepository.patchSong(songId, requestBody)
  }

  async patchLyrics(songId: string, requestBody: { lyrics: Lyrics['lyrics'] }): Promise<Lyrics> {
    return this.songRepository.patchLyrics(songId, requestBody)
  }

  async deleteSong(songId: string): Promise<void> {
    return this.songRepository.deleteSong(songId)
  }
}
