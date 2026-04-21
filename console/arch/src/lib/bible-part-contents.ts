const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export type BibleVerseReference = {
  version: string;
  book: string;
  chapter: number;
  verse: number;
};

/**
 * API `BibleContent.verse` is a single int. For ranges like `1-3`, use the first verse number in the string.
 */
export const verseStringToPayloadVerseInt = (verse: string): number => {
  const trimmed: string = verse.trim();
  if (trimmed.length === 0) {
    return Number.NaN;
  }
  const first: RegExpMatchArray | null = trimmed.match(/\d+/);
  if (first === null || first[0] === undefined) {
    return Number.NaN;
  }
  return Number.parseInt(first[0], 10);
};

const readBibleContentPoint = (value: unknown): BibleVerseReference | null => {
  if (!isRecord(value)) {
    return null;
  }
  const version: unknown = value.version;
  const book: unknown = value.book;
  const chapter: unknown = value.chapter;
  const verse: unknown = value.verse;
  if (
    typeof version !== "string" ||
    typeof book !== "string" ||
    typeof chapter !== "number" ||
    !Number.isInteger(chapter) ||
    typeof verse !== "number" ||
    !Number.isInteger(verse)
  ) {
    return null;
  }
  return { version, book, chapter, verse };
};

export type BibleSlideKind = "phrase" | "title";

export type BibleSlideRange = {
  slideType: BibleSlideKind;
  start: BibleVerseReference;
};

const readSlideTypeFromRange = (range: Record<string, unknown>): BibleSlideKind => {
  const raw: unknown = range.type;
  if (raw === "title") {
    return "title";
  }
  return "phrase";
};

/** Each content range in order (phrase vs title slide). */
export const readBibleSlideSequenceFromPart = (part: unknown): BibleSlideRange[] => {
  if (!isRecord(part) || part.type !== "BIBLE") {
    return [];
  }
  const contents: unknown = part.contents;
  if (!isRecord(contents) || contents.type !== "BIBLE") {
    return [];
  }
  const ranges: unknown = contents.contents;
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return [];
  }
  const out: BibleSlideRange[] = [];
  for (const range of ranges) {
    if (!isRecord(range)) {
      continue;
    }
    const start: unknown = range.start;
    const parsed: BibleVerseReference | null = readBibleContentPoint(start);
    if (parsed === null) {
      continue;
    }
    const slideType: BibleSlideKind = readSlideTypeFromRange(range);
    out.push({ slideType, start: parsed });
  }
  return out;
};

/** Each phrase range's `start` reference from a BIBLE project part (in order). Title slides are skipped. */
export const readBiblePhraseStartsFromPart = (part: unknown): BibleVerseReference[] => {
  return readBibleSlideSequenceFromPart(part)
    .filter((s: BibleSlideRange): boolean => s.slideType === "phrase")
    .map((s: BibleSlideRange): BibleVerseReference => s.start);
};

/** First range's `start` reference from a BIBLE project part, or null. */
export const readBibleStartFromPart = (part: unknown): BibleVerseReference | null => {
  const refs: BibleVerseReference[] = readBiblePhraseStartsFromPart(part);
  return refs.length > 0 ? refs[0]! : null;
};

export const readBibleTemplateLayoutIdsFromPart = (
  part: unknown
): { phraseLayoutId: string | null; titleLayoutId: string | null } => {
  if (!isRecord(part)) {
    return { phraseLayoutId: null, titleLayoutId: null };
  }
  const ph: unknown = part.phrase_layout_id;
  const ti: unknown = part.title_layout_id;
  return {
    phraseLayoutId: typeof ph === "string" && ph.length > 0 ? ph : null,
    titleLayoutId: typeof ti === "string" && ti.length > 0 ? ti : null,
  };
};

/** `part.contents` shape for PATCH (BibleContents-Input). */
export const buildBiblePartContentsPayloadFromSlides = (slides: BibleSlideRange[]): Record<string, unknown> => {
  return {
    type: "BIBLE",
    contents: slides.map(
      (s: BibleSlideRange): Record<string, unknown> => ({
        start: {
          version: s.start.version,
          book: s.start.book,
          chapter: s.start.chapter,
          verse: s.start.verse,
        },
        end: null,
        type: s.slideType === "title" ? "title" : "phrase",
      })
    ),
  };
};

/** `part.contents` when all slides are phrase verses (default `type`). */
export const buildBiblePartContentsPayloadFromPhrases = (phrases: BibleVerseReference[]): Record<string, unknown> => {
  return buildBiblePartContentsPayloadFromSlides(
    phrases.map(
      (p: BibleVerseReference): BibleSlideRange => ({
        slideType: "phrase",
        start: p,
      })
    )
  );
};

export const buildBiblePartContentsPayload = (start: BibleVerseReference): Record<string, unknown> => {
  return buildBiblePartContentsPayloadFromPhrases([start]);
};

const BIBLE_PART_THUMB_FALLBACK: string = "Bible part";

export const buildBiblePartThumbnailCaption = (part: unknown): string => {
  const refs: BibleVerseReference[] = readBiblePhraseStartsFromPart(part);
  if (refs.length === 0) {
    return BIBLE_PART_THUMB_FALLBACK;
  }
  if (refs.length === 1) {
    const r: BibleVerseReference = refs[0]!;
    return `${r.version} · ${r.book} ${String(r.chapter)}:${String(r.verse)}`;
  }
  return `Bible · ${String(refs.length)} phrases`;
};
