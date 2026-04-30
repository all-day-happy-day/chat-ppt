import { httpClient } from '@/api/client'
import type { Song } from '@/domain/models/song'
import type { SongRepository } from '@/domain/repositories/song-repository'
import type { Lyrics, LyricsPart } from '@/domain/valueobjects/lyrics'

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
} from './messages/remote-song-message'

export class RemoteSongRepository implements SongRepository {
  async listSongs(params: { title: string }): Promise<Song[]> {
    const { response } = await httpClient.get<ListSongsResponse>(`/song/list-songs?title=${params.title}`)
    return response.songs
  }

  async listAllSongs(): Promise<Song[]> {
    const { response } = await httpClient.get<ListAllSongsResponse>(`/song/list-all-songs`)
    return response.songs
  }

  async scrapeLyrics(requestBody: {
    title: string
    artist?: string | null
    overwrite?: boolean
  }): Promise<{ song: Song; lyrics: Lyrics }> {
    const { response } = await httpClient.post<ScrapeLyricsRequest, ScrapeLyricsResponse>(
      `/song/lyrics/scrape`,
      requestBody
    )
    return { song: response.song, lyrics: response.lyrics }
  }

  async getLyrics(songId: string): Promise<{ songId: string; lyrics: Lyrics }> {
    const { response } = await httpClient.get<GetLyricsResponse>(`/song/lyrics/get/${songId}`)
    return { songId, lyrics: response.lyrics }
  }

  async patchSong(songId: string, requestBody: { title?: string; artist?: string | null }): Promise<Song> {
    const { response } = await httpClient.patch<PatchSongRequest, PatchSongResponse>(`/song/${songId}`, requestBody)
    return response.song
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
