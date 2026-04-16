const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export type LyricsSongLine = {
  part: string;
  lyrics: string;
};

export type LyricsSongContentItem = {
  title: string;
  artist: string | null;
  lyrics: LyricsSongLine[];
  /** Indices into `lyrics` defining performance order (repeats allowed). Omitted = identity order. */
  lyrics_part_sequence?: number[];
  /** Persisted on the project part; true after the user saves lyric parts on the configure screen. */
  lyrics_parts_configured?: boolean;
};

export type LyricsSongRow = {
  title: string;
  artist: string;
  lines: LyricsSongLine[];
  /** Indices into `lines` for performance order; defaults to [0..n-1] when missing on read. */
  lyricsPartSequence: number[];
  /** Backend song library id when the user picked a stored match; not sent in project part contents. */
  matchedBackendSongId: string | null;
  /** Mirrors `lyrics_parts_configured` in saved part contents. */
  lyricsPartsConfigured: boolean;
};

/** Part name for an empty lyric slot (song part list, form sequence, layout placeholders). */
export const LYRIC_BLANK_PART_NAME: string = "blank";

const DEFAULT_LYRIC_LINE_PART: string = LYRIC_BLANK_PART_NAME;

const isBlankDefinitionPart = (part: string): boolean => {
  return part.trim().toLowerCase() === LYRIC_BLANK_PART_NAME;
};

const defaultLyricLines = (): LyricsSongLine[] => {
  return [{ part: DEFAULT_LYRIC_LINE_PART, lyrics: "" }];
};

export const createDefaultLyricsSongRow = (): LyricsSongRow => {
  return {
    title: "",
    artist: "",
    lines: defaultLyricLines(),
    lyricsPartSequence: [],
    matchedBackendSongId: null,
    lyricsPartsConfigured: false,
  };
};

export const createDefaultLyricsSongContentItem = (): LyricsSongContentItem => {
  return {
    title: "",
    artist: null,
    lyrics: defaultLyricLines(),
    lyrics_part_sequence: [],
    lyrics_parts_configured: false,
  };
};

export const createDefaultLyricsPartContentsPayload = (): { type: "LYRICS"; contents: LyricsSongContentItem[] } => {
  return {
    type: "LYRICS",
    contents: [createDefaultLyricsSongContentItem()],
  };
};

export const readLyricsSongLines = (raw: unknown): LyricsSongLine[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultLyricLines();
  }
  const mapped: (LyricsSongLine | null)[] = raw.map((line: unknown): LyricsSongLine | null => {
    if (!isRecord(line)) {
      return null;
    }
    const partValue: unknown = line.part;
    const lyricsValue: unknown = line.lyrics;
    const part: string = typeof partValue === "string" && partValue.length > 0 ? partValue : DEFAULT_LYRIC_LINE_PART;
    const lyricsText: string = typeof lyricsValue === "string" ? lyricsValue : "";
    return { part, lyrics: lyricsText };
  });
  const filtered: LyricsSongLine[] = mapped.filter((row: LyricsSongLine | null): row is LyricsSongLine => row !== null);
  return filtered.length > 0 ? filtered : defaultLyricLines();
};

/**
 * Valid performance order as indices into `lines`.
 * - Missing / non-array `raw` → identity [0,…,n−1] (legacy projects).
 * - Explicit `[]` → empty sequence when `lineCount > 1`; when there is exactly one line, `[0]` so the default blank appears in the song form.
 * - Non-empty array with no valid indices → `[]`, or `[0]` when `lineCount === 1` (same single-slot default).
 */
export const normalizeLyricsPartSequence = (lineCount: number, raw: unknown): number[] => {
  if (lineCount <= 0) {
    return [];
  }
  if (Array.isArray(raw) && raw.length === 0) {
    return lineCount === 1 ? [0] : [];
  }
  if (!Array.isArray(raw)) {
    return Array.from({ length: lineCount }, (_: unknown, i: number): number => i);
  }
  const filtered: number[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0 || entry >= lineCount) {
      continue;
    }
    filtered.push(entry);
  }
  if (filtered.length > 0) {
    return filtered;
  }
  return lineCount === 1 ? [0] : [];
};

/** After removing definition index `removed`, drop references and shift higher indices down. */
export const resequenceAfterDefinitionRemoved = (sequence: number[], removedDefinitionIndex: number): number[] => {
  return sequence
    .filter((idx: number): boolean => idx !== removedDefinitionIndex)
    .map((idx: number): number => (idx > removedDefinitionIndex ? idx - 1 : idx));
};

/**
 * Ensures a `blank` definition exists at the front of the list so it appears as a tile in the song part palette.
 * Indices in `lyricsPartSequence` refer to the array *before* insert; use {@link shiftLyricsPartSequenceForBlankLeadInsert} after.
 */
export const ensureBlankLeadLyricsLine = (lines: LyricsSongLine[]): { lines: LyricsSongLine[]; insertedAtStart: boolean } => {
  if (lines.some((l: LyricsSongLine): boolean => isBlankDefinitionPart(l.part))) {
    return { lines, insertedAtStart: false };
  }
  return { lines: [{ part: LYRIC_BLANK_PART_NAME, lyrics: "" }, ...lines], insertedAtStart: true };
};

/** When a blank row was prepended, shift sequence indices by +1; otherwise normalize against the same line count. */
export const shiftLyricsPartSequenceForBlankLeadInsert = (
  previousLineCount: number,
  sequenceIntoPreviousLines: number[],
  insertedAtStart: boolean
): number[] => {
  if (!insertedAtStart) {
    return normalizeLyricsPartSequence(previousLineCount, sequenceIntoPreviousLines);
  }
  const nextLineCount: number = previousLineCount + 1;
  if (sequenceIntoPreviousLines.length === 0) {
    return normalizeLyricsPartSequence(nextLineCount, []);
  }
  const shifted: number[] = sequenceIntoPreviousLines.map((i: number): number => i + 1);
  return normalizeLyricsPartSequence(nextLineCount, shifted);
};

const readLyricsPartSequenceFromContentItem = (item: Record<string, unknown>, lineCount: number): number[] => {
  const snake: unknown = item.lyrics_part_sequence;
  const camel: unknown = item.lyricsPartSequence;
  const raw: unknown = snake !== undefined ? snake : camel;
  return normalizeLyricsPartSequence(lineCount, raw);
};

const readLyricsPartsConfiguredFromContentItem = (item: Record<string, unknown>): boolean => {
  const snake: unknown = item.lyrics_parts_configured;
  const camel: unknown = item.lyricsPartsConfigured;
  if (typeof snake === 'boolean') {
    return snake;
  }
  if (typeof camel === 'boolean') {
    return camel;
  }
  return false;
};

const readNonEmptyLayoutId = (
  rec: Record<string, unknown>,
  snakeKey: string,
  camelKey: string
): string | null => {
  const snakeValue: unknown = rec[snakeKey];
  if (typeof snakeValue === "string" && snakeValue.length > 0) {
    return snakeValue;
  }
  const camelValue: unknown = rec[camelKey];
  if (typeof camelValue === "string" && camelValue.length > 0) {
    return camelValue;
  }
  return null;
};

export const readLyricsTemplateLayoutIdsFromPart = (
  part: unknown
): { lyricsLayoutId: string | null; titleLayoutId: string | null } => {
  if (typeof part !== "object" || part === null || Array.isArray(part)) {
    return { lyricsLayoutId: null, titleLayoutId: null };
  }
  const rec: Record<string, unknown> = part as Record<string, unknown>;
  const lyricsLayoutId: string | null = readNonEmptyLayoutId(rec, "lyrics_layout_id", "lyricsLayoutId");
  const titleLayoutId: string | null = readNonEmptyLayoutId(rec, "title_layout_id", "titleLayoutId");
  return { lyricsLayoutId, titleLayoutId };
};

export const normalizeEditorLyricsLines = (lines: LyricsSongLine[]): LyricsSongLine[] => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return defaultLyricLines();
  }
  const normalized: LyricsSongLine[] = lines.map(
    (line: LyricsSongLine): LyricsSongLine => ({
      part:
        typeof line.part === "string" && line.part.trim().length > 0 ? line.part.trim() : DEFAULT_LYRIC_LINE_PART,
      lyrics: typeof line.lyrics === "string" ? line.lyrics : "",
    })
  );
  return normalized.length > 0 ? normalized : defaultLyricLines();
};

export const readLyricsSongRowsFromPart = (part: unknown): LyricsSongRow[] => {
  if (!isRecord(part)) {
    return [createDefaultLyricsSongRow()];
  }
  const contents: unknown = part.contents;
  if (!isRecord(contents)) {
    return [createDefaultLyricsSongRow()];
  }
  const typeValue: unknown = contents.type;
  if (typeValue !== "LYRICS") {
    return [createDefaultLyricsSongRow()];
  }
  const rawContents: unknown = contents.contents;
  if (!Array.isArray(rawContents) || rawContents.length === 0) {
    return [createDefaultLyricsSongRow()];
  }
  const rows: LyricsSongRow[] = rawContents.map((item: unknown): LyricsSongRow => {
    if (!isRecord(item)) {
      return createDefaultLyricsSongRow();
    }
    const titleValue: unknown = item.title;
    const artistValue: unknown = item.artist;
    const lyricsRaw: unknown = item.lyrics;
    const title: string = typeof titleValue === "string" ? titleValue : "";
    const artist: string =
      typeof artistValue === "string" ? artistValue : artistValue === null || artistValue === undefined ? "" : "";
    const lyricsPartsConfigured: boolean = readLyricsPartsConfiguredFromContentItem(item);
    const defs: LyricsSongLine[] = readLyricsSongLines(lyricsRaw);
    const lyricsPartSequence: number[] = readLyricsPartSequenceFromContentItem(item, defs.length);
    return {
      title,
      artist,
      lines: defs,
      lyricsPartSequence,
      matchedBackendSongId: null,
      lyricsPartsConfigured,
    };
  });
  return rows.length > 0 ? rows : [createDefaultLyricsSongRow()];
};

const LYRICS_LIBRARY_FALLBACK_LABEL: string = 'Lyrics';

export const getLyricsPartLibraryLabel = (part: unknown): string => {
  const rows: LyricsSongRow[] = readLyricsSongRowsFromPart(part);
  const titled: LyricsSongRow | undefined = rows.find((row: LyricsSongRow): boolean => row.title.trim().length > 0);
  if (titled !== undefined) {
    return titled.title.trim();
  }
  return LYRICS_LIBRARY_FALLBACK_LABEL;
};

export const buildLyricsPartEditFingerprint = (
  songs: LyricsSongRow[],
  lyricsLayoutId: string | null,
  titleLayoutId: string | null
): string => {
  return JSON.stringify({
    lyricsLayoutId,
    titleLayoutId,
    songs: songs.map((row: LyricsSongRow) => {
      const linesNorm: LyricsSongLine[] = normalizeEditorLyricsLines(row.lines);
      return {
        title: row.title,
        artist: row.artist,
        matchedBackendSongId: row.matchedBackendSongId,
        lyricsPartsConfigured: row.lyricsPartsConfigured,
        lyricsPartSequence: normalizeLyricsPartSequence(linesNorm.length, row.lyricsPartSequence),
        lines: linesNorm,
      };
    }),
  });
};

export const buildLyricsPartFingerprintFromServerPart = (part: unknown): string => {
  const rows: LyricsSongRow[] = readLyricsSongRowsFromPart(part);
  const { lyricsLayoutId, titleLayoutId } = readLyricsTemplateLayoutIdsFromPart(part);
  return buildLyricsPartEditFingerprint(rows, lyricsLayoutId, titleLayoutId);
};

export const buildLyricsContentsPayloadFromSongRows = (
  songs: LyricsSongRow[]
): { type: "LYRICS"; contents: LyricsSongContentItem[] } => {
  const contents: LyricsSongContentItem[] = songs.map(
    (row: LyricsSongRow): LyricsSongContentItem => {
      const lyrics: LyricsSongLine[] = normalizeEditorLyricsLines(row.lines);
      return {
        title: row.title,
        artist: row.artist.trim().length > 0 ? row.artist.trim() : null,
        lyrics,
        lyrics_part_sequence: normalizeLyricsPartSequence(lyrics.length, row.lyricsPartSequence),
        lyrics_parts_configured: row.lyricsPartsConfigured,
      };
    }
  );
  return {
    type: "LYRICS",
    contents: contents.length > 0 ? contents : [createDefaultLyricsSongContentItem()],
  };
};

export const mergeLyricsSongRowsIntoExistingContents = (
  part: unknown,
  songs: LyricsSongRow[]
): { type: "LYRICS"; contents: LyricsSongContentItem[] } => {
  if (!isRecord(part)) {
    return buildLyricsContentsPayloadFromSongRows(songs);
  }
  const contents: unknown = part.contents;
  if (!isRecord(contents) || contents.type !== "LYRICS") {
    return buildLyricsContentsPayloadFromSongRows(songs);
  }
  const nextItems: LyricsSongContentItem[] = songs.map((row: LyricsSongRow): LyricsSongContentItem => {
    const lyrics: LyricsSongLine[] = normalizeEditorLyricsLines(row.lines);
    return {
      title: row.title,
      artist: row.artist.trim().length > 0 ? row.artist.trim() : null,
      lyrics,
      lyrics_part_sequence: normalizeLyricsPartSequence(lyrics.length, row.lyricsPartSequence),
      lyrics_parts_configured: row.lyricsPartsConfigured,
    };
  });
  return {
    type: "LYRICS",
    contents: nextItems.length > 0 ? nextItems : [createDefaultLyricsSongContentItem()],
  };
};

const LYRICS_PART_THUMB_FALLBACK: string = 'Lyrics part';

/** One-line caption for canvas / slide strip when the part is lyrics (progress across titled songs). */
export const buildLyricsPartThumbnailCaption = (part: unknown): string => {
  const rows: LyricsSongRow[] = readLyricsSongRowsFromPart(part);
  const titled: LyricsSongRow[] = rows.filter((row: LyricsSongRow): boolean => row.title.trim().length > 0);
  if (titled.length === 0) {
    return LYRICS_PART_THUMB_FALLBACK;
  }
  const done: number = titled.filter((row: LyricsSongRow): boolean => row.lyricsPartsConfigured).length;
  if (done === titled.length) {
    return `Lyrics · All ${String(titled.length)} songs configured`;
  }
  return `Lyrics · ${String(done)}/${String(titled.length)} songs configured`;
};
