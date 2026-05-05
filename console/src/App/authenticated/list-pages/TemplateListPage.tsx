import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Trash2Icon } from 'lucide-react'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useChangeTemplateName, useDeleteTemplate, useListTemplatesPage } from '@/api/query/powerpoint.query'
import { useGetUsers } from '@/api/query/user.query'
import { BASE_LIST_PAGE_SIZE, BaseListFooter, BaseListHeader } from '@/App/layouts/base-list-layout/BaseListLayout'
import { ListSortTh } from '@/App/layouts/base-list-layout/ListSortTh'
import { Button } from '@/components/ui/button/Button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog/ConfirmDialog'
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
  readonly listUserId: string
  readonly refetchTemplatePage: () => Promise<unknown>
  readonly changeTemplateName: ReturnType<typeof useChangeTemplateName>
  readonly deleteTemplate: ReturnType<typeof useDeleteTemplate>
}

const TemplateListTable = ({
  headerRow,
  colCount,
  rows,
  listUserId,
  refetchTemplatePage,
  changeTemplateName,
  deleteTemplate,
}: TemplateListTableProps): React.ReactElement => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tableRef: React.RefObject<HTMLTableElement | null> = React.useRef<HTMLTableElement | null>(null)
  const theadRef: React.RefObject<HTMLTableSectionElement | null> = React.useRef<HTMLTableSectionElement | null>(null)
  const [bodyRowHeightPx, setBodyRowHeightPx] = React.useState<number>(MIN_BODY_ROW_PX)
  const [deleteTarget, setDeleteTarget] = React.useState<TemplateResponse | null>(null)

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
    <>
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
                  tabIndex={row === undefined ? undefined : 0}
                  onClick={
                    row === undefined
                      ? undefined
                      : (): void => {
                          navigate(`/templates/${row.template.templateId}/edit`)
                        }
                  }
                  onKeyDown={
                    row === undefined
                      ? undefined
                      : (e: React.KeyboardEvent<HTMLTableRowElement>): void => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/templates/${row.template.templateId}/edit`)
                          }
                        }
                  }
                  className={cn(
                    'border-border border-y align-middle',
                    row !== undefined &&
                      'hover:bg-border active:bg-secondary focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                  )}
                  aria-label={row === undefined ? undefined : t('list.open_template_row', { name: row.template.name })}
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
                            disabled={
                              deleteTemplate.isPending &&
                              deleteTemplate.variables?.templateId === row.template.templateId
                            }
                            loading={
                              deleteTemplate.isPending &&
                              deleteTemplate.variables?.templateId === row.template.templateId
                            }
                            loadingLabel={t('page.template_edit.deleting')}
                            aria-label={t('list.delete_template_aria', { name: row.template.name })}
                            onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                              e.stopPropagation()
                              setDeleteTarget(row.template)
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
        title={t('page.template_delete.dialog_title')}
        description={deleteTarget !== null ? t('list.delete_template_confirm', { name: deleteTarget.name }) : ''}
        cancelLabel={t('common.global.cancel')}
        confirmLabel={t('common.global.delete')}
        confirmVariant="destructive"
        confirmLoading={
          deleteTemplate.isPending &&
          deleteTarget !== null &&
          deleteTemplate.variables?.templateId === deleteTarget.templateId
        }
        confirmLoadingLabel={t('page.template_edit.deleting')}
        onCancel={(): void => {
          setDeleteTarget(null)
        }}
        onConfirm={(): void => {
          if (deleteTarget === null) {
            return
          }
          const id: string = deleteTarget.templateId
          deleteTemplate.mutate(
            { templateId: id, userId: listUserId },
            {
              onSuccess: async (): Promise<void> => {
                await refetchTemplatePage()
              },
              onSettled: (): void => {
                setDeleteTarget(null)
              },
            }
          )
        }}
      />
    </>
  )
}

export function TemplateListPage(): React.ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState<number>(1)
  const [sort, setSort] = useState<ListSort>('date_desc')
  const changeTemplateName: ReturnType<typeof useChangeTemplateName> = useChangeTemplateName()
  const deleteTemplate: ReturnType<typeof useDeleteTemplate> = useDeleteTemplate()

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
      <ListSortTh label={t('list.created_at')} column="created_at" sort={sort} onSortChange={handleSortChange} />
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.updated_at')}</th>
      <th className="bg-secondary h-fit min-w-18 py-4 pr-10 pl-3 text-right">
        <span className="sr-only">{t('list.actions_column')}</span>
      </th>
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 justify-end px-4 pt-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={(): void => {
              navigate('/templates/new')
            }}
          >
            {t('common.global.add')}
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          {totalItems > 0 ? (
            <TemplateListTable
              headerRow={headerRow}
              colCount={5}
              rows={templateRows}
              listUserId={userId}
              refetchTemplatePage={pageQuery.refetch}
              changeTemplateName={changeTemplateName}
              deleteTemplate={deleteTemplate}
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
