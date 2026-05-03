import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplates } from '@/api/query/powerpoint.query'
import { useGetProjectsPage, usePatchProject } from '@/api/query/project.query'
import { useGetUsers } from '@/api/query/user.query'
import {
  BASE_LIST_PAGE_SIZE,
  BaseListFooter,
  BaseListHeader,
} from '@/App/layouts/base-list-layout/BaseListLayout'
import { ListSortTh } from '@/App/layouts/base-list-layout/ListSortTh'
import type { ListSort } from '@/domain/list-query'
import type { Project } from '@/domain/models/project'
import type { User } from '@/domain/models/user'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import { cn, formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

const MIN_BODY_ROW_PX: number = 36

interface ProjectRow {
  readonly project: Project
  readonly user: User
  readonly template: TemplateResponse
}

interface ProjectNameCellProps {
  readonly project: Project
  readonly onCommit: (args: { projectId: string; userId: string; name: string; templateId: string }) => void
  readonly isSaving: boolean
}

const ProjectNameCell = ({ project, onCommit, isSaving }: ProjectNameCellProps): React.ReactElement => {
  const [value, setValue] = React.useState<string>(project.name)

  const commitIfChanged = (): void => {
    const trimmed: string = value.trim()
    if (trimmed === '' || trimmed === project.name) {
      setValue(project.name)
      return
    }
    onCommit({
      projectId: project.id,
      userId: project.userId,
      name: trimmed,
      templateId: project.templateId,
    })
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

interface ProjectListTableProps {
  readonly headerRow: React.ReactNode
  readonly colCount: number
  readonly rows: readonly ProjectRow[]
  readonly patchProject: ReturnType<typeof usePatchProject>
}

const ProjectListTable = ({
  headerRow,
  colCount,
  rows,
  patchProject,
}: ProjectListTableProps): React.ReactElement => {
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
            const row: ProjectRow | undefined = rows[rowIndex]
            const rowKey: string = row !== undefined ? row.project.id : `placeholder-${String(rowIndex)}`
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
                      <ProjectNameCell
                        key={`${row.project.id}\0${row.project.name}`}
                        project={row.project}
                        isSaving={patchProject.isPending && patchProject.variables?.projectId === row.project.id}
                        onCommit={(args): void => {
                          patchProject.mutate({
                            projectId: args.projectId,
                            userId: args.userId,
                            requestBody: {
                              name: args.name,
                              templateId: args.templateId,
                              parts: null,
                            },
                          })
                        }}
                      />
                    </td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">{row.user.username}</td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">{row.template.name}</td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(row.project.createdAt)}</td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">{formatDate(row.project.updatedAt)}</td>
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

export function ProjectListPage(): React.ReactElement | null {
  const { t } = useTranslation()
  const [page, setPage] = useState<number>(1)
  const [sort, setSort] = useState<ListSort>('date_desc')
  const patchProject: ReturnType<typeof usePatchProject> = usePatchProject()

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

  const pageQuery = useGetProjectsPage(userId, paging)
  const pageData = pageQuery.data
  const users: User[] | undefined = getQueryData(useGetUsers())
  const templates: TemplateResponse[] | undefined = getQueryData(useListTemplates(userId))

  const projectRows: ProjectRow[] = useMemo((): ProjectRow[] => {
    if (pageData === undefined || users === undefined || templates === undefined) {
      return []
    }
    return pageData.items.map((project: Project): ProjectRow => {
      const user: User | undefined = users.find((u: User) => u.id === project.userId)
      const template: TemplateResponse | undefined = templates.find(
        (tpl: TemplateResponse) => tpl.templateId === project.templateId
      )
      if (user === undefined) throw new Error('User not found')
      if (template === undefined) throw new Error('Template not found')
      return { project, user, template }
    })
  }, [pageData, templates, users])

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
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.template_name')}</th>
      <ListSortTh
        label={t('list.created_at')}
        column="created_at"
        sort={sort}
        onSortChange={handleSortChange}
      />
      <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left">{t('list.updated_at')}</th>
    </>
  )

  if (currentUser === undefined || pageQuery.isLoading || users === undefined || templates === undefined) {
    return null
  }

  if (pageQuery.isError) {
    return (
      <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
        <BaseListHeader title={t('home.projects')} />
        <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-4 text-sm">
          {pageQuery.error instanceof Error ? pageQuery.error.message : 'Failed to load projects.'}
        </div>
      </div>
    )
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
      <BaseListHeader title={t('home.projects')} />
      <div className="min-h-0 flex-1">
        {totalItems > 0 ? (
          <ProjectListTable
            headerRow={headerRow}
            colCount={5}
            rows={projectRows}
            patchProject={patchProject}
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
