import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useChangeTemplateName, useListTemplatesPage } from '@/api/query/powerpoint.query'
import { useGetUsers } from '@/api/query/user.query'
import {
  BASE_LIST_PAGE_SIZE,
  BaseListFooter,
  BaseListHeader,
} from '@/App/layouts/base-list-layout/BaseListLayout'
import { ListSortTh } from '@/App/layouts/base-list-layout/ListSortTh'
import type { ListSort } from '@/domain/list-query'
import type { User } from '@/domain/models/user'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import { cn, formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

const MIN_BODY_ROW_PX: number = 36

interface TemplateRow {
  readonly template: TemplateResponse
  readonly user: User
}

interface TemplateNameCellProps {
  readonly template: TemplateResponse
  readonly onCommit: (args: { templateId: string; newName: string }) => void
  readonly isSaving: boolean
}

const TemplateNameCell = ({ template, onCommit, isSaving }: TemplateNameCellProps): React.ReactElement => {
  const [value, setValue] = React.useState<string>(template.name)

  const commitIfChanged = (): void => {
    const trimmed: string = value.trim()
    if (trimmed === '' || trimmed === template.name) {
      setValue(template.name)
      return
    }
    onCommit({ templateId: template.templateId, newName: trimmed })
  }

  const handleBlur = (): void => {
    commitIfChanged()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <input
      type="text"
      disabled={isSaving}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
        setValue(e.target.value)
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e: React.MouseEvent<HTMLInputElement>): void => {
        e.stopPropagation()
      }}
      className={cn(
        'border-input bg-background focus:border-ring text-foreground mx-2 box-border w-64 max-w-[calc(100%-1rem)] shrink rounded-none border px-2 py-1 text-sm leading-snug outline-none',
        isSaving && 'opacity-60'
      )}
    />
  )
}

interface TemplateListTableProps {
  readonly headerRow: React.ReactNode
  readonly colCount: number
  readonly rows: readonly TemplateRow[]
  readonly changeTemplateName: ReturnType<typeof useChangeTemplateName>
}

const TemplateListTable = ({
  headerRow,
  colCount,
  rows,
  changeTemplateName,
}: TemplateListTableProps): React.ReactElement => {
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

  const trHeightStyle: React.CSSProperties = React.useMemo((): React.CSSProperties => {
    return {
      height: bodyRowHeightPx,
      minHeight: bodyRowHeightPx,
      boxSizing: 'border-box',
    }
  }, [bodyRowHeightPx])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4">
      <table ref={tableRef} className="h-full min-h-0 w-full table-fixed border-collapse">
        <thead ref={theadRef} className="text-md">
          <tr>{headerRow}</tr>
        </thead>
        <tbody className="text-muted-foreground text-[14px]">
          {Array.from({ length: BASE_LIST_PAGE_SIZE }, (_: unknown, rowIndex: number) => {
            const row: TemplateRow | undefined = rows[rowIndex]
            const rowKey: string = row !== undefined ? row.template.templateId : `placeholder-${String(rowIndex)}`
            return (
              <tr
                key={rowKey}
                style={trHeightStyle}
                className="border-border hover:bg-border active:bg-secondary border-y align-middle"
              >
                {row === undefined ? (
                  <td colSpan={colCount} className="align-middle" />
                ) : (
                  <>
                    <td className="max-w-0 px-4 py-1 align-middle">
                      <TemplateNameCell
                        key={`${row.template.templateId}\0${row.template.name}`}
                        template={row.template}
                        isSaving={
                          changeTemplateName.isPending &&
                          changeTemplateName.variables?.templateId === row.template.templateId
                        }
                        onCommit={(args): void => {
                          changeTemplateName.mutate({
                            templateId: args.templateId,
                            requestBody: { newName: args.newName },
                          })
                        }}
                      />
                    </td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">{row.user.username}</td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(row.template.createdAt)}</td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(row.template.updatedAt)}</td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function TemplateListPage(): React.ReactElement | null {
  const { t } = useTranslation()
  const [page, setPage] = useState<number>(1)
  const [sort, setSort] = useState<ListSort>('date_desc')
  const changeTemplateName: ReturnType<typeof useChangeTemplateName> = useChangeTemplateName()

  const currentUser: User | undefined = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''

  const paging = useMemo(
    () => ({
      page,
      size: BASE_LIST_PAGE_SIZE,
      sort,
    }),
    [page, sort]
  )

  const pageQuery = useListTemplatesPage(userId, paging)
  const pageData = pageQuery.data
  const users: User[] | undefined = getQueryData(useGetUsers())

  const templateRows: TemplateRow[] = useMemo((): TemplateRow[] => {
    if (pageData === undefined || users === undefined) {
      return []
    }
    return pageData.items.map((template: TemplateResponse): TemplateRow => {
      const user: User | undefined = users.find((u: User) => u.id === template.userId)
      if (user === undefined) throw new Error('User not found')
      return { template, user }
    })
  }, [pageData, users])

  const totalItems: number = pageData?.totalItems ?? 0
  const totalPages: number = Math.max(1, pageData?.totalPages ?? 1)
  const safePage: number = Math.min(page, totalPages)

  const handleSortChange = (next: ListSort): void => {
    setSort(next)
    setPage(1)
  }

  const headerRow: React.ReactElement = (
    <>
      <ListSortTh label={t('list.name')} column="name" sort={sort} onSortChange={handleSortChange} />
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.username')}</th>
      <ListSortTh
        label={t('list.created_at')}
        column="created_at"
        sort={sort}
        onSortChange={handleSortChange}
      />
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.updated_at')}</th>
    </>
  )

  if (currentUser === undefined || pageQuery.isLoading || users === undefined) {
    return null
  }

  if (pageQuery.isError) {
    return (
      <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
        <BaseListHeader title={t('home.templates')} />
        <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-4 text-sm">
          {pageQuery.error instanceof Error ? pageQuery.error.message : 'Failed to load templates.'}
        </div>
      </div>
    )
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
      <BaseListHeader title={t('home.templates')} />
      <div className="min-h-0 flex-1">
        {totalItems > 0 ? (
          <TemplateListTable
            headerRow={headerRow}
            colCount={4}
            rows={templateRows}
            changeTemplateName={changeTemplateName}
          />
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
