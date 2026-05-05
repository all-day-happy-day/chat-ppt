import { getApiBaseUrl } from '../lib/api-base'
import { SIGN_IN_REQUIRED_MESSAGE } from '../lib/auth-errors'
import type { LyricsSongLine } from '../lib/lyrics-part-contents'
import { readLyricsSongLines } from '../lib/lyrics-part-contents'
import { attachChatPptHttpErrorToThrownError, messageFromFailedResponseBody } from '../lib/parse-api-error'
import { readFetchErrorMessage } from '../lib/read-fetch-error'
import type { SongListItem } from '../types/song'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const readSongListItem = (value: unknown): SongListItem | null => {
  if (!isRecord(value)) {
    return null
  }
  const idValue: unknown = value.id
  const titleValue: unknown = value.title
  const artistValue: unknown = value.artist
  const title: string = typeof titleValue === 'string' ? titleValue : ''
  if (title.length === 0) {
    return null
  }
  const id: string = typeof idValue === 'string' && idValue.length > 0 ? idValue : title
  const artist: string | null = typeof artistValue === 'string' && artistValue.length > 0 ? artistValue : null
  return { id, title, artist }
}

const fetchSongListFromGetSongsUrl = async (
  url: string,
  errorMessage: string,
  signal?: AbortSignal
): Promise<SongListItem[]> => {
  const response: Response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, errorMessage)
    throw new Error(message)
  }
  const text: string = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.songs)) {
    throw new Error('Invalid response from server.')
  }
  const songs: SongListItem[] = []
  for (const item of parsed.songs) {
    const row: SongListItem | null = readSongListItem(item)
    if (row !== null) {
      songs.push(row)
    }
  }
  return songs
}

export const listSongsByTitle = async (title: string, signal?: AbortSignal): Promise<SongListItem[]> => {
  if (title.length === 0) {
    return []
  }
  const baseUrl: string = getApiBaseUrl()
  const encodedTitle: string = encodeURIComponent(title)
  const url: string = `${baseUrl}/song/list-songs?title=${encodedTitle}`
  return fetchSongListFromGetSongsUrl(url, 'Could not search songs.', signal)
}

const ULID_PATTERN: RegExp = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

const HEX16_PATTERN: RegExp = /^[\dA-F]{16}$/i

export const isPlausibleBackendSongId = (songId: string): boolean => {
  if (songId.length === 26) {
    return ULID_PATTERN.test(songId)
  }
  if (songId.length === 16) {
    return HEX16_PATTERN.test(songId)
  }
  return false
}

const normalizeComparableSongText = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export const findMatchingStoredSongId = (title: string, artist: string, items: SongListItem[]): string | null => {
  const titleNorm: string = normalizeComparableSongText(title)
  if (titleNorm.length === 0) {
    return null
  }
  const artistNorm: string = normalizeComparableSongText(artist)
  const titleMatches: SongListItem[] = items.filter((item: SongListItem): boolean => {
    return normalizeComparableSongText(item.title) === titleNorm
  })
  const pickFirstPlausibleId = (matches: SongListItem[]): string | null => {
    for (const item of matches) {
      if (isPlausibleBackendSongId(item.id)) {
        return item.id
      }
    }
    return null
  }
  if (titleMatches.length === 0) {
    return null
  }
  if (artistNorm.length === 0) {
    return pickFirstPlausibleId(titleMatches)
  }
  const artistMatches: SongListItem[] = titleMatches.filter((item: SongListItem): boolean => {
    const itemArtist: string = item.artist ?? ''
    return normalizeComparableSongText(itemArtist) === artistNorm
  })
  if (artistMatches.length > 0) {
    return pickFirstPlausibleId(artistMatches)
  }
  return pickFirstPlausibleId(titleMatches)
}

const readLyricsLinesFromLyricsEnvelope = (parsed: unknown): LyricsSongLine[] | null => {
  if (!isRecord(parsed)) {
    return null
  }
  const lyricsEnvelope: unknown = parsed.lyrics
  if (!isRecord(lyricsEnvelope)) {
    return null
  }
  const linesRaw: unknown = lyricsEnvelope.lyrics
  return readLyricsSongLines(linesRaw)
}

const lyricsLinesHaveNonWhitespaceContent = (lines: LyricsSongLine[]): boolean => {
  return lines.some((line: LyricsSongLine): boolean => line.lyrics.trim().length > 0)
}

const fetchLyricsEnvelopeJson = async (url: string, signal?: AbortSignal): Promise<unknown> => {
  const response: Response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, 'Could not load lyrics.')
    throw new Error(message)
  }
  const text: string = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
}

export const getLyricsBySongId = async (songId: string, signal?: AbortSignal): Promise<LyricsSongLine[]> => {
  const trimmed: string = songId.trim()
  if (trimmed.length === 0) {
    throw new Error('Song id is required to load lyrics.')
  }
  const baseUrl: string = getApiBaseUrl()
  const encodedId: string = encodeURIComponent(trimmed)
  const url: string = `${baseUrl}/song/lyrics/get/${encodedId}`
  const parsed: unknown = await fetchLyricsEnvelopeJson(url, signal)
  const lines: LyricsSongLine[] | null = readLyricsLinesFromLyricsEnvelope(parsed)
  if (lines === null) {
    throw new Error('Invalid response from server.')
  }
  return lines
}

export const scrapeLyrics = async (
  title: string,
  artist: string | null,
  signal?: AbortSignal
): Promise<LyricsSongLine[]> => {
  const trimmedTitle: string = title.trim()
  if (trimmedTitle.length === 0) {
    throw new Error('Title is required to load lyrics.')
  }
  const baseUrl: string = getApiBaseUrl()
  const titleQuery: string = encodeURIComponent(trimmedTitle)
  const artistTrimmed: string = artist === null ? '' : artist.trim()
  const artistQuery: string = artistTrimmed.length > 0 ? `&artist=${encodeURIComponent(artistTrimmed)}` : ''
  const url: string = `${baseUrl}/song/lyrics/scrape?title=${titleQuery}${artistQuery}`
  const parsed: unknown = await fetchLyricsEnvelopeJson(url, signal)
  const lines: LyricsSongLine[] | null = readLyricsLinesFromLyricsEnvelope(parsed)
  if (lines === null) {
    throw new Error('Invalid response from server.')
  }
  return lines
}

const readSongMetaFromEnvelopeRoot = (parsed: unknown): { id: string; title: string; artist: string | null } | null => {
  if (!isRecord(parsed)) {
    return null
  }
  const songRaw: unknown = parsed.song
  if (!isRecord(songRaw)) {
    return null
  }
  const idValue: unknown = songRaw.id
  const titleValue: unknown = songRaw.title
  const artistValue: unknown = songRaw.artist
  const title: string = typeof titleValue === 'string' ? titleValue.trim() : ''
  if (title.length === 0) {
    return null
  }
  const id: string = typeof idValue === 'string' && idValue.length > 0 ? idValue : ''
  if (!isPlausibleBackendSongId(id)) {
    return null
  }
  const artist: string | null =
    artistValue === null ? null : typeof artistValue === 'string' && artistValue.length > 0 ? artistValue : null
  return { id, title, artist }
}

export type ScrapeCreateSongResult = {
  songId: string
  title: string
  artist: string | null
  lines: LyricsSongLine[]
}

export const scrapeLyricsCreatingSong = async (
  title: string,
  artist: string | null,
  signal?: AbortSignal
): Promise<ScrapeCreateSongResult> => {
  const trimmedTitle: string = title.trim()
  if (trimmedTitle.length === 0) {
    throw new Error('Title is required to add a song.')
  }
  const baseUrl: string = getApiBaseUrl()
  const titleQuery: string = encodeURIComponent(trimmedTitle)
  const artistTrimmed: string = artist === null ? '' : artist.trim()
  const artistQuery: string = artistTrimmed.length > 0 ? `&artist=${encodeURIComponent(artistTrimmed)}` : ''
  const url: string = `${baseUrl}/song/lyrics/scrape?title=${titleQuery}${artistQuery}`
  const parsed: unknown = await fetchLyricsEnvelopeJson(url, signal)
  const meta: { id: string; title: string; artist: string | null } | null = readSongMetaFromEnvelopeRoot(parsed)
  if (meta === null) {
    throw new Error('Invalid response from server.')
  }
  const lines: LyricsSongLine[] | null = readLyricsLinesFromLyricsEnvelope(parsed)
  if (lines === null) {
    throw new Error('Invalid response from server.')
  }
  return {
    songId: meta.id,
    title: meta.title,
    artist: meta.artist,
    lines,
  }
}

export const listBroadSongLibrary = async (signal?: AbortSignal): Promise<SongListItem[]> => {
  const baseUrl: string = getApiBaseUrl()
  const url: string = `${baseUrl}/song/list-all-songs`
  return fetchSongListFromGetSongsUrl(url, 'Could not load the song library.', signal)
}

export const songIdHasLyricsWithContentInLibrary = async (songId: string, signal?: AbortSignal): Promise<boolean> => {
  if (!isPlausibleBackendSongId(songId.trim())) {
    return false
  }
  try {
    const lines: LyricsSongLine[] = await getLyricsBySongId(songId, signal)
    return lyricsLinesHaveNonWhitespaceContent(lines)
  } catch {
    return false
  }
}

export const deleteSongById = async (songId: string, signal?: AbortSignal): Promise<void> => {
  const trimmed: string = songId.trim()
  if (!isPlausibleBackendSongId(trimmed)) {
    throw new Error('Song id is not valid.')
  }
  const baseUrl: string = getApiBaseUrl()
  const encodedId: string = encodeURIComponent(trimmed)
  const url: string = `${baseUrl}/song/${encodedId}`
  const response: Response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, 'Could not delete the song.')
    throw new Error(message)
  }
}

export type ResolveLyricsLinesForConfigureInput = {
  title: string
  artist: string
  matchedBackendSongId: string | null
}

export const resolveLyricsLinesForConfigure = async (
  input: ResolveLyricsLinesForConfigureInput,
  signal?: AbortSignal
): Promise<LyricsSongLine[]> => {
  const title: string = input.title.trim()
  if (title.length === 0) {
    throw new Error('Title is required to load lyrics.')
  }
  const artist: string = input.artist.trim()
  const tryStoredLyrics = async (songId: string | null): Promise<LyricsSongLine[] | null> => {
    if (songId === null || !isPlausibleBackendSongId(songId)) {
      return null
    }
    const fromServer: LyricsSongLine[] = await getLyricsBySongId(songId, signal)
    if (!lyricsLinesHaveNonWhitespaceContent(fromServer)) {
      return null
    }
    return fromServer
  }
  const fromExplicit: LyricsSongLine[] | null = await tryStoredLyrics(input.matchedBackendSongId)
  if (fromExplicit !== null) {
    return fromExplicit
  }
  const listed: SongListItem[] = await listSongsByTitle(title, signal)
  const matchedId: string | null = findMatchingStoredSongId(title, artist, listed)
  const fromLibrary: LyricsSongLine[] | null = await tryStoredLyrics(matchedId)
  if (fromLibrary !== null) {
    return fromLibrary
  }
  const artistForScrape: string | null = artist.length > 0 ? artist : null
  return scrapeLyrics(title, artistForScrape, signal)
}

export const patchLyricsInLibrary = async (
  songId: string,
  lines: LyricsSongLine[],
  signal?: AbortSignal
): Promise<void> => {
  const trimmed: string = songId.trim()
  if (!isPlausibleBackendSongId(trimmed)) {
    throw new Error('Song id is not valid for updating the song library.')
  }
  const baseUrl: string = getApiBaseUrl()
  const encodedId: string = encodeURIComponent(trimmed)
  const url: string = `${baseUrl}/song/lyrics/${encodedId}`
  const response: Response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      lyrics: lines.map((line: LyricsSongLine): { part: string; lyrics: string } => ({
        part: line.part,
        lyrics: line.lyrics,
      })),
    }),
    signal,
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const text: string = await response.text()
    const message: string = messageFromFailedResponseBody(text, 'Could not update lyrics in the song library.')
    const err: Error = new Error(message)
    attachChatPptHttpErrorToThrownError(err, response, text)
    throw err
  }
}

export const patchSongMetadataInLibrary = async (
  songId: string,
  payload: { title: string; artist: string | null },
  signal?: AbortSignal
): Promise<void> => {
  const trimmed: string = songId.trim()
  if (!isPlausibleBackendSongId(trimmed)) {
    throw new Error('Song id is not valid for updating the song library.')
  }
  const baseUrl: string = getApiBaseUrl()
  const encodedId: string = encodeURIComponent(trimmed)
  const url: string = `${baseUrl}/song/${encodedId}`
  const response: Response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      title: payload.title,
      artist: payload.artist,
    }),
    signal,
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const text: string = await response.text()
    const message: string = messageFromFailedResponseBody(text, 'Could not update song title or artist in the library.')
    const err: Error = new Error(message)
    attachChatPptHttpErrorToThrownError(err, response, text)
    throw err
  }
}

export type SyncSongLibraryFromLyricsConfigureSaveInput = {
  explicitMatchedSongId: string | null
  title: string
  artist: string
  lyricsLines: LyricsSongLine[]
}

/**
 * When a configure save matches a song in the library, pushes lyrics and title/artist to the song repository
 * (PATCH /song/lyrics/{id} and PATCH /song/{id}). No-op when no library song can be resolved.
 */
export const syncSongLibraryFromLyricsConfigureSave = async (
  input: SyncSongLibraryFromLyricsConfigureSaveInput,
  signal?: AbortSignal
): Promise<void> => {
  const titleTrimmed: string = input.title.trim()
  if (titleTrimmed.length === 0) {
    return
  }
  const artistTrimmed: string = input.artist.trim()
  const explicit: string = input.explicitMatchedSongId?.trim() ?? ''
  let songId: string | null = null
  if (explicit.length > 0 && isPlausibleBackendSongId(explicit)) {
    songId = explicit
  } else {
    const listed: SongListItem[] = await listSongsByTitle(titleTrimmed, signal)
    songId = findMatchingStoredSongId(titleTrimmed, artistTrimmed, listed)
  }
  if (songId === null) {
    return
  }
  await patchLyricsInLibrary(songId, input.lyricsLines, signal)
  await patchSongMetadataInLibrary(
    songId,
    {
      title: titleTrimmed,
      artist: artistTrimmed.length > 0 ? artistTrimmed : null,
    },
    signal
  )
}
