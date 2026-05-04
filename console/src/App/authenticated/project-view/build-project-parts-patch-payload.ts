import type { BiblePart, LyricsPart, Part, PartRequestBody } from '@/domain/models/project'
import type { BibleContentRange, BibleContents, LyricsContent, LyricsContents } from '@/domain/valueobjects/project'
import type { LyricsPart as LyricsLine } from '@/domain/valueobjects/song'
import {
  LYRICS_FORM_BLANK_SEQUENCE_INDEX,
  normalizeLyricsPartSequence,
  readLyricsPartSequenceFromRow,
} from '@/lib/lyrics-part-sequence'

/** Matches arch `normalizePartsForPatchRequest`: order is the array index. `id` is always a ULID (server or client). */
export interface LocalSlideLike {
  readonly id: string
  readonly partType: Part['type']
}

/**
 * API rejects LYRICS when two lines share the same `part` name (DuplicatedPartName → 400).
 * Keep first occurrence per `part`, drop later duplicates from corrupt / legacy data.
 * Also maps `lyricsPartSequence` indices to the deduped lyrics array so song-form order survives PATCH.
 */
function uniqueLyricsLinesByPartWithIndexMap(lines: readonly LyricsLine[]): {
  readonly lines: LyricsLine[]
  readonly oldIndexToNew: readonly (number | undefined)[]
} {
  const seen: Set<string> = new Set<string>()
  const result: LyricsLine[] = []
  const oldIndexToNew: (number | undefined)[] = []
  for (let i: number = 0; i < lines.length; i++) {
    const line: LyricsLine = lines[i]!
    if (seen.has(line.part)) {
      oldIndexToNew[i] = undefined
      continue
    }
    seen.add(line.part)
    oldIndexToNew[i] = result.length
    result.push(line)
  }
  return { lines: result, oldIndexToNew }
}

function remapLyricsPartSequenceAfterLineDedupe(
  dedupedLineCount: number,
  rawSequence: readonly number[] | undefined,
  oldIndexToNew: readonly (number | undefined)[]
): number[] {
  const seq: readonly number[] = Array.isArray(rawSequence) ? rawSequence : []
  const mapped: number[] = []
  for (const entry of seq) {
    if (entry === LYRICS_FORM_BLANK_SEQUENCE_INDEX) {
      mapped.push(LYRICS_FORM_BLANK_SEQUENCE_INDEX)
      continue
    }
    if (!Number.isInteger(entry) || entry < 0 || entry >= oldIndexToNew.length) {
      continue
    }
    const nextIdx: number | undefined = oldIndexToNew[entry]
    if (nextIdx !== undefined) {
      mapped.push(nextIdx)
    }
  }
  return normalizeLyricsPartSequence(dedupedLineCount, mapped)
}

function lyricsContentsWithUniqueLineParts(lyricsContents: LyricsContents): LyricsContents {
  const blocks: LyricsContent[] = lyricsContents.contents ?? []
  return {
    ...lyricsContents,
    type: 'LYRICS',
    contents: blocks.map((block: LyricsContent): LyricsContent => {
      const { lines, oldIndexToNew } = uniqueLyricsLinesByPartWithIndexMap(block.lyrics ?? [])
      return {
        ...block,
        lyrics: lines,
        lyricsPartSequence: remapLyricsPartSequenceAfterLineDedupe(
          lines.length,
          block.lyricsPartSequence,
          oldIndexToNew
        ),
      }
    }),
  }
}

function hydrateLyricsContentsRows(body: LyricsContents): LyricsContents {
  const rows: LyricsContent[] = body.contents ?? []
  const legacyFirstOff: boolean = body.includeTitleForFirstCard === false
  const nextRows: LyricsContent[] = rows.map((row: LyricsContent, index: number): LyricsContent => {
    const legacyRow = row as LyricsContent & { matchedBackendSongId?: string | null }
    let includeTitleSlide: boolean
    if (row.includeTitleSlide !== undefined) {
      includeTitleSlide = row.includeTitleSlide
    } else if (index === 0 && legacyFirstOff) {
      includeTitleSlide = false
    } else {
      includeTitleSlide = true
    }
    const lyrics: LyricsLine[] = row.lyrics ?? []
    return {
      ...row,
      includeTitleSlide,
      lyrics,
      songId: row.songId ?? legacyRow.matchedBackendSongId ?? null,
      lyricsPartSequence: readLyricsPartSequenceFromRow(row, lyrics.length),
      lyricsPartsConfigured: row.lyricsPartsConfigured === true,
    }
  })
  const includeFirstCard: boolean = nextRows.length === 0 ? true : nextRows[0]!.includeTitleSlide !== false
  return {
    ...body,
    contents: nextRows,
    lyricsPlaceholderShapeId: body.lyricsPlaceholderShapeId ?? 0,
    titlePlaceholderShapeId: body.titlePlaceholderShapeId ?? null,
    includeTitleForFirstCard: includeFirstCard,
  }
}

/** Resolves `contents` from API payloads or legacy client state that used `content`. */
function lyricsContentsFromPart(part: LyricsPart): LyricsContents {
  const legacy = part as LyricsPart & { content?: LyricsContents }
  const body: LyricsContents | undefined = legacy.contents ?? legacy.content
  if (body === undefined) {
    return {
      type: 'LYRICS',
      contents: [],
      lyricsPlaceholderShapeId: 0,
      titlePlaceholderShapeId: null,
      includeTitleForFirstCard: true,
    }
  }
  return hydrateLyricsContentsRows(body)
}

function bibleContentsFromPart(part: BiblePart): BibleContents {
  const legacy = part as BiblePart & { content?: BibleContents }
  const body: BibleContents | undefined = legacy.contents ?? legacy.content
  if (body === undefined) {
    return { type: 'BIBLE', contents: [] }
  }
  return body
}

/**
 * Hydrates BIBLE parts from API/legacy shapes onto `contents` and layout ids.
 */
export function normalizeBiblePartForStore(part: BiblePart): BiblePart {
  const r = part as BiblePart & { content?: BibleContents }
  const bodyRaw: BibleContents = r.contents ?? r.content ?? ({ type: 'BIBLE', contents: [] } satisfies BibleContents)
  return {
    id: r.id,
    projectId: r.projectId,
    containerId: r.containerId,
    order: r.order,
    type: 'BIBLE',
    phraseLayoutId: r.phraseLayoutId ?? null,
    titleLayoutId: r.titleLayoutId ?? null,
    contents: {
      type: 'BIBLE',
      contents: bodyRaw.contents ?? [],
      titleSermonTitlePlaceholderShapeId: bodyRaw.titleSermonTitlePlaceholderShapeId ?? undefined,
      titleScriptureRangePlaceholderShapeId: bodyRaw.titleScriptureRangePlaceholderShapeId ?? undefined,
      titlePreacherPlaceholderShapeId: bodyRaw.titlePreacherPlaceholderShapeId ?? undefined,
      phraseTextPlaceholderShapeId: bodyRaw.phraseTextPlaceholderShapeId ?? undefined,
      phraseScriptureRangePlaceholderShapeId: bodyRaw.phraseScriptureRangePlaceholderShapeId ?? undefined,
    },
  }
}

function partToRequestBody(part: Part, order: number): PartRequestBody {
  switch (part.type) {
    case 'VALUE':
      return {
        id: part.id,
        order,
        type: 'VALUE',
        contents: {
          type: 'VALUE',
          contents: part.contents.contents.map(
            (row): { placeholderName: string; placeholderShapeId: number; value: string | null } => ({
              placeholderName: row.placeholderName,
              placeholderShapeId: row.placeholderShapeId,
              value: row.value,
            })
          ),
        },
        layoutId: part.layoutId,
      }
    case 'PLAIN':
      return {
        id: part.id,
        order,
        type: 'PLAIN',
        contents: part.contents,
        layoutId: part.layoutId,
      }
    case 'LYRICS':
      return {
        id: part.id,
        order,
        type: 'LYRICS',
        contents: lyricsContentsWithUniqueLineParts(lyricsContentsFromPart(part)),
        lyricsLayoutId: part.lyricsLayoutId,
        titleLayoutId: part.titleLayoutId,
      }
    case 'BIBLE': {
      const bible: BiblePart = normalizeBiblePartForStore(part)
      return {
        id: part.id,
        order,
        type: 'BIBLE',
        contents: bibleContentsFromPart(bible),
        phraseLayoutId: bible.phraseLayoutId ?? null,
        titleLayoutId: bible.titleLayoutId ?? null,
      }
    }
  }
}

/** Defaults for a part; `partUlid` is client-generated ULID for inserts not yet in `partsById`. */
function newPartRequestBody(partUlid: string, order: number, kind: Part['type']): PartRequestBody {
  switch (kind) {
    case 'PLAIN':
      return {
        id: partUlid,
        order,
        type: 'PLAIN',
        contents: { type: 'PLAIN' },
        layoutId: null,
      }
    case 'VALUE':
      return {
        id: partUlid,
        order,
        type: 'VALUE',
        contents: {
          type: 'VALUE',
          contents: [],
        },
        layoutId: null,
      }
    case 'LYRICS':
      return {
        id: partUlid,
        order,
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
        id: partUlid,
        order,
        type: 'BIBLE',
        contents: { type: 'BIBLE', contents: [] },
        phraseLayoutId: null,
        titleLayoutId: null,
      }
  }
}

/** Existing part id, changed type: keep `id` so server can replace row. */
function partRequestBodyForTypeChange(serverPartId: string, order: number, kind: Part['type']): PartRequestBody {
  switch (kind) {
    case 'PLAIN':
      return {
        id: serverPartId,
        order,
        type: 'PLAIN',
        contents: { type: 'PLAIN' },
        layoutId: null,
      }
    case 'VALUE':
      return {
        id: serverPartId,
        order,
        type: 'VALUE',
        contents: {
          type: 'VALUE',
          contents: [],
        },
        layoutId: null,
      }
    case 'LYRICS':
      return {
        id: serverPartId,
        order,
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
        id: serverPartId,
        order,
        type: 'BIBLE',
        contents: { type: 'BIBLE', contents: [] },
        phraseLayoutId: null,
        titleLayoutId: null,
      }
  }
}

/**
 * Ensures lyrics body is stored on `contents`. Migrates a stray legacy `content` field if present.
 */
export function normalizeLyricsPartForStore(part: LyricsPart): LyricsPart {
  const r = part as LyricsPart & { content?: LyricsContents }
  const bodyRaw: LyricsContents =
    r.contents ??
    r.content ??
    ({
      type: 'LYRICS',
      contents: [],
      lyricsPlaceholderShapeId: 0,
      titlePlaceholderShapeId: null,
      includeTitleForFirstCard: true,
    } satisfies LyricsContents)
  const body: LyricsContents = hydrateLyricsContentsRows(bodyRaw)
  return {
    id: r.id,
    projectId: r.projectId,
    containerId: r.containerId,
    order: r.order,
    type: 'LYRICS',
    lyricsLayoutId: r.lyricsLayoutId,
    titleLayoutId: r.titleLayoutId,
    contents: body,
  }
}

function isPhraseRangeCompleteForExport(r: BibleContentRange): boolean {
  if (r.type !== 'phrase') {
    return true
  }
  if (r.start.book.trim().length === 0) {
    return false
  }
  if (!Number.isInteger(r.start.chapter) || r.start.chapter < 1) {
    return false
  }
  if (!Number.isInteger(r.start.verse) || r.start.verse < 1) {
    return false
  }
  if (r.end === null) {
    return true
  }
  if (r.end.version !== r.start.version || r.end.book !== r.start.book || r.end.chapter !== r.start.chapter) {
    return false
  }
  if (!Number.isInteger(r.end.verse) || r.end.verse < r.start.verse) {
    return false
  }
  return true
}

/** True when no usable phrase reference or any phrase row fails basic completeness checks. */
export function isBiblePartIncompleteForPptExport(part: BiblePart): boolean {
  const normalized: BiblePart = normalizeBiblePartForStore(part)
  const ranges: BibleContentRange[] = normalized.contents.contents ?? []
  const phrases: BibleContentRange[] = ranges.filter((x: BibleContentRange): boolean => x.type === 'phrase')
  if (phrases.length === 0) {
    return true
  }
  return phrases.some((p: BibleContentRange): boolean => !isPhraseRangeCompleteForExport(p))
}

/** True when there are no songs or any song is missing "configured" (parts overlay not confirmed). */
export function isLyricsPartIncompleteForPptExport(part: LyricsPart): boolean {
  const normalized: LyricsPart = normalizeLyricsPartForStore(part)
  const rows: LyricsContent[] = normalized.contents.contents ?? []
  if (rows.length === 0) {
    return true
  }
  return rows.some((row: LyricsContent): boolean => row.lyricsPartsConfigured !== true)
}

export function isPartIncompleteForPptExport(part: Part): boolean {
  if (part.type === 'BIBLE') {
    return isBiblePartIncompleteForPptExport(part)
  }
  if (part.type === 'LYRICS') {
    return isLyricsPartIncompleteForPptExport(part)
  }
  return false
}

/** Whether any slide has incomplete Bible phrases or Lyrics configure state (blocks PPT export). */
export function workspaceHasIncompletePartsForPptExport(
  slides: readonly LocalSlideLike[],
  partsById: Readonly<Record<string, Part>>,
  bibleUiBlockedPartIds?: ReadonlySet<string> | undefined
): boolean {
  for (const slide of slides) {
    const p: Part | undefined = partsById[slide.id]
    if (p !== undefined && isPartIncompleteForPptExport(p)) {
      return true
    }
    if (bibleUiBlockedPartIds !== undefined && bibleUiBlockedPartIds.has(slide.id)) {
      return true
    }
  }
  return false
}

/**
 * Builds PATCH `parts` from editor slide order plus the last known full `Part` from the server.
 * New parts use client-generated ULIDs in `slide.id` (not yet in snapshot until first save).
 */
export function buildProjectPartsPatchPayload(
  localSlides: readonly LocalSlideLike[],
  partsById: ReadonlyMap<string, Part>
): PartRequestBody[] {
  return localSlides.map((slide: LocalSlideLike, order: number): PartRequestBody => {
    const existing: Part | undefined = partsById.get(slide.id)
    if (existing !== undefined && existing.type === slide.partType) {
      return partToRequestBody(existing, order)
    }
    if (existing !== undefined && existing.type !== slide.partType) {
      return partRequestBodyForTypeChange(existing.id, order, slide.partType)
    }
    return newPartRequestBody(slide.id, order, slide.partType)
  })
}

export function slidesSignature(slides: readonly LocalSlideLike[]): string {
  return JSON.stringify(slides.map((s: LocalSlideLike): readonly [string, string] => [s.id, s.partType]))
}

/**
 * Full workspace fingerprint for autosave: slide order/types plus each part's PATCH body (layout, contents).
 * Prefer this over `slidesSignature` when editing VALUE/PLAIN (or any part fields mirrored in the payload).
 */
export function workspaceSignature(
  localSlides: readonly LocalSlideLike[],
  partsById: ReadonlyMap<string, Part>
): string {
  return JSON.stringify(buildProjectPartsPatchPayload(localSlides, partsById))
}
