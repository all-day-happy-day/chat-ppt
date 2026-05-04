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
  /** Title slide: placeholder shape id for sermon title text. */
  titleSermonTitlePlaceholderShapeId?: string | null
  /** Title slide: placeholder shape id for scripture range text. */
  titleScriptureRangePlaceholderShapeId?: string | null
  /** Title slide: placeholder shape id for preacher text. */
  titlePreacherPlaceholderShapeId?: string | null
  /** Phrase slide: placeholder shape id for main scripture phrase text. */
  phraseTextPlaceholderShapeId?: string | null
  /** Phrase slide: placeholder shape id for scripture range text. */
  phraseScriptureRangePlaceholderShapeId?: string | null
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
  /** Title slide: placeholder `shapeId` (int) that receives title text. */
  titlePlaceholderShapeId?: number | null
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
