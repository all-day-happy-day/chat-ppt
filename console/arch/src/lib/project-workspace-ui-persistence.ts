import type { LyricsSongLine, LyricsSongRow } from "./lyrics-part-contents";
import { createDefaultLyricsSongRow, normalizeLyricsPartSequence } from "./lyrics-part-contents";

const STORAGE_VERSION: number = 1;

const STORAGE_KEY_PREFIX: string = "console:project-workspace-ui:v";

export type PersistedWorkspaceUiSnapshot = {
  v: typeof STORAGE_VERSION;
  selectedPartIndex: number;
  isPartEditPanelOpen: boolean;
  partEditLyricsLyricsLayoutId: string | null;
  partEditLyricsTitleLayoutId: string | null;
  partEditLyricsSongs: LyricsSongRow[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readLyricsSongLine = (raw: unknown): LyricsSongLine | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const partValue: unknown = raw.part;
  const lyricsValue: unknown = raw.lyrics;
  const part: string = typeof partValue === "string" ? partValue : "";
  const lyrics: string = typeof lyricsValue === "string" ? lyricsValue : "";
  return { part, lyrics };
};

const readLyricsSongRow = (raw: unknown): LyricsSongRow | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const titleValue: unknown = raw.title;
  const artistValue: unknown = raw.artist;
  const linesRaw: unknown = raw.lines;
  const title: string = typeof titleValue === "string" ? titleValue : "";
  const artist: string = typeof artistValue === "string" ? artistValue : "";
  if (!Array.isArray(linesRaw)) {
    return null;
  }
  const lines: LyricsSongLine[] = [];
  for (const line of linesRaw) {
    const parsed: LyricsSongLine | null = readLyricsSongLine(line);
    if (parsed !== null) {
      lines.push(parsed);
    }
  }
  if (lines.length === 0) {
    return null;
  }
  const matchedRaw: unknown = raw.matchedBackendSongId;
  const matchedBackendSongId: string | null =
    typeof matchedRaw === "string" && matchedRaw.length > 0 ? matchedRaw : null;
  const configuredRaw: unknown = raw.lyricsPartsConfigured;
  const lyricsPartsConfigured: boolean = typeof configuredRaw === "boolean" ? configuredRaw : false;
  const seqSnake: unknown = raw.lyrics_part_sequence;
  const seqCamel: unknown = raw.lyricsPartSequence;
  const seqRaw: unknown = seqSnake !== undefined ? seqSnake : seqCamel;
  const lyricsPartSequence: number[] = normalizeLyricsPartSequence(lines.length, seqRaw);
  return { title, artist, lines, lyricsPartSequence, matchedBackendSongId, lyricsPartsConfigured };
};

const storageKeyForProject = (projectId: string): string => {
  return `${STORAGE_KEY_PREFIX}${String(STORAGE_VERSION)}:${projectId}`;
};

export const readPersistedWorkspaceUi = (projectId: string): PersistedWorkspaceUiSnapshot | null => {
  if (projectId.length === 0) {
    return null;
  }
  let rawText: string | null = null;
  try {
    rawText = window.sessionStorage.getItem(storageKeyForProject(projectId));
  } catch {
    return null;
  }
  if (rawText === null || rawText.length === 0) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const vValue: unknown = parsed.v;
  if (vValue !== STORAGE_VERSION) {
    return null;
  }
  const selectedPartIndexValue: unknown = parsed.selectedPartIndex;
  const isPartEditPanelOpenValue: unknown = parsed.isPartEditPanelOpen;
  const lyricsLayoutValue: unknown = parsed.partEditLyricsLyricsLayoutId;
  const titleLayoutValue: unknown = parsed.partEditLyricsTitleLayoutId;
  const songsRaw: unknown = parsed.partEditLyricsSongs;
  if (
    typeof selectedPartIndexValue !== "number" ||
    !Number.isInteger(selectedPartIndexValue) ||
    selectedPartIndexValue < 0
  ) {
    return null;
  }
  if (typeof isPartEditPanelOpenValue !== "boolean") {
    return null;
  }
  const partEditLyricsLyricsLayoutId: string | null =
    typeof lyricsLayoutValue === "string" && lyricsLayoutValue.length > 0 ? lyricsLayoutValue : null;
  const partEditLyricsTitleLayoutId: string | null =
    typeof titleLayoutValue === "string" && titleLayoutValue.length > 0 ? titleLayoutValue : null;
  if (!Array.isArray(songsRaw) || songsRaw.length === 0) {
    return null;
  }
  const partEditLyricsSongs: LyricsSongRow[] = [];
  for (const item of songsRaw) {
    const row: LyricsSongRow | null = readLyricsSongRow(item);
    if (row !== null) {
      partEditLyricsSongs.push(row);
    }
  }
  if (partEditLyricsSongs.length === 0) {
    return null;
  }
  return {
    v: STORAGE_VERSION,
    selectedPartIndex: selectedPartIndexValue,
    isPartEditPanelOpen: isPartEditPanelOpenValue,
    partEditLyricsLyricsLayoutId,
    partEditLyricsTitleLayoutId,
    partEditLyricsSongs,
  };
};

export const writePersistedWorkspaceUi = (projectId: string, snapshot: PersistedWorkspaceUiSnapshot): void => {
  if (projectId.length === 0) {
    return;
  }
  try {
    window.sessionStorage.setItem(storageKeyForProject(projectId), JSON.stringify(snapshot));
  } catch {
    // Ignore quota / private mode failures.
  }
};

export const buildPersistedWorkspaceUiSnapshot = (input: {
  selectedPartIndex: number;
  isPartEditPanelOpen: boolean;
  partEditLyricsLyricsLayoutId: string | null;
  partEditLyricsTitleLayoutId: string | null;
  partEditLyricsSongs: LyricsSongRow[];
}): PersistedWorkspaceUiSnapshot => {
  const songs: LyricsSongRow[] =
    input.partEditLyricsSongs.length > 0
      ? input.partEditLyricsSongs.map(
          (row: LyricsSongRow): LyricsSongRow => ({
            title: row.title,
            artist: row.artist,
            lines: row.lines.map((line: LyricsSongLine): LyricsSongLine => ({ part: line.part, lyrics: line.lyrics })),
            lyricsPartSequence: [...row.lyricsPartSequence],
            matchedBackendSongId: row.matchedBackendSongId,
            lyricsPartsConfigured: row.lyricsPartsConfigured,
          })
        )
      : [createDefaultLyricsSongRow()];
  return {
    v: STORAGE_VERSION,
    selectedPartIndex: input.selectedPartIndex,
    isPartEditPanelOpen: input.isPartEditPanelOpen,
    partEditLyricsLyricsLayoutId: input.partEditLyricsLyricsLayoutId,
    partEditLyricsTitleLayoutId: input.partEditLyricsTitleLayoutId,
    partEditLyricsSongs: songs,
  };
};
