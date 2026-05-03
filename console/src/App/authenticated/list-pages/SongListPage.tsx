import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useListSongsPage } from '@/api/query/song.query'
import {
  BASE_LIST_PAGE_SIZE,
  BaseListFooter,
  BaseListHeader,
} from '@/App/layouts/base-list-layout/BaseListLayout'
import { ListSortTh } from '@/App/layouts/base-list-layout/ListSortTh'
import type { ListSort } from '@/domain/list-query'
import type { Song } from '@/domain/models/song'
import { cn, formatDate } from '@/lib/utils'

import '@/i18n/i18n'

import type { CSSProperties, ReactElement } from 'react'

const MIN_BODY_ROW_PX: number = 36

export function SongListPage(): ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState<number>(1)
  const [sort, setSort] = useState<ListSort>('date_desc')

  const paging = useMemo(
    () => ({
      page,
      size: BASE_LIST_PAGE_SIZE,
      sort,
    }),
    [page, sort]
  )

  const pageQuery = useListSongsPage(paging)
  const pageData = pageQuery.data

  const totalItems: number = pageData?.totalItems ?? 0
  const totalPages: number = Math.max(1, pageData?.totalPages ?? 1)
  const safePage: number = Math.min(page, totalPages)
  const rows: Song[] = pageData?.items ?? []

  const handleSortChange = (next: ListSort): void => {
    setSort(next)
    setPage(1)
  }

  const tableRef: React.RefObject<HTMLTableElement | null> = React.useRef<HTMLTableElement | null>(null)
  const theadRef: React.RefObject<HTMLTableSectionElement | null> = React.useRef<HTMLTableSectionElement | null>(null)
  const [bodyRowHeightPx, setBodyRowHeightPx] = React.useState<number>(MIN_BODY_ROW_PX)

  React.useLayoutEffect((): void | (() => void) => {
    const tableEl: HTMLTableElement | null = tableRef.current
    const theadEl: HTMLTableSectionElement | null = theadRef.current
    if (tableEl === null || theadEl === null) {
      return
    }
    const compute = (): void => {
      const availablePx: number = Math.max(0, tableEl.clientHeight - theadEl.offsetHeight)
      const perRow: number = Math.floor(availablePx / BASE_LIST_PAGE_SIZE)
      setBodyRowHeightPx(Math.max(MIN_BODY_ROW_PX, perRow))
    }
    compute()
    const ro: ResizeObserver = new ResizeObserver(compute)
    ro.observe(tableEl)
    return (): void => {
      ro.disconnect()
    }
  }, [])

  const trHeightStyle: CSSProperties = React.useMemo((): CSSProperties => {
    return {
      height: bodyRowHeightPx,
      minHeight: bodyRowHeightPx,
      boxSizing: 'border-box',
    }
  }, [bodyRowHeightPx])

  const headerRow: ReactElement = (
    <>
      <ListSortTh
        label={t('list.title')}
        column="name"
        sort={sort}
        onSortChange={handleSortChange}
      />
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.artist')}</th>
      <ListSortTh
        label={t('list.created_at')}
        column="created_at"
        sort={sort}
        onSortChange={handleSortChange}
      />
    </>
  )

  if (pageQuery.isLoading) {
    return null
  }

  if (pageQuery.isError) {
    return (
      <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
        <BaseListHeader title={t('home.songs')} />
        <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-4 text-sm">
          {pageQuery.error instanceof Error ? pageQuery.error.message : 'Failed to load songs.'}
        </div>
      </div>
    )
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
      <BaseListHeader title={t('home.songs')} />
      <div className="min-h-0 flex-1">
        {totalItems > 0 ? (
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4">
            <table ref={tableRef} className="h-full min-h-0 w-full table-fixed border-collapse">
              <thead ref={theadRef} className="text-md">
                <tr>{headerRow}</tr>
              </thead>
              <tbody className="text-muted-foreground text-[14px]">
                {Array.from({ length: BASE_LIST_PAGE_SIZE }, (_: unknown, rowIndex: number) => {
                  const song: Song | undefined = rows[rowIndex]
                  const rowKey: string = song !== undefined ? song.id : `placeholder-${String(rowIndex)}`
                  return (
                    <tr
                      key={rowKey}
                      style={trHeightStyle}
                      tabIndex={song === undefined ? undefined : 0}
                      onClick={
                        song === undefined
                          ? undefined
                          : (): void => {
                              navigate(`/songs/${song.id}/edit`)
                            }
                      }
                      onKeyDown={
                        song === undefined
                          ? undefined
                          : (e: React.KeyboardEvent<HTMLTableRowElement>): void => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                navigate(`/songs/${song.id}/edit`)
                              }
                            }
                      }
                      className={cn(
                        'border-border border-y align-middle',
                        song !== undefined &&
                          'hover:bg-border active:bg-secondary focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                      )}
                      aria-label={
                        song === undefined ? undefined : t('list.open_song_row', { title: song.title })
                      }
                    >
                      {song === undefined ? (
                        <td colSpan={3} className="align-middle" />
                      ) : (
                        <>
                          <td className="max-w-0 truncate px-4 py-1 align-middle font-medium">{song.title}</td>
                          <td className="max-w-0 truncate px-4 py-1 align-middle">
                            {song.artist ?? t('song.no_artist')}
                          </td>
                          <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(song.createdAt)}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <div className="text-muted-foreground text-center text-sm">{t('common.global.no_content')}</div>
          </div>
        )}
      </div>
      <BaseListFooter
        pagination={{ page: safePage, pageSize: BASE_LIST_PAGE_SIZE, total: totalItems }}
        onPageChange={setPage}
      />
    </div>
  )
}
