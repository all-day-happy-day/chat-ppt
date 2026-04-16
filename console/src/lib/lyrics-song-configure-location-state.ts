import type { LyricsSongRow } from './lyrics-part-contents';
import { readLyricsSongRowsFromPart } from './lyrics-part-contents';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const LYRICS_PART_SONGS_SNAPSHOT_STATE_KEY: string = 'lyricsPartSongsSnapshot';

/**
 * Drops the workspace draft song list from router state so the configure page reads persisted project data
 * after a successful save (avoids masking the server response with a stale snapshot).
 */
export const withoutLyricsPartSongsSnapshotForLocation = (raw: unknown): unknown => {
  if (!isRecord(raw)) {
    return raw;
  }
  const next: Record<string, unknown> = { ...raw };
  delete next[LYRICS_PART_SONGS_SNAPSHOT_STATE_KEY];
  return next;
};

export type LyricsSongConfigureOverlay = {
  songIndex: number;
  title: string;
  artist: string;
  matchedBackendSongId: string | null;
};

export const readLyricsSongConfigureOverlay = (raw: unknown): LyricsSongConfigureOverlay | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const root: Record<string, unknown> = raw as Record<string, unknown>;
  const boxed: unknown = root.lyricsSongConfigure;
  if (typeof boxed !== 'object' || boxed === null || Array.isArray(boxed)) {
    return null;
  }
  const o: Record<string, unknown> = boxed as Record<string, unknown>;
  const songIndexValue: unknown = o.songIndex;
  const titleValue: unknown = o.title;
  const artistValue: unknown = o.artist;
  if (typeof songIndexValue !== 'number' || !Number.isInteger(songIndexValue) || songIndexValue < 0) {
    return null;
  }
  if (typeof titleValue !== 'string' || typeof artistValue !== 'string') {
    return null;
  }
  const matchedRaw: unknown = o.matchedBackendSongId;
  const matchedBackendSongId: string | null =
    matchedRaw === null
      ? null
      : typeof matchedRaw === 'string' && matchedRaw.length > 0
        ? matchedRaw
        : null;
  return { songIndex: songIndexValue, title: titleValue, artist: artistValue, matchedBackendSongId };
};

/**
 * Workspace passes the current lyrics-part song list so configure works before the part is saved to the server.
 */
type SnapshotContentPair = {
  apiItem: {
    title: string;
    artist: string;
    lyrics: unknown[];
    lyrics_part_sequence: unknown[];
    lyrics_parts_configured: boolean;
  };
  matchedBackendSongId: string | null;
};

export const readLyricsPartSongsSnapshotFromLocation = (raw: unknown): LyricsSongRow[] | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const root: Record<string, unknown> = raw as Record<string, unknown>;
  const snap: unknown = root[LYRICS_PART_SONGS_SNAPSHOT_STATE_KEY];
  if (!Array.isArray(snap) || snap.length === 0) {
    return null;
  }
  const pairs: SnapshotContentPair[] = [];
  for (const row of snap) {
    if (!isRecord(row)) {
      continue;
    }
    const titleValue: unknown = row.title;
    const artistValue: unknown = row.artist;
    const linesValue: unknown = row.lines;
    const seqValue: unknown = row.lyricsPartSequence;
    const confValue: unknown = row.lyricsPartsConfigured;
    const matchedValue: unknown = row.matchedBackendSongId;
    const matchedBackendSongId: string | null =
      matchedValue === null
        ? null
        : typeof matchedValue === 'string' && matchedValue.length > 0
          ? matchedValue
          : null;
    pairs.push({
      apiItem: {
        title: typeof titleValue === 'string' ? titleValue : '',
        artist: typeof artistValue === 'string' ? artistValue : '',
        lyrics: Array.isArray(linesValue) ? linesValue : [],
        lyrics_part_sequence: Array.isArray(seqValue) ? seqValue : [],
        lyrics_parts_configured: typeof confValue === 'boolean' ? confValue : false,
      },
      matchedBackendSongId,
    });
  }
  if (pairs.length === 0) {
    return null;
  }
  const syntheticPart: unknown = {
    contents: {
      type: 'LYRICS',
      contents: pairs.map((p: SnapshotContentPair): SnapshotContentPair['apiItem'] => p.apiItem),
    },
  };
  const baseRows: LyricsSongRow[] = readLyricsSongRowsFromPart(syntheticPart);
  return baseRows.map(
    (r: LyricsSongRow, i: number): LyricsSongRow => ({
      ...r,
      matchedBackendSongId: pairs[i]?.matchedBackendSongId ?? null,
    })
  );
};

export const lyricSongHasTitleForConfigure = (
  serverRow: LyricsSongRow,
  songIndex: number,
  locationState: unknown
): boolean => {
  if (serverRow.title.trim().length > 0) {
    return true;
  }
  const overlay: LyricsSongConfigureOverlay | null = readLyricsSongConfigureOverlay(locationState);
  return overlay !== null && overlay.songIndex === songIndex && overlay.title.trim().length > 0;
};
