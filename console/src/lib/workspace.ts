import { buildProjectPartsPatchPayload } from '@/App/authenticated/project-view/build-project-parts-patch-payload'
import {
  normalizeBiblePartForStore,
  normalizeLyricsPartForStore,
} from '@/App/authenticated/project-view/build-project-parts-patch-payload'
import type { Layout, Shape } from '@/domain/models/powerpoint'
import { shapePlaceholderApiName } from '@/domain/models/powerpoint'
import type { Part, PartRequestBody, Project, ProjectContainer, ValuePart } from '@/domain/models/project'
import type { Size } from '@/domain/valueobjects/powerpoint'
import type { BibleContents, LyricsContent, LyricsContents } from '@/domain/valueobjects/project'

import type { TFunction } from 'i18next'

export type PartKind = Part['type']

export interface LocalSlide {
  readonly id: string
  readonly partType: PartKind
}

/** Client-side mirror of server parts for PATCH + editor; keyed by part id (ULID). */
export type PartsRecord = Record<string, Part>

export const PART_KINDS: readonly PartKind[] = ['VALUE', 'PLAIN', 'LYRICS', 'BIBLE'] as const

/** Before sidebar list width is measured; also used if ref is missing. */
export const SIDEBAR_THUMB_SLIDE_WIDTH_FALLBACK_PX: number = 108

/**
 * Subtract from list inner width for: index column, grid gap, thumbnail column horizontal padding
 * (`px-1.5`), and a little air so ring/border does not clip at the scrollbar edge.
 */
export const SIDEBAR_THUMB_LAYOUT_RESERVE_PX: number = 44

/** Single-line caption row + `gap-1` above slide; keep in sync with `StagePartLayoutCaption` + flex gap. */
export const MAIN_STAGE_PREVIEW_TOP_CHROME_PX = 20
/** Card horizontal padding; vertical kept smaller so preview sits higher. */
export const MAIN_STAGE_CARD_EDGE_PADDING_PX = 8
export const MAIN_STAGE_CARD_PADDING_TOP_PX = 4
export const MAIN_STAGE_CARD_PADDING_BOTTOM_PX = 8

/** `height / width` for the main stage when no template layout is selected. */
export const DEFAULT_STAGE_ASPECT_HW = 9 / 16

export function partsRecordFromParts(parts: readonly Part[]): PartsRecord {
  const out: PartsRecord = {}
  for (const p of parts) {
    if (p.type === 'LYRICS') {
      out[p.id] = normalizeLyricsPartForStore(p)
      continue
    }
    if (p.type === 'BIBLE') {
      out[p.id] = normalizeBiblePartForStore(p)
      continue
    }
    out[p.id] = p
  }
  return out
}

export function partsPatchPayloadFromProject(project: Project): PartRequestBody[] {
  const sorted: Part[] = [...project.parts].sort((a: Part, b: Part): number => a.order - b.order)
  const localSlides: LocalSlide[] = sorted.map((p: Part): LocalSlide => ({ id: p.id, partType: p.type }))
  const partsById: Map<string, Part> = new Map(sorted.map((p: Part): readonly [string, Part] => [p.id, p]))
  return buildProjectPartsPatchPayload(localSlides, partsById)
}

export function createSyntheticPartForInsert(id: string, kind: PartKind, projectId: string, containerId: string): Part {
  const base: Pick<Part, 'id' | 'projectId' | 'containerId' | 'order'> = {
    id,
    projectId,
    containerId,
    order: 0,
  }
  switch (kind) {
    case 'PLAIN':
      return { ...base, type: 'PLAIN', contents: { type: 'PLAIN' }, layoutId: null }
    case 'VALUE':
      return {
        ...base,
        type: 'VALUE',
        contents: {
          type: 'VALUE',
          contents: [],
        },
        layoutId: null,
      }
    case 'LYRICS':
      return {
        ...base,
        type: 'LYRICS',
        contents: {
          type: 'LYRICS',
          contents: [],
          lyricsPlaceholderShapeId: 0,
          titlePlaceholderShapeId: null,
          includeTitleForFirstCard: true,
        },
        lyricsLayoutId: null,
        titleLayoutId: null,
      }
    case 'BIBLE':
      return {
        ...base,
        type: 'BIBLE',
        contents: {
          type: 'BIBLE',
          contents: [],
          phrasePlaceholderId: 0,
          phraseRangePlaceholderId: null,
          titlePlaceholderValues: {},
        },
        phraseLayoutId: null,
        titleLayoutId: null,
      }
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unexpected part kind: ${String(_exhaustive)}`)
    }
  }
}

export function normalizeTitlePlaceholderValues(
  raw: Readonly<Record<number, string>> | null | undefined
): Readonly<Record<number, string>> {
  if (raw === null || raw === undefined) {
    return {}
  }
  const out: Record<number, string> = {}
  const entries: Array<readonly [string, string]> = Object.entries(raw as Readonly<Record<string, string>>)
  for (const [key, value] of entries) {
    const shapeId: number = Number.parseInt(key, 10)
    if (!Number.isInteger(shapeId) || shapeId <= 0) {
      continue
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      continue
    }
    out[shapeId] = value
  }
  return out
}

export function mergeServerPartWithLocalFallback(serverPart: Part, localPart: Part | undefined): Part {
  if (localPart === undefined || localPart.type !== serverPart.type) {
    return serverPart
  }
  if (serverPart.type === 'BIBLE' && localPart.type === 'BIBLE') {
    const serverContents: BibleContents = serverPart.contents
    const localContents: BibleContents = localPart.contents
    const serverTitlePlaceholderValues: Readonly<Record<number, string>> = normalizeTitlePlaceholderValues(
      serverContents.titlePlaceholderValues
    )
    const localTitlePlaceholderValues: Readonly<Record<number, string>> = normalizeTitlePlaceholderValues(
      localContents.titlePlaceholderValues
    )
    return {
      ...serverPart,
      contents: {
        ...serverContents,
        phrasePlaceholderId:
          Number.isInteger(serverContents.phrasePlaceholderId) && serverContents.phrasePlaceholderId > 0
            ? serverContents.phrasePlaceholderId
            : localContents.phrasePlaceholderId,
        phraseRangePlaceholderId:
          serverContents.phraseRangePlaceholderId ?? localContents.phraseRangePlaceholderId ?? null,
        titlePlaceholderValues:
          Object.keys(serverTitlePlaceholderValues).length > 0
            ? serverTitlePlaceholderValues
            : localTitlePlaceholderValues,
      },
    }
  }
  if (serverPart.type === 'LYRICS' && localPart.type === 'LYRICS') {
    const serverContents: LyricsContents = serverPart.contents
    const localContents: LyricsContents = localPart.contents
    return {
      ...serverPart,
      contents: {
        type: 'LYRICS',
        lyricsPlaceholderShapeId:
          serverContents.lyricsPlaceholderShapeId > 0
            ? serverContents.lyricsPlaceholderShapeId
            : localContents.lyricsPlaceholderShapeId,
        titlePlaceholderShapeId:
          serverContents.titlePlaceholderShapeId !== null && serverContents.titlePlaceholderShapeId > 0
            ? serverContents.titlePlaceholderShapeId
            : (localContents.titlePlaceholderShapeId ?? null),
        includeTitleForFirstCard:
          serverContents.includeTitleForFirstCard ?? localContents.includeTitleForFirstCard ?? true,
        contents: serverContents.contents.map((serverRow: LyricsContent, index: number): LyricsContent => {
          const localRow: LyricsContent | undefined = localContents.contents[index]
          if (localRow === undefined) {
            return serverRow
          }
          return {
            ...serverRow,
            songId: serverRow.songId ?? localRow.songId ?? null,
          }
        }),
      },
    }
  }
  return serverPart
}

export function mergeServerPartsWithLocalFallback(updatedParts: Part[], localRecord: PartsRecord): Part[] {
  return updatedParts.map((serverPart: Part): Part => {
    const localPart: Part | undefined = localRecord[serverPart.id]
    return mergeServerPartWithLocalFallback(serverPart, localPart)
  })
}

export function layoutSlideAspect(layout: Layout, fallbackSlideSize: Size): number {
  const w: number = layout.slideSize.width > 0 ? layout.slideSize.width : fallbackSlideSize.width
  const h: number = layout.slideSize.height > 0 ? layout.slideSize.height : fallbackSlideSize.height
  return Math.max(h, 1) / Math.max(w, 1)
}

/** Merge VALUE placeholder strings into layout shapes for sidebar / thumbnail preview. */
export function mergeValuePartIntoLayoutThumb(layout: Layout, part: ValuePart): Layout {
  const prevByShapeId: Map<number, string | null> = new Map<number, string | null>()
  const prevByName: Map<string, string | null> = new Map<string, string | null>()
  for (const row of part.contents.contents) {
    if (row.placeholderShapeId !== undefined && row.placeholderShapeId !== null) {
      prevByShapeId.set(row.placeholderShapeId, row.value)
    }
    prevByName.set(row.placeholderName, row.value)
  }
  return {
    ...layout,
    shapes: layout.shapes.map((shape: Shape): Shape => {
      if (!shape.placeholder) {
        return shape
      }
      const fromId: string | null | undefined = prevByShapeId.get(shape.shapeId)
      const value: string | null | undefined =
        fromId !== undefined ? fromId : prevByName.get(shapePlaceholderApiName(shape))
      if (value === null || value === undefined) {
        return shape
      }
      return { ...shape, text: value }
    }),
  }
}

/** Resolved layout (+ merged values) for a workspace part, or undefined when no slide preview. */
export function thumbLayoutForPart(part: Part | undefined, layouts: readonly Layout[]): Layout | undefined {
  if (part === undefined) {
    return undefined
  }
  if (part.type !== 'VALUE' && part.type !== 'PLAIN') {
    return undefined
  }
  if (part.layoutId === null || part.layoutId.length === 0) {
    return undefined
  }
  const base: Layout | undefined = layouts.find((l: Layout): boolean => l.id === part.layoutId)
  if (base === undefined) {
    return undefined
  }
  if (part.type === 'VALUE') {
    return mergeValuePartIntoLayoutThumb(base, part)
  }
  return base
}

export function fitContentBoxPx(
  slotWidthPx: number,
  slotHeightPx: number,
  contentHeightOverWidth: number
): {
  widthPx: number
  heightPx: number
} {
  if (slotWidthPx <= 0 || slotHeightPx <= 0) {
    return { widthPx: 0, heightPx: 0 }
  }
  let widthPx: number = slotWidthPx
  let heightPx: number = widthPx * contentHeightOverWidth
  if (heightPx > slotHeightPx) {
    heightPx = slotHeightPx
    widthPx = heightPx / contentHeightOverWidth
  }
  return { widthPx, heightPx }
}

export function fitMainStagePreviewBoxPx(
  slotWidthPx: number,
  slotHeightPx: number,
  contentAspectHW: number,
  topChromePx: number,
  cardPadX: number,
  cardPadTop: number,
  cardPadBottom: number
): { widthPx: number; heightPx: number; slideMaxWidthPx: number } {
  if (slotWidthPx <= 0 || slotHeightPx <= 0) {
    return { widthPx: 0, heightPx: 0, slideMaxWidthPx: 0 }
  }
  const innerW: number = Math.max(0, slotWidthPx - 2 * cardPadX)
  const innerH: number = Math.max(0, slotHeightPx - cardPadTop - cardPadBottom)
  const slideAvailH: number = Math.max(0, innerH - topChromePx)
  if (slideAvailH <= 0 || innerW <= 0) {
    return {
      widthPx: Math.min(slotWidthPx, 2 * cardPadX),
      heightPx: Math.min(slotHeightPx, topChromePx + cardPadTop + cardPadBottom),
      slideMaxWidthPx: 0,
    }
  }
  let slideW: number = Math.min(innerW, slideAvailH / contentAspectHW)
  let slideH: number = slideW * contentAspectHW
  if (slideH > slideAvailH) {
    slideH = slideAvailH
    slideW = slideH / contentAspectHW
  }
  const widthPx: number = slideW + 2 * cardPadX
  const heightPx: number = topChromePx + slideH + cardPadTop + cardPadBottom
  return { widthPx, heightPx, slideMaxWidthPx: Math.max(1, Math.floor(slideW)) }
}

export function partsToLocalSlides(parts: Part[]): LocalSlide[] {
  return [...parts]
    .sort((a: Part, b: Part): number => a.order - b.order)
    .map(
      (p: Part): LocalSlide => ({
        id: p.id,
        partType: p.type,
      })
    )
}

export function reorderSlides(slides: readonly LocalSlide[], fromIndex: number, toIndex: number): LocalSlide[] {
  if (fromIndex === toIndex) {
    return [...slides]
  }
  const next: LocalSlide[] = [...slides]
  const [moved]: LocalSlide[] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export function insertSlideAt(slides: readonly LocalSlide[], insertIndex: number, slide: LocalSlide): LocalSlide[] {
  const safeIndex: number = Math.max(0, Math.min(insertIndex, slides.length))
  return [...slides.slice(0, safeIndex), slide, ...slides.slice(safeIndex)]
}

export function partKindLabel(t: TFunction, kind: PartKind): string {
  switch (kind) {
    case 'VALUE':
      return t('page.project_view.part_value')
    case 'PLAIN':
      return t('page.project_view.part_plain')
    case 'LYRICS':
      return t('page.project_view.part_lyrics')
    case 'BIBLE':
      return t('page.project_view.part_bible')
    default: {
      const _exhaustive: never = kind
      return String(_exhaustive)
    }
  }
}

/** API / slide caption: `VALUE · LAYOUT NAME` uses the part type code, not the translated label. */
export function partKindTypeCode(kind: PartKind): string {
  return kind
}

export function defaultContainerIdForInsert(
  workspaceKind: 'project' | 'container',
  project: Project,
  container: ProjectContainer | undefined,
  prevRecord: PartsRecord
): string {
  if (workspaceKind === 'container' && container !== undefined) {
    return container.id
  }
  return Object.values(prevRecord)[0]?.containerId ?? project.parts[0]?.containerId ?? ''
}
