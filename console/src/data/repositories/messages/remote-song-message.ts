import type { Song } from '@/domain/models/song'
import type { Lyrics, LyricsPart } from '@/domain/valueobjects/song'

interface BaseLyricsResponse {
  song: Song
  lyrics: Lyrics
}

// ListSongs
export type ListSongsResponse = {
  songs: Song[]
}

// ListAllSongs
export type ListAllSongsResponse = {
  songs: Song[]
}

// ScrapeLyrics
export type ScrapeLyricsRequest = {
  title: string
  artist?: string | null
  overwrite?: boolean
}
export type ScrapeLyricsResponse = BaseLyricsResponse

// GetLyrics
export type GetLyricsResponse = BaseLyricsResponse

// PatchSong
export type PatchSongRequest = {
  title?: string | undefined
  artist?: string | null | undefined
}
export type PatchSongResponse = {
  song: Song
}

// PatchLyrics
export type PatchLyricsRequest = {
  lyrics: LyricsPart[]
}
export type PatchLyricsResponse = {
  lyrics: Lyrics
}

// DeleteSong
