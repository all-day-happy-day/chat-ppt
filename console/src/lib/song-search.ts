import type { Song } from '@/domain/models/song'
import type { LyricsContent } from '@/domain/valueobjects/project'

export function normalizeMatchKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) {
    return b.length
  }
  if (b.length === 0) {
    return a.length
  }
  const row: number[] = Array.from({ length: b.length + 1 }, (_, j): number => j)
  for (let i = 1; i <= a.length; i++) {
    let prevDiagonal: number = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const buffer: number = row[j]!
      const cost: number = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prevDiagonal + cost)
      prevDiagonal = buffer
    }
  }
  return row[b.length]!
}

export function levenshteinRatio(a: string, b: string): number {
  const maxLen: number = Math.max(a.length, b.length)
  if (maxLen === 0) {
    return 1
  }
  const dist: number = levenshteinDistance(a, b)
  return 1 - dist / maxLen
}

export function subsequenceMatchRatio(query: string, text: string): number {
  if (query.length === 0) {
    return 0
  }
  let qi = 0
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      qi++
    }
  }
  return qi / query.length
}

export function tokenHitRatio(queryNorm: string, haystackNorm: string): number {
  const tokens: string[] = queryNorm.split(' ').filter((tok: string): boolean => tok.length > 0)
  if (tokens.length === 0) {
    return 0
  }
  let hits = 0
  for (const tok of tokens) {
    if (haystackNorm.includes(tok)) {
      hits++
    }
  }
  return hits / tokens.length
}

export function scoreSongAgainstQuery(queryNorm: string, title: string, artist: string | null): number {
  if (queryNorm.length === 0) {
    return 0
  }
  const titleNorm: string = normalizeMatchKey(title)
  const artistNorm: string = artist !== null ? normalizeMatchKey(artist) : ''
  const haystack: string = `${titleNorm} ${artistNorm}`.trim()
  let score = 0
  if (titleNorm.startsWith(queryNorm)) {
    score += 130
  } else if (titleNorm.includes(queryNorm)) {
    score += 100
  }
  score += subsequenceMatchRatio(queryNorm, titleNorm) * 75
  score += tokenHitRatio(queryNorm, haystack) * 55
  if (artistNorm.length > 0) {
    if (artistNorm.includes(queryNorm)) {
      score += 45
    }
    score += subsequenceMatchRatio(queryNorm, artistNorm) * 30
  }
  const maxSl: number = Math.max(queryNorm.length, titleNorm.length)
  if (maxSl <= 48) {
    score += levenshteinRatio(queryNorm, titleNorm) * 65
  }
  return score
}

const SONG_SEARCH_SCORE_THRESHOLD = 28
const SONG_SEARCH_MAX_RESULTS = 8

export function rankUserSongsByTitle(songs: readonly Song[], rawQuery: string): Song[] {
  const queryNorm: string = normalizeMatchKey(rawQuery)
  if (queryNorm.length === 0) {
    return []
  }
  const threshold: number = queryNorm.length <= 2 ? 18 : SONG_SEARCH_SCORE_THRESHOLD
  const scored: { song: Song; score: number }[] = []
  for (const song of songs) {
    const s: number = scoreSongAgainstQuery(queryNorm, song.title, song.artist)
    if (s >= threshold) {
      scored.push({ song, score: s })
    }
  }
  scored.sort((a: { song: Song; score: number }, b: { song: Song; score: number }): number => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return normalizeMatchKey(a.song.title).localeCompare(normalizeMatchKey(b.song.title))
  })
  return scored.slice(0, SONG_SEARCH_MAX_RESULTS).map((row: { song: Song; score: number }): Song => row.song)
}

export function formatSongLibraryLabel(song: Song): string {
  if (song.artist !== null && song.artist.trim().length > 0) {
    return `${song.title} - ${song.artist}`
  }
  return song.title
}

/**
 * Resolves library song id for `/song/lyrics/get/:id`: explicit link first, else a single unambiguous
 * title (+ artist) match in the loaded library list.
 */
export function resolveSongIdForLyricsFetch(row: LyricsContent, library: readonly Song[] | undefined): string {
  const explicit: string = row.songId?.trim() ?? ''
  if (explicit.length > 0) {
    return explicit
  }
  if (library === undefined || library.length === 0) {
    return ''
  }
  const titleNorm: string = normalizeMatchKey(row.title)
  if (titleNorm.length === 0) {
    return ''
  }
  const cardArtistNorm: string = row.artist !== null ? normalizeMatchKey(row.artist) : ''
  const byTitle: Song[] = library.filter((s: Song): boolean => normalizeMatchKey(s.title) === titleNorm)
  if (byTitle.length === 0) {
    return ''
  }
  if (cardArtistNorm.length > 0) {
    const withArtist: Song[] = byTitle.filter((s: Song): boolean => {
      const libArtistNorm: string = s.artist !== null ? normalizeMatchKey(s.artist) : ''
      return libArtistNorm === cardArtistNorm
    })
    return withArtist.length === 1 ? withArtist[0]!.id : ''
  }
  return byTitle.length === 1 ? byTitle[0]!.id : ''
}
