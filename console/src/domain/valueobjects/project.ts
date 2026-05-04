import type { AvailableBibleVersion } from '../enums/project'

import type { LyricsPart } from './song'

export interface BibleContent {
  version: AvailableBibleVersion
  book: string
  chapter: number
  verse: number
}

export interface BibleContentRange {
  type: 'phrase' | 'title'
  start: BibleContent
  end: BibleContent | null
}

export interface BibleContents {
  type: 'BIBLE'
  contents: BibleContentRange[]
}

export interface LyricsContent {
  title: string
  lyrics: LyricsPart[]
  artist: string | null
  /** Library song id when this card is linked to saved lyrics in `/song/lyrics/...`. */
  matchedBackendSongId?: string | null
  lyricsPartSequence: number[]
  lyricsPartsConfigured: boolean
  /** When a title layout is set, whether this song uses the title slide (default true). */
  includeTitleSlide?: boolean
}

export interface LyricsContents {
  type: 'LYRICS'
  contents: LyricsContent[]
  /**
   * Subset of placeholder shape ids on the lyrics layout that receive lyric text.
   * Omit or null means all placeholders on the selected layout.
   */
  lyricsPlaceholderShapeIds?: string[] | null
  /** @deprecated Synced from the first song's `includeTitleSlide` for older consumers. */
  includeTitleForFirstCard?: boolean
}

export interface PlainContents {
  type: 'PLAIN'
}

export interface ValueContent {
  placeholderName: string
  /** Layout shape id — unique; editor highlight + disambiguation when `placeholderName` collides. Omitted in API payload. */
  placeholderShapeId?: string | null
  value: string | null
}

export interface ValueContents {
  type: 'VALUE'
  contents: ValueContent[]
}
