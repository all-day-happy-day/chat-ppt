import * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplates } from '@/api/query/powerpoint.query'
import { useGetProjects, usePatchProject } from '@/api/query/project.query'
import { useGetUsers } from '@/api/query/user.query'
import {
  BASE_LIST_PAGE_SIZE,
  BaseListFooter,
  BaseListHeader,
} from '@/App/layouts/base-list-layout/BaseListLayout'
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
  readonly onCommit: (args: {
    projectId: string
    userId: string
    name: string
    templateId: string
  }) => void
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
  readonly headers: readonly string[]
  readonly rows: readonly ProjectRow[]
  readonly patchProject: ReturnType<typeof usePatchProject>
}

const ProjectListTable = ({ headers, rows, patchProject }: ProjectListTableProps): React.ReactElement => {
  const tableRef: React.RefObject<HTMLTableElement | null> = React.useRef<HTMLTableElement | null>(null)
  const theadRef: React.RefObject<HTMLTableSectionElement | null> = React.useRef<HTMLTableSectionElement | null>(
    null
  )
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

  const colCount: number = headers.length

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4">
      <table ref={tableRef} className="h-full min-h-0 w-full table-fixed border-collapse">
        <thead ref={theadRef} className="text-md">
          <tr>
            {headers.map((header: string) => (
              <th className="bg-secondary h-fit min-w-[50px] py-4 pl-4 text-left" key={header}>
                {header}
              </th>
            ))}
          </tr>
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
                          isSaving={
                            patchProject.isPending && patchProject.variables?.projectId === row.project.id
                          }
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
                    <td className="max-w-0 truncate px-4 py-1 align-middle">
                      {formatDate(row.project.createdAt)}
                    </td>
                    <td className="max-w-0 truncate px-4 py-1 align-middle">
                      {formatDate(row.project.updatedAt)}
                    </td>
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
  const patchProject: ReturnType<typeof usePatchProject> = usePatchProject()

  const currentUser: User | undefined = getQueryData(useGetCurrentUser())
  const projects: Project[] | undefined = getQueryData(useGetProjects(currentUser?.id ?? ''))
  const users: User[] | undefined = getQueryData(useGetUsers())
  const templates: TemplateResponse[] | undefined = getQueryData(useListTemplates(currentUser?.id ?? ''))

  const allRows: ProjectRow[] = useMemo((): ProjectRow[] => {
    if (currentUser === undefined || projects === undefined || users === undefined || templates === undefined) {
      return []
    }
    return projects.map((project: Project): ProjectRow => {
      const user: User | undefined = users.find((u: User) => u.id === project.userId)
      const template: TemplateResponse | undefined = templates.find(
        (tpl: TemplateResponse) => tpl.templateId === project.templateId
      )
      if (user === undefined) throw new Error('User not found')
      if (template === undefined) throw new Error('Template not found')
      return { project, user, template }
    })
  }, [currentUser, projects, templates, users])

  const total: number = allRows.length
  const totalPages: number = Math.max(1, Math.ceil(total / BASE_LIST_PAGE_SIZE))
  const safePage: number = Math.min(page, totalPages)

  const pagedRows: ProjectRow[] = useMemo((): ProjectRow[] => {
    const start: number = (safePage - 1) * BASE_LIST_PAGE_SIZE
    return allRows.slice(start, start + BASE_LIST_PAGE_SIZE)
  }, [allRows, safePage])

  const headers: string[] = [
    t('list.name'),
    t('list.username'),
    t('list.template_name'),
    t('list.created_at'),
    t('list.updated_at'),
  ]

  if (currentUser === undefined || projects === undefined || users === undefined || templates === undefined) {
    return null
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-fit flex-col overflow-hidden px-48 pt-8">
      <BaseListHeader title={t('home.projects')} />
      <div className="min-h-0 flex-1">
        {allRows.length > 0 ? (
          <ProjectListTable headers={headers} rows={pagedRows} patchProject={patchProject} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <div className="text-muted-foreground text-center text-sm">{t('common.global.no_content')}</div>
          </div>
        )}
      </div>
      <BaseListFooter
        pagination={{ page, pageSize: BASE_LIST_PAGE_SIZE, total }}
        onPageChange={setPage}
      />
    </div>
  )
}
