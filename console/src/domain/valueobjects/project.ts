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
  start: BibleContent | null
  end: BibleContent | null
}

export interface BibleContents {
  type: 'BIBLE'
  contents: BibleContentRange[]
  /** Phrase slide: placeholder `shapeId` (int) that receives phrase text. */
  phrasePlaceholderId: number
  /** Phrase slide: optional placeholder `shapeId` (int) for scripture range text. */
  phraseRangePlaceholderId?: number | null
  /** Title slide: optional static text by placeholder `shapeId` (int); values may include variables. */
  titlePlaceholderValues: Readonly<Record<number, string>>
}

export interface LyricsContent {
  title: string
  lyrics: LyricsPart[]
  artist: string | null
  /** Library song id when this card is linked to saved lyrics in `/song/lyrics/...`. */
  songId?: string | null
  lyricsPartSequence: number[]
  lyricsPartsConfigured: boolean
  /** When a title layout is set, whether this song uses the title slide (default true). */
  includeTitleSlide?: boolean
}

export interface LyricsContents {
  type: 'LYRICS'
  contents: LyricsContent[]
  /** Lyrics slide: placeholder `shapeId` (int) that receives lyrics text. */
  lyricsPlaceholderShapeId: number
  /** Title slide: placeholder `shapeId` (int), nullable when no title slot is used. */
  titlePlaceholderShapeId: number | null
  /** @deprecated Synced from the first song's `includeTitleSlide` for older consumers. */
  includeTitleForFirstCard?: boolean
}

export interface PlainContents {
  type: 'PLAIN'
}

export interface ValueContent {
  placeholderName: string
  /** Layout `shapeId` (int) — unique; editor highlight + disambiguation when `placeholderName` collides. */
  placeholderShapeId: number
  value: string | null
}

export interface ValueContents {
  type: 'VALUE'
  contents: ValueContent[]
}
