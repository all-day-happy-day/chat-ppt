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
  lyricsPartSequence: number[]
  lyricsPartsConfigured: boolean
}

export interface LyricsContents {
  type: 'LYRICS'
  contents: LyricsContent[]
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
