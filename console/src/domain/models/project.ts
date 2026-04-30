import type { BibleContents, LyricsContents, PlainContents, ValueContents } from '../valueobjects/project'

interface BasePart {
  id: string
  projectId: string
  containerId: string
  order: number
}

export interface BiblePart extends BasePart {
  type: 'BIBLE'
  content: BibleContents
}

export interface LyricsPart extends BasePart {
  type: 'LYRICS'
  content: LyricsContents
  lyricsLayoutId: string | null
  titleLayoutId: string | null
}

export interface PlainPart extends BasePart {
  type: 'PLAIN'
  contents: PlainContents
  layoutId: string | null
}

export interface ValuePart extends BasePart {
  type: 'VALUE'
  contents: ValueContents
  layoutId: string | null
}

export type Part = BiblePart | LyricsPart | PlainPart | ValuePart

export interface Project {
  id: string
  templateId: string
  userId: string
  name: string
  createdAt: Date
  updatedAt: Date
  parts: (BiblePart | LyricsPart | PlainPart | ValuePart)[]
}

export interface ProjectContainer {
  id: string
  projectId: string
  containerName: string
  createdAt: Date
  updatedAt: Date
  completed: boolean
  parts: (BiblePart | LyricsPart | PlainPart | ValuePart)[]
}

export interface BasePartRequestBody {
  id: string
  order: number
}

export interface BiblePartRequestBody extends BasePartRequestBody {
  type: 'BIBLE'
  contents: BibleContents
  phraseLayoutId: string | null
  titleLayoutId: string | null
}

export interface LyricsPartRequestBody extends BasePartRequestBody {
  type: 'LYRICS'
  contents: LyricsContents
  lyricsLayoutId: string | null
  titleLayoutId: string | null
}

export interface PlainPartRequestBody extends BasePartRequestBody {
  type: 'PLAIN'
  contents: PlainContents
  layoutId: string | null
}

export interface ValuePartRequestBody extends BasePartRequestBody {
  type: 'VALUE'
  contents: ValueContents
  layoutId: string | null
}

export type PartRequestBody = BiblePartRequestBody | LyricsPartRequestBody | PlainPartRequestBody | ValuePartRequestBody
