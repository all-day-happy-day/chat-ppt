import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button/Button'

import '@/i18n/i18n'

/** Rows per page in the list table and default page size for paginated APIs. */
export const BASE_LIST_PAGE_SIZE: number = 10

const MIN_BODY_ROW_PX: number = 36

export interface BaseListPagination {
  readonly page: number
  readonly pageSize: number
  readonly total: number
}

export interface BaseListContentsProps {
  title: string
  headers: string[]
  contents: Record<string, unknown>[]
  pagination?: BaseListPagination
  onPageChange?: (page: number) => void
}

export function BaseListTitle({ title }: { title: string }) {
  return <div className="text-4xl font-bold">{title}</div>
}

export function BaseListHeader({ title }: { title: string }) {
  return (
    <div className="flex h-[75px] w-full flex-row items-end justify-start pb-4 pl-4">
      <BaseListTitle title={title} />
    </div>
  )
}

export function BaseListContent({ headers, contents }: Pick<BaseListContentsProps, 'headers' | 'contents'>) {
  const { t } = useTranslation()

  const tableRef = React.useRef<HTMLTableElement | null>(null)
  const theadRef = React.useRef<HTMLTableSectionElement | null>(null)
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

  const trHeightStyle: React.CSSProperties = React.useMemo((): React.CSSProperties => {
    return {
      height: bodyRowHeightPx,
      minHeight: bodyRowHeightPx,
      boxSizing: 'border-box',
    }
  }, [bodyRowHeightPx])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4">
      {contents && contents.length > 0 ? (
        <table ref={tableRef} className="h-full min-h-0 w-full table-fixed border-collapse">
          <thead ref={theadRef} className="text-md">
            <tr>
              {headers.map((header) => (
                <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted-foreground text-[14px]">
            {Array.from({ length: BASE_LIST_PAGE_SIZE }, (_: unknown, rowIndex: number) => {
              const row: Record<string, unknown> | undefined = contents[rowIndex]
              return (
                <tr
                  key={rowIndex}
                  style={trHeightStyle}
                  className="border-border hover:bg-border active:bg-secondary cursor-pointer border-y align-middle"
                >
                  {row === undefined ? (
                    <td colSpan={headers.length} className="align-middle" />
                  ) : (
                    headers.map((h) => (
                      <td key={h} className="max-w-0 truncate px-4 py-1 align-middle">
                        {String(row[h] ?? '')}
                      </td>
                    ))
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="flex h-full flex-col items-center justify-center">
          <div className="text-muted-foreground text-center text-sm">{t('common.global.no_content')}</div>
        </div>
      )}
    </div>
  )
}

interface BaseListFooterProps {
  readonly pagination?: BaseListPagination
  readonly onPageChange?: (page: number) => void
}

export function BaseListFooter({ pagination, onPageChange }: BaseListFooterProps): React.ReactElement {
  if (pagination === undefined || onPageChange === undefined) {
    return <div className="h-[80px] w-full shrink-0 p-4" aria-hidden />
  }

  const totalPages: number = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const currentPage: number = Math.min(pagination.page, totalPages)
  const canGoPrev: boolean = currentPage > 1
  const canGoNext: boolean = currentPage < totalPages
  const rangeStart: number = pagination.total === 0 ? 0 : (currentPage - 1) * pagination.pageSize + 1
  const rangeEnd: number = Math.min(currentPage * pagination.pageSize, pagination.total)

  return (
    <div className="border-border flex h-[80px] w-full shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <span className="text-muted-foreground text-sm">
        {pagination.total === 0
          ? 'No items'
          : `Showing ${String(rangeStart)}–${String(rangeEnd)} of ${String(pagination.total)}`}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">
          Page {String(currentPage)} / {String(totalPages)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoPrev}
          onClick={(): void => {
            onPageChange(currentPage - 1)
          }}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoNext}
          onClick={(): void => {
            onPageChange(currentPage + 1)
          }}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export function BaseListLayout({ title, headers, contents, pagination, onPageChange }: BaseListContentsProps) {
  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
      <BaseListHeader title={title} />
      <div className="min-h-0 flex-1">
        <BaseListContent headers={headers} contents={contents} />
      </div>
      <BaseListFooter pagination={pagination} onPageChange={onPageChange} />
    </div>
  )
}
