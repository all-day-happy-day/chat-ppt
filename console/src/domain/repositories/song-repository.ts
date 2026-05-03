import type { Song } from '@/domain/models/song'
import type { Lyrics, LyricsPart } from '@/domain/valueobjects/song'

export abstract class SongRepository {
  abstract listSongs(params: { title: string }): Promise<Song[]>
  abstract listAllSongs(): Promise<Song[]>
  abstract scrapeLyrics(requestBody: {
    title: string
    artist?: string | null
    overwrite?: boolean
  }): Promise<{ song: Song; lyrics: Lyrics }>
  abstract getLyrics(songId: string): Promise<{ song: Song; lyrics: Lyrics }>
  abstract patchSong(songId: string, requestBody: { title?: string; artist?: string | null }): Promise<Song>
  abstract patchLyrics(songId: string, requestBody: { lyrics: LyricsPart[] }): Promise<Lyrics>
  abstract deleteSong(songId: string): Promise<void>
}
