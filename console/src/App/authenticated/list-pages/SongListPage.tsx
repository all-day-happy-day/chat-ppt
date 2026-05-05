import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'

import { QUERY_KEY } from '@/api/query/key'
import { useDeleteSong, useListSongsPage } from '@/api/query/song.query'
import { useGetUsers } from '@/api/query/user.query'
import { BASE_LIST_PAGE_SIZE, BaseListFooter, BaseListHeader } from '@/App/layouts/base-list-layout/BaseListLayout'
import { ListSortTh } from '@/App/layouts/base-list-layout/ListSortTh'
import { Button } from '@/components/ui/button/Button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog/ConfirmDialog'
import type { ListSort } from '@/domain/list-query'
import type { Song } from '@/domain/models/song'
import type { User } from '@/domain/models/user'
import { cn, formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import type { CSSProperties, ReactElement } from 'react'

const MIN_BODY_ROW_PX: number = 36

interface SongRow {
  readonly song: Song
  readonly user: User
}

interface SongListTableProps {
  readonly headerRow: React.ReactNode
  readonly colCount: number
  readonly rows: readonly SongRow[]
  readonly refetchSongsPage: () => Promise<unknown>
  readonly deleteSong: ReturnType<typeof useDeleteSong>
}

const SongListTable = ({
  headerRow,
  colCount,
  rows,
  refetchSongsPage,
  deleteSong,
}: SongListTableProps): React.ReactElement => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tableRef: React.RefObject<HTMLTableElement | null> = React.useRef<HTMLTableElement | null>(null)
  const theadRef: React.RefObject<HTMLTableSectionElement | null> = React.useRef<HTMLTableSectionElement | null>(null)
  const [bodyRowHeightPx, setBodyRowHeightPx] = React.useState<number>(MIN_BODY_ROW_PX)
  const [deleteTarget, setDeleteTarget] = React.useState<Song | null>(null)

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

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4">
        <table ref={tableRef} className="h-full min-h-0 w-full table-fixed border-collapse">
          <thead ref={theadRef} className="text-md">
            <tr>{headerRow}</tr>
          </thead>
          <tbody className="text-muted-foreground text-[14px]">
            {Array.from({ length: BASE_LIST_PAGE_SIZE }, (_: unknown, rowIndex: number) => {
              const row: SongRow | undefined = rows[rowIndex]
              const song: Song | undefined = row?.song
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
                  aria-label={song === undefined ? undefined : t('list.open_song_row', { title: song.title })}
                >
                  {song === undefined || row === undefined ? (
                    <td colSpan={colCount} className="align-middle" />
                  ) : (
                    <>
                      <td className="max-w-0 truncate px-4 py-1 align-middle font-medium">{song.title}</td>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">{song.artist ?? t('song.no_artist')}</td>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">{row.user.username}</td>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(song.createdAt)}</td>
                      <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(song.updatedAt)}</td>
                      <td
                        className="min-w-18 py-1 pr-10 pl-4 align-middle"
                        onClick={(e: React.MouseEvent<HTMLTableCellElement>): void => {
                          e.stopPropagation()
                        }}
                      >
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deleteSong.isPending && deleteSong.variables === song.id}
                            loading={deleteSong.isPending && deleteSong.variables === song.id}
                            loadingLabel={t('page.song_delete.deleting')}
                            aria-label={t('list.delete_song_aria', { title: song.title })}
                            onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                              e.stopPropagation()
                              setDeleteTarget(song)
                            }}
                          >
                            <Trash2Icon aria-hidden className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('page.song_delete.dialog_title')}
        description={deleteTarget !== null ? t('list.delete_song_confirm', { title: deleteTarget.title }) : ''}
        cancelLabel={t('common.global.cancel')}
        confirmLabel={t('common.global.delete')}
        confirmVariant="destructive"
        confirmLoading={deleteSong.isPending && deleteTarget !== null && deleteSong.variables === deleteTarget.id}
        confirmLoadingLabel={t('page.song_delete.deleting')}
        onCancel={(): void => {
          setDeleteTarget(null)
        }}
        onConfirm={(): void => {
          if (deleteTarget === null) {
            return
          }
          const id: string = deleteTarget.id
          deleteSong.mutate(id, {
            onSuccess: async (): Promise<void> => {
              await refetchSongsPage()
            },
            onSettled: (): void => {
              setDeleteTarget(null)
            },
          })
        }}
      />
    </>
  )
}

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

  const queryClient = useQueryClient()
  const pageQuery = useListSongsPage(paging)
  const pageData = pageQuery.data
  const users: User[] | undefined = getQueryData(useGetUsers())
  const deleteSong: ReturnType<typeof useDeleteSong> = useDeleteSong()

  const refetchSongListPage = React.useCallback(async (): Promise<void> => {
    const pageKey = QUERY_KEY.SONG.PAGE(paging.page, paging.size, paging.sort)
    await queryClient.refetchQueries({ queryKey: pageKey, type: 'all' })
  }, [paging.page, paging.size, paging.sort, queryClient])

  const totalItems: number = pageData?.totalItems ?? 0
  const totalPages: number = Math.max(1, pageData?.totalPages ?? 1)
  const safePage: number = Math.min(page, totalPages)

  const songRows: SongRow[] = useMemo((): SongRow[] => {
    if (pageData === undefined || users === undefined) {
      return []
    }
    return pageData.items.map((song: Song): SongRow => {
      const user: User | undefined = users.find((u: User): boolean => u.id === song.userId)
      if (user === undefined) {
        throw new Error('User not found')
      }
      return { song, user }
    })
  }, [pageData, users])

  const handleSortChange = (next: ListSort): void => {
    setSort(next)
    setPage(1)
  }

  const headerRow: ReactElement = (
    <>
      <ListSortTh label={t('list.title')} column="name" sort={sort} onSortChange={handleSortChange} />
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.artist')}</th>
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.username')}</th>
      <ListSortTh label={t('list.created_at')} column="created_at" sort={sort} onSortChange={handleSortChange} />
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.updated_at')}</th>
      <th className="bg-secondary h-fit min-w-18 py-4 pr-10 pl-3 text-right">
        <span className="sr-only">{t('list.actions_column')}</span>
      </th>
    </>
  )

  if (pageQuery.isLoading || users === undefined) {
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 justify-end px-4 pt-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={(): void => {
              navigate('/songs/new')
            }}
          >
            {t('common.global.add')}
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          {totalItems > 0 ? (
            <SongListTable
              headerRow={headerRow}
              colCount={6}
              rows={songRows}
              refetchSongsPage={refetchSongListPage}
              deleteSong={deleteSong}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4">
              <div className="text-muted-foreground text-center text-sm">{t('common.global.no_content')}</div>
            </div>
          )}
        </div>
      </div>
      <BaseListFooter
        pagination={{ page: safePage, pageSize: BASE_LIST_PAGE_SIZE, total: totalItems }}
        onPageChange={setPage}
      />
    </div>
  )
}
