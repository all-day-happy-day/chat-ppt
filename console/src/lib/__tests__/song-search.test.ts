import {
  formatSongLibraryLabel,
  levenshteinDistance,
  levenshteinRatio,
  normalizeMatchKey,
  rankUserSongsByTitle,
  resolveSongIdForLyricsFetch,
  scoreSongAgainstQuery,
  subsequenceMatchRatio,
  tokenHitRatio,
} from '@/lib/song-search'

// --- Types (minimal stubs) ---

type Song = {
  id: string
  title: string
  artist: string | null
}

type LyricsContent = {
  title: string
  artist: string | null
  songId: string | null
  lyrics: { part: string; lyrics: string }[]
  lyricsPartSequence: number[]
  lyricsPartsConfigured: boolean
  includeTitleSlide: boolean
}

// --- Tests ---

describe('normalizeMatchKey', () => {
  it('lowercases and trims', () => {
    expect(normalizeMatchKey('  Amazing Grace  ')).toBe('amazing grace')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeMatchKey('hello   world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(normalizeMatchKey('')).toBe('')
  })

  it('handles already-normalized string', () => {
    expect(normalizeMatchKey('amazing grace')).toBe('amazing grace')
  })
})

describe('levenshteinDistance', () => {
  it('returns 0 for equal strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
  })

  it('returns b.length when a is empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3)
  })

  it('returns a.length when b is empty', () => {
    expect(levenshteinDistance('abc', '')).toBe(3)
  })

  it('returns 1 for single substitution', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1)
  })

  it('returns 1 for single insertion', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1)
  })

  it('returns 1 for single deletion', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1)
  })

  it('computes correctly for unrelated strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3)
  })
})

describe('levenshteinRatio', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinRatio('hello', 'hello')).toBe(1)
  })

  it('returns 1 for two empty strings', () => {
    expect(levenshteinRatio('', '')).toBe(1)
  })

  it('returns 0 for completely different strings of same length', () => {
    expect(levenshteinRatio('abc', 'xyz')).toBe(0)
  })

  it('returns a value between 0 and 1 for partially similar strings', () => {
    const ratio = levenshteinRatio('hello', 'hallo')
    expect(ratio).toBeGreaterThan(0)
    expect(ratio).toBeLessThan(1)
  })
})

describe('subsequenceMatchRatio', () => {
  it('returns 0 when query is empty', () => {
    expect(subsequenceMatchRatio('', 'hello')).toBe(0)
  })

  it('returns 1 when all query chars appear in order in text', () => {
    expect(subsequenceMatchRatio('ace', 'abcde')).toBe(1)
  })

  it('returns 1 for exact match', () => {
    expect(subsequenceMatchRatio('hello', 'hello')).toBe(1)
  })

  it('returns partial ratio when some chars missing', () => {
    // 'az' in 'abc': only 'a' matches (z not in text), ratio = 1/2
    expect(subsequenceMatchRatio('az', 'abc')).toBe(0.5)
  })

  it('returns 0 when no query chars found in text', () => {
    expect(subsequenceMatchRatio('xyz', 'abc')).toBe(0)
  })
})

describe('tokenHitRatio', () => {
  it('returns 0 when query has no tokens', () => {
    expect(tokenHitRatio('', 'some haystack')).toBe(0)
    expect(tokenHitRatio('   ', 'some haystack')).toBe(0)
  })

  it('returns 1 when all tokens appear in haystack', () => {
    expect(tokenHitRatio('amazing grace', 'amazing grace hymn')).toBe(1)
  })

  it('returns 0.5 when half of tokens hit', () => {
    expect(tokenHitRatio('amazing xyz', 'amazing grace')).toBe(0.5)
  })

  it('returns 0 when no tokens hit', () => {
    expect(tokenHitRatio('foo bar', 'amazing grace')).toBe(0)
  })
})

describe('scoreSongAgainstQuery', () => {
  it('returns 0 for empty query', () => {
    expect(scoreSongAgainstQuery('', 'Amazing Grace', null)).toBe(0)
  })

  it('returns higher score for exact title prefix match', () => {
    const prefixScore = scoreSongAgainstQuery('amazing', 'Amazing Grace', null)
    const noMatchScore = scoreSongAgainstQuery('zzz', 'Amazing Grace', null)
    expect(prefixScore).toBeGreaterThan(noMatchScore)
  })

  it('returns higher score for title prefix than substring match', () => {
    const prefix = scoreSongAgainstQuery('amaz', 'Amazing Grace', null)
    const sub = scoreSongAgainstQuery('grace', 'Amazing Grace', null)
    // prefix of title should score at least as high as internal match
    expect(prefix).toBeGreaterThanOrEqual(sub)
  })

  it('gives bonus for artist match', () => {
    const withArtist = scoreSongAgainstQuery('newton', 'Amazing Grace', 'John Newton')
    const withoutArtist = scoreSongAgainstQuery('newton', 'Amazing Grace', null)
    expect(withArtist).toBeGreaterThan(withoutArtist)
  })
})

describe('rankUserSongsByTitle', () => {
  const library: Song[] = [
    { id: '1', title: 'Amazing Grace', artist: 'John Newton' },
    { id: '2', title: 'How Great Thou Art', artist: null },
    { id: '3', title: 'Great Is Thy Faithfulness', artist: null },
    { id: '4', title: 'Unrelated Song', artist: null },
  ]

  it('returns empty array for empty query', () => {
    expect(rankUserSongsByTitle(library, '')).toEqual([])
    expect(rankUserSongsByTitle(library, '   ')).toEqual([])
  })

  it('returns empty array for empty library', () => {
    expect(rankUserSongsByTitle([], 'grace')).toEqual([])
  })

  it('returns matching songs for a query', () => {
    const results = rankUserSongsByTitle(library, 'grace')
    expect(results.map((s) => s.id)).toContain('1')
  })

  it('ranks better matches higher', () => {
    const results = rankUserSongsByTitle(library, 'amazing grace')
    expect(results[0]?.id).toBe('1')
  })

  it('caps results at 8', () => {
    const bigLibrary: Song[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      title: `Amazing Song ${String(i)}`,
      artist: null,
    }))
    const results = rankUserSongsByTitle(bigLibrary, 'amazing')
    expect(results.length).toBeLessThanOrEqual(8)
  })

  it('filters out songs below threshold', () => {
    const results = rankUserSongsByTitle(library, 'amazing')
    const ids = results.map((s) => s.id)
    expect(ids).not.toContain('4') // "Unrelated Song" should not match "amazing"
  })
})

describe('formatSongLibraryLabel', () => {
  it('returns "title - artist" when artist is present', () => {
    const song: Song = { id: '1', title: 'Amazing Grace', artist: 'John Newton' }
    expect(formatSongLibraryLabel(song)).toBe('Amazing Grace - John Newton')
  })

  it('returns just the title when artist is null', () => {
    const song: Song = { id: '2', title: 'How Great Thou Art', artist: null }
    expect(formatSongLibraryLabel(song)).toBe('How Great Thou Art')
  })

  it('returns just the title when artist is whitespace only', () => {
    const song: Song = { id: '3', title: 'Holy Holy Holy', artist: '   ' }
    expect(formatSongLibraryLabel(song)).toBe('Holy Holy Holy')
  })
})

describe('resolveSongIdForLyricsFetch', () => {
  const makeLyricsContent = (overrides: Partial<LyricsContent> = {}): LyricsContent => ({
    title: 'Amazing Grace',
    artist: null,
    songId: null,
    lyrics: [],
    lyricsPartSequence: [],
    lyricsPartsConfigured: false,
    includeTitleSlide: true,
    ...overrides,
  })

  const library: Song[] = [
    { id: 'song-1', title: 'Amazing Grace', artist: 'John Newton' },
    { id: 'song-2', title: 'Amazing Grace', artist: 'Traditional' },
    { id: 'song-3', title: 'How Great Thou Art', artist: null },
  ]

  it('returns explicit songId when set', () => {
    const row = makeLyricsContent({ songId: 'explicit-id' })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('explicit-id')
  })

  it('trims whitespace from songId', () => {
    const row = makeLyricsContent({ songId: '  explicit-id  ' })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('explicit-id')
  })

  it('returns empty string when library is undefined', () => {
    const row = makeLyricsContent({ title: 'Amazing Grace' })
    expect(resolveSongIdForLyricsFetch(row, undefined)).toBe('')
  })

  it('returns empty string when library is empty', () => {
    const row = makeLyricsContent({ title: 'Amazing Grace' })
    expect(resolveSongIdForLyricsFetch(row, [])).toBe('')
  })

  it('returns empty string when title is empty', () => {
    const row = makeLyricsContent({ title: '' })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('')
  })

  it('returns song id when there is exactly one title match with no artist constraint', () => {
    const row = makeLyricsContent({ title: 'How Great Thou Art', artist: null })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('song-3')
  })

  it('returns empty string when multiple title matches and no artist on card', () => {
    // "Amazing Grace" matches two songs; no artist to disambiguate
    const row = makeLyricsContent({ title: 'Amazing Grace', artist: null })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('')
  })

  it('returns matching song id when artist disambiguates', () => {
    const row = makeLyricsContent({ title: 'Amazing Grace', artist: 'John Newton' })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('song-1')
  })

  it('returns empty string when artist does not match any', () => {
    const row = makeLyricsContent({ title: 'Amazing Grace', artist: 'Unknown Artist' })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('')
  })

  it('is case-insensitive for title matching', () => {
    const row = makeLyricsContent({ title: 'how great thou art', artist: null })
    expect(resolveSongIdForLyricsFetch(row, library)).toBe('song-3')
  })
})
