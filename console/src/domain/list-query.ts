/** Values for the `sort` query parameter on list endpoints (snake-style). */
export type ListSort = 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc'

export type ListSortColumn = 'name' | 'created_at'

export interface PagingQuery {
  readonly page: number
  readonly size: number
  readonly sort: ListSort
}

export interface PageResult<T> {
  readonly items: T[]
  readonly page: number
  readonly size: number
  readonly totalItems: number
  readonly totalPages: number
}

export interface ListPreviewParams {
  readonly limit: number
  readonly sort: ListSort
}

export interface ListPreviewResult<T> {
  readonly items: T[]
  /** Total rows matching the query in the backend (can exceed `items.length`). */
  readonly totalItems: number
}

/** Home card preview: most recent first. Adjust if backend contract prefers another default. */
export const HOME_CARD_PREVIEW_SORT: ListSort = 'date_desc'

export const HOME_CARD_PREVIEW_LIMIT: number = 3

export function nextSortAfterHeaderClick(column: ListSortColumn, current: ListSort): ListSort {
  const isNameSort: boolean = current === 'name_asc' || current === 'name_desc'
  const isDateSort: boolean = current === 'date_asc' || current === 'date_desc'

  if (column === 'name') {
    if (isNameSort) {
      return current === 'name_asc' ? 'name_desc' : 'name_asc'
    }
    return 'name_asc'
  }

  if (column === 'created_at') {
    if (isDateSort) {
      return current === 'date_asc' ? 'date_desc' : 'date_asc'
    }
    return 'date_desc'
  }

  return current
}

export function buildPagingSearchParams(query: PagingQuery): URLSearchParams {
  const params: URLSearchParams = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('size', String(query.size))
  params.set('sort', query.sort)
  return params
}

export function buildPreviewSearchParams(params: ListPreviewParams): URLSearchParams {
  const search: URLSearchParams = new URLSearchParams()
  search.set('limit', String(params.limit))
  search.set('sort', params.sort)
  return search
}
