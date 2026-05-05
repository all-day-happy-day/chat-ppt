import type { LyricsPart } from '../valueobjects/song'

export interface Song {
  id: string
  title: string
  artist: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
}

/** One row from `GET /song/scrape-search-songs` (tuple: title, artist, lyrics). */
export interface ScrapeSearchSongHit {
  readonly title: string
  readonly artist: string | null
  readonly lyricsText: string | null
}

export interface ScrapeSearchSongsResult {
  readonly items: readonly ScrapeSearchSongHit[]
  readonly page: number
  readonly size: number
}

/** Preview-only result of `GET /song/lyrics/scrape` (not persisted). */
export interface ScrapeLyricsPreview {
  readonly matchedArtist: string
  readonly lyrics: readonly LyricsPart[]
}
