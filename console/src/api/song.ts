import { SIGN_IN_REQUIRED_MESSAGE } from "../lib/auth-errors";
import { getApiBaseUrl } from "../lib/api-base";
import { readFetchErrorMessage } from "../lib/read-fetch-error";
import type { SongListItem } from "../types/song";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readSongListItem = (value: unknown): SongListItem | null => {
  if (!isRecord(value)) {
    return null;
  }
  const idValue: unknown = value.id;
  const titleValue: unknown = value.title;
  const artistValue: unknown = value.artist;
  const title: string = typeof titleValue === "string" ? titleValue : "";
  if (title.length === 0) {
    return null;
  }
  const id: string = typeof idValue === "string" && idValue.length > 0 ? idValue : title;
  const artist: string | null =
    typeof artistValue === "string" && artistValue.length > 0 ? artistValue : null;
  return { id, title, artist };
};

export const listSongsByTitle = async (title: string, signal?: AbortSignal): Promise<SongListItem[]> => {
  const trimmed: string = title.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const baseUrl: string = getApiBaseUrl();
  const encodedTitle: string = encodeURIComponent(trimmed);
  const url: string = `${baseUrl}/song/list-songs?title=${encodedTitle}`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not search songs.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.songs)) {
    throw new Error("Invalid response from server.");
  }
  const songs: SongListItem[] = [];
  for (const item of parsed.songs) {
    const row: SongListItem | null = readSongListItem(item);
    if (row !== null) {
      songs.push(row);
    }
  }
  return songs;
};
