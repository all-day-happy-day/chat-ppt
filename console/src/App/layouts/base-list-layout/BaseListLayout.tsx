import * as React from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/i18n'

const ITEMS_PER_PAGE: number = 10
const MIN_BODY_ROW_PX: number = 36

export interface BaseListContentsProps {
  title: string
  headers: string[]
  contents: Record<string, unknown>[]
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

export function BaseListContent({ headers, contents }: BaseListContentsProps) {
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
      const perRow: number = Math.floor(availablePx / ITEMS_PER_PAGE)
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
            {Array.from({ length: ITEMS_PER_PAGE }, (_: unknown, rowIndex: number) => {
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

export function BaseListFooter() {
  return (
    <div className="flex h-[80px] w-full p-4">
      <div className="border-border w-full border text-center">TBU</div>
    </div>
  )
}

export function BaseListLayout({ title, headers, contents }: BaseListContentsProps) {
  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
      <BaseListHeader title={title} />
      <div className="min-h-0 flex-1">
        <BaseListContent title={title} headers={headers} contents={contents} />
      </div>
      <BaseListFooter />
    </div>
  )
}
