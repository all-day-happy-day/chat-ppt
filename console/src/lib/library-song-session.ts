const LIBRARY_SONG_META_SESSION_PREFIX: string = "chat-ppt-library-song-meta:";

export type LibrarySongSessionMeta = {
  title: string;
  artist: string | null;
};

export const writeLibrarySongMetaToSession = (songId: string, meta: LibrarySongSessionMeta): void => {
  try {
    window.sessionStorage.setItem(`${LIBRARY_SONG_META_SESSION_PREFIX}${songId}`, JSON.stringify(meta));
  } catch {
    // Quota or private mode; edit page can still fall back to listing APIs.
  }
};

export const readLibrarySongMetaFromSession = (songId: string): LibrarySongSessionMeta | null => {
  try {
    const raw: string | null = window.sessionStorage.getItem(`${LIBRARY_SONG_META_SESSION_PREFIX}${songId}`);
    if (raw === null || raw.length === 0) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const o: Record<string, unknown> = parsed as Record<string, unknown>;
    const titleValue: unknown = o.title;
    const artistValue: unknown = o.artist;
    const title: string = typeof titleValue === "string" ? titleValue : "";
    if (title.length === 0) {
      return null;
    }
    const artist: string | null = artistValue === null ? null : typeof artistValue === "string" ? artistValue : null;
    return { title, artist };
  } catch {
    return null;
  }
};
