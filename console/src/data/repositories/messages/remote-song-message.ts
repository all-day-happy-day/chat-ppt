import type { Song } from '@/domain/models/song'
import type { Lyrics, LyricsPart } from '@/domain/valueobjects/song'

export type SongWire = {
  id: string
  title: string
  artist: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export function toSong(wire: SongWire): Song {
  return {
    id: wire.id,
    title: wire.title,
    artist: wire.artist,
    userId: wire.userId,
    createdAt: new Date(wire.createdAt),
    updatedAt: new Date(wire.updatedAt),
  }
}

interface BaseLyricsResponse {
  song: SongWire
  lyrics: Lyrics
}

// ListSongs
export type ListSongsResponse = {
  songs: SongWire[]
}

// ListAllSongs
export type ListAllSongsResponse = {
  songs: SongWire[]
}

// ScrapeLyrics
export type ScrapeLyricsRequest = {
  userId: string
  title: string
  artist?: string | null
  overwrite?: boolean
}
export type ScrapeLyricsResponse = BaseLyricsResponse

// GetLyrics
export type GetLyricsResponse = BaseLyricsResponse

// PatchSong
export type PatchSongRequest = {
  userId: string
  title?: string | undefined
  artist?: string | null | undefined
}
export type PatchSongResponse = {
  song: SongWire
}

// PatchLyrics
export type PatchLyricsRequest = {
  lyrics: LyricsPart[]
}
export type PatchLyricsResponse = {
  lyrics: Lyrics
}

// DeleteSong

/** `Page[GetSongsResponse]`: each item is one `GetSongsResponse` (typically one song per item). */
export type SongPageResponse = {
  items: ListSongsResponse[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
