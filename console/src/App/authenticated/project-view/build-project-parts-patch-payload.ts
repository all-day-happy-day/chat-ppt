import type { BiblePart, Part, PartRequestBody } from '@/domain/models/project'
import type { LyricsContent, LyricsContents } from '@/domain/valueobjects/project'
import type { LyricsPart as LyricsLine } from '@/domain/valueobjects/song'

/** Matches arch `normalizePartsForPatchRequest`: order is the array index. `id` is always a ULID (server or client). */
export interface LocalSlideLike {
  readonly id: string
  readonly partType: Part['type']
}

/**
 * API rejects LYRICS when two lines share the same `part` name (DuplicatedPartName → 400).
 * Keep first occurrence per `part`, drop later duplicates from corrupt / legacy data.
 */
function uniqueLyricsLinesByPart(lines: readonly LyricsLine[]): LyricsLine[] {
  const seen: Set<string> = new Set<string>()
  const result: LyricsLine[] = []
  for (const line of lines) {
    if (seen.has(line.part)) {
      continue
    }
    seen.add(line.part)
    result.push(line)
  }
  return result
}

function lyricsContentsWithUniqueLineParts(lyricsContents: LyricsContents): LyricsContents {
  return {
    type: 'LYRICS',
    contents: lyricsContents.contents.map(
      (block: LyricsContent): LyricsContent => ({
        ...block,
        lyrics: uniqueLyricsLinesByPart(block.lyrics),
      }),
    ),
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
            (row): { placeholderName: string; value: string | null } => ({
              placeholderName: row.placeholderName,
              value: row.value,
            }),
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
        contents: lyricsContentsWithUniqueLineParts(part.content),
        lyricsLayoutId: part.lyricsLayoutId,
        titleLayoutId: part.titleLayoutId,
      }
    case 'BIBLE': {
      const bible: BiblePart & { phraseLayoutId?: string | null; titleLayoutId?: string | null } =
        part as BiblePart & { phraseLayoutId?: string | null; titleLayoutId?: string | null }
      return {
        id: part.id,
        order,
        type: 'BIBLE',
        contents: part.content,
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
          contents: [{ placeholderName: 'value', value: null }],
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
          contents: [
            {
              title: '',
              artist: null,
              lyrics: [{ part: 'blank', lyrics: '' }],
              lyricsPartSequence: [],
              lyricsPartsConfigured: false,
            },
          ],
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
          contents: [{ placeholderName: 'value', value: null }],
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
          contents: [
            {
              title: '',
              artist: null,
              lyrics: [{ part: 'blank', lyrics: '' }],
              lyricsPartSequence: [],
              lyricsPartsConfigured: false,
            },
          ],
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
 * Builds PATCH `parts` from editor slide order plus the last known full `Part` from the server.
 * New parts use client-generated ULIDs in `slide.id` (not yet in snapshot until first save).
 */
export function buildProjectPartsPatchPayload(
  localSlides: readonly LocalSlideLike[],
  partsById: ReadonlyMap<string, Part>,
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
  partsById: ReadonlyMap<string, Part>,
): string {
  return JSON.stringify(buildProjectPartsPatchPayload(localSlides, partsById))
}
