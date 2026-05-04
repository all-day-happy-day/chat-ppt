import { API_BASE_URL } from '@/api/client'

export type BibleReferenceProbeOk = { readonly kind: 'ok' }

export type BibleReferenceProbeError = {
  readonly kind: 'error'
  readonly httpStatus: number
  readonly detail: string
}

export type BibleReferenceProbeResult = BibleReferenceProbeOk | BibleReferenceProbeError

function extractFastApiDetail(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw
  }
  if (Array.isArray(raw)) {
    const first: unknown = raw[0]
    if (
      first !== null &&
      typeof first === 'object' &&
      'msg' in first &&
      typeof (first as { msg: unknown }).msg === 'string'
    ) {
      return (first as { msg: string }).msg
    }
    try {
      return JSON.stringify(raw)
    } catch {
      return ''
    }
  }
  if (raw !== null && typeof raw === 'object' && 'detail' in raw) {
    return extractFastApiDetail((raw as { detail: unknown }).detail)
  }
  return ''
}

/** Maps `HTTPException.detail` / exception message text to i18n key under `page.project_view`. */
export function bibleProbeDetailToI18nKey(detail: string): string {
  const d: string = detail.trim().toLowerCase()
  if (d.length === 0) {
    return 'bible_probe_generic'
  }
  const compact: string = d.replace(/[\s_-]+/g, '')
  if (compact.includes('multipleseparators') || compact.includes('multipleseparator')) {
    return 'bible_probe_multiple_separators'
  }
  if (d.includes('multiple separators')) {
    return 'bible_probe_multiple_separators'
  }
  if (compact.includes('unsupportedletter')) {
    return 'bible_probe_unsupported_letter'
  }
  if (d.includes('unsupported letter')) {
    return 'bible_probe_unsupported_letter'
  }
  if (compact.includes('multiplenumbers')) {
    return 'bible_probe_multiple_numbers'
  }
  if (d.includes('multiple numbers')) {
    return 'bible_probe_multiple_numbers'
  }
  if (compact.includes('booknotfound')) {
    return 'bible_probe_book_not_found'
  }
  if (d.includes('book not found')) {
    return 'bible_probe_book_not_found'
  }
  if (compact.includes('chapternotfound')) {
    return 'bible_probe_chapter_not_found'
  }
  if (d.includes('chapter not found')) {
    return 'bible_probe_chapter_not_found'
  }
  if (compact.includes('versenotfound') || compact.includes('phrasenotfound')) {
    return 'bible_probe_verse_not_found'
  }
  if (d.includes('phrase not found') || d.includes('verse not found')) {
    return 'bible_probe_verse_not_found'
  }
  if (
    compact.includes('unsupportedversion') ||
    compact.includes('versionnotfound')
  ) {
    return 'bible_probe_unsupported_version'
  }
  if (d.includes('version not found') || d.includes('unsupported version')) {
    return 'bible_probe_unsupported_version'
  }
  return 'bible_probe_generic'
}

/**
 * GET `/bible/{version}/{book}/{chapter}/{verse}` — same as backend; `chapter` and `verse` are path strings.
 */
export async function probeBibleReference(
  version: string,
  book: string,
  chapter: string,
  verse: string,
  signal?: AbortSignal
): Promise<BibleReferenceProbeResult> {
  const path: string = [
    encodeURIComponent(version),
    encodeURIComponent(book),
    encodeURIComponent(chapter),
    encodeURIComponent(verse),
  ].join('/')
  const url: string = `${API_BASE_URL}/bible/${path}`
  const response: Response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  })
  if (response.ok) {
    return { kind: 'ok' }
  }
  let detail: string = response.statusText
  try {
    const body: unknown = await response.json()
    const parsed: string = extractFastApiDetail(body)
    if (parsed.length > 0) {
      detail = parsed
    }
  } catch {
    // keep statusText
  }
  return { kind: 'error', httpStatus: response.status, detail }
}
