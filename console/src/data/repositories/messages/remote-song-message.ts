import type { ScrapeSearchSongHit, ScrapeSearchSongsResult, Song } from '@/domain/models/song'
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

// Scrape lyrics preview (GET)
export type ScrapeLyricsResponseWire = {
  title: string
  artist: string
  lyrics: LyricsPart[]
}

// GetLyrics
export type GetLyricsResponse = BaseLyricsResponse

// Save song (POST)
export type SaveSongRequestWire = {
  userId: string
  title: string
  artist?: string | null
  lyrics: LyricsPart[]
}
export type SaveSongResponseWire = BaseLyricsResponse

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

/** `GET /song/scrape-search-songs` — each song is `[title, artist, lyrics | null]`. */
export type ScrapeSearchSongsResponseWire = {
  songs: unknown[]
  page: number
  size: number
}

function parseScrapeSearchSongRow(raw: unknown): ScrapeSearchSongHit | null {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return null
  }
  const titleVal: unknown = raw[0]
  const artistVal: unknown = raw[1]
  const lyricsVal: unknown = raw[2]
  const title: string = typeof titleVal === 'string' ? titleVal : String(titleVal ?? '')
  const artist: string | null =
    artistVal == null || artistVal === '' ? null : typeof artistVal === 'string' ? artistVal : String(artistVal)
  const lyricsText: string | null =
    lyricsVal == null ? null : typeof lyricsVal === 'string' ? lyricsVal : String(lyricsVal)
  return { title, artist, lyricsText }
}

export function toScrapeSearchSongsResult(wire: ScrapeSearchSongsResponseWire): ScrapeSearchSongsResult {
  const items: ScrapeSearchSongHit[] = []
  for (const row of wire.songs) {
    const hit: ScrapeSearchSongHit | null = parseScrapeSearchSongRow(row)
    if (hit !== null) {
      items.push(hit)
    }
  }
  return { items, page: wire.page, size: wire.size }
}

/** `Page[GetSongsResponse]`: each item is one `GetSongsResponse` (typically one song per item). */
export type SongPageResponse = {
  items: ListSongsResponse[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
