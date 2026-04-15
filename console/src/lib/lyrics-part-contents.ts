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
};

export type LyricsSongRow = {
  title: string;
  artist: string;
};

const DEFAULT_LYRIC_LINE_PART: string = "Main";

const defaultLyricLines = (): LyricsSongLine[] => {
  return [{ part: DEFAULT_LYRIC_LINE_PART, lyrics: "" }];
};

export const createDefaultLyricsSongContentItem = (): LyricsSongContentItem => {
  return {
    title: "",
    artist: null,
    lyrics: defaultLyricLines(),
  };
};

export const createDefaultLyricsPartContentsPayload = (): { type: "LYRICS"; contents: LyricsSongContentItem[] } => {
  return {
    type: "LYRICS",
    contents: [createDefaultLyricsSongContentItem()],
  };
};

const readLyricsSongLines = (raw: unknown): LyricsSongLine[] => {
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

export const readLyricsSongRowsFromPart = (part: unknown): LyricsSongRow[] => {
  if (!isRecord(part)) {
    return [{ title: "", artist: "" }];
  }
  const contents: unknown = part.contents;
  if (!isRecord(contents)) {
    return [{ title: "", artist: "" }];
  }
  const typeValue: unknown = contents.type;
  if (typeValue !== "LYRICS") {
    return [{ title: "", artist: "" }];
  }
  const rawContents: unknown = contents.contents;
  if (!Array.isArray(rawContents) || rawContents.length === 0) {
    return [{ title: "", artist: "" }];
  }
  const rows: LyricsSongRow[] = rawContents.map((item: unknown): LyricsSongRow => {
    if (!isRecord(item)) {
      return { title: "", artist: "" };
    }
    const titleValue: unknown = item.title;
    const artistValue: unknown = item.artist;
    const title: string = typeof titleValue === "string" ? titleValue : "";
    const artist: string =
      typeof artistValue === "string" ? artistValue : artistValue === null || artistValue === undefined ? "" : "";
    return { title, artist };
  });
  return rows.length > 0 ? rows : [{ title: "", artist: "" }];
};

export const buildLyricsContentsPayloadFromSongRows = (
  songs: LyricsSongRow[]
): { type: "LYRICS"; contents: LyricsSongContentItem[] } => {
  const contents: LyricsSongContentItem[] = songs.map(
    (row: LyricsSongRow): LyricsSongContentItem => ({
      title: row.title,
      artist: row.artist.trim().length > 0 ? row.artist.trim() : null,
      lyrics: defaultLyricLines(),
    })
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
  const rawContents: unknown = contents.contents;
  const existing: unknown[] = Array.isArray(rawContents) ? rawContents : [];
  const nextItems: LyricsSongContentItem[] = songs.map((row: LyricsSongRow, index: number): LyricsSongContentItem => {
    const prior: unknown = existing[index];
    if (!isRecord(prior)) {
      return {
        title: row.title,
        artist: row.artist.trim().length > 0 ? row.artist.trim() : null,
        lyrics: defaultLyricLines(),
      };
    }
    const lyricsRaw: unknown = prior.lyrics;
    return {
      title: row.title,
      artist: row.artist.trim().length > 0 ? row.artist.trim() : null,
      lyrics: readLyricsSongLines(lyricsRaw),
    };
  });
  return {
    type: "LYRICS",
    contents: nextItems.length > 0 ? nextItems : [createDefaultLyricsSongContentItem()],
  };
};
