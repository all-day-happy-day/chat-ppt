/** Part name for an empty lyric slot (palette / song form). */
export const LYRIC_BLANK_PART_NAME: string = 'blank'

/**
 * Sentinel in `lyricsPartSequence` for a song-form-only blank step (`{ part: 'blank', lyrics: '' }`),
 * not an index into the part-definition `lyrics` array.
 */
export const LYRICS_FORM_BLANK_SEQUENCE_INDEX: number = -1

/**
 * Sanitizes performance order: valid definition indices `0..lineCount-1` plus blank steps
 * {@link LYRICS_FORM_BLANK_SEQUENCE_INDEX}. Missing or invalid input yields [].
 */
function coerceSequenceInt(entry: unknown): number | null {
  if (typeof entry === 'number' && Number.isFinite(entry) && Number.isInteger(entry)) {
    return entry
  }
  if (typeof entry === 'string') {
    const trimmed: string = entry.trim()
    if (/^-?\d+$/.test(trimmed)) {
      return Number.parseInt(trimmed, 10)
    }
  }
  return null
}

export function normalizeLyricsPartSequence(lineCount: number, raw: unknown): number[] {
  if (lineCount < 0 || !Array.isArray(raw)) {
    return []
  }
  const filtered: number[] = []
  for (const entry of raw) {
    const coerced: number | null = coerceSequenceInt(entry)
    if (coerced === null) {
      continue
    }
    if (coerced === LYRICS_FORM_BLANK_SEQUENCE_INDEX) {
      filtered.push(LYRICS_FORM_BLANK_SEQUENCE_INDEX)
      continue
    }
    if (lineCount > 0 && coerced >= 0 && coerced < lineCount) {
      filtered.push(coerced)
    }
  }
  return filtered
}

/**
 * Reads stored song-form order from a lyrics card row (camelCase or legacy snake_case).
 */
export function readLyricsPartSequenceFromRow(row: unknown, lineCount: number): number[] {
  if (row === null || typeof row !== 'object') {
    return normalizeLyricsPartSequence(lineCount, [])
  }
  const o: Record<string, unknown> = row as Record<string, unknown>
  const camel: unknown = o.lyricsPartSequence
  const snake: unknown = o.lyrics_part_sequence
  const raw: unknown = Array.isArray(camel) ? camel : Array.isArray(snake) ? snake : []
  return normalizeLyricsPartSequence(lineCount, raw)
}

/** After removing definition index `removed`, drop references and shift higher indices down. */
export function resequenceAfterDefinitionRemoved(
  sequence: readonly number[],
  removedDefinitionIndex: number
): number[] {
  return sequence
    .filter((idx: number): boolean => idx !== removedDefinitionIndex)
    .map((idx: number): number => (idx > removedDefinitionIndex ? idx - 1 : idx))
}
