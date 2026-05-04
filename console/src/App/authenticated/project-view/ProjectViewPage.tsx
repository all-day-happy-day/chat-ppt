import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from 'lucide-react'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useGetProjects } from '@/api/query/project.query'
import { Spinner } from '@/components/ui/spinner/Spinner'
import type { Project } from '@/domain/models/project'
import { formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import type { ReactElement } from 'react'

export function ProjectViewPage(): ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId = '' } = useParams<{ projectId: string }>()

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''
  const projectsQuery = useGetProjects(userId)

  const project: Project | undefined = projectsQuery.data?.find((p: Project): boolean => p.id === projectId)

  if (projectId.length === 0) {
    return <div className="text-muted-foreground text-center text-sm">{t('page.project_view.missing_id')}</div>
  }

  if (currentUser === undefined || projectsQuery.isLoading) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (projectsQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {projectsQuery.error instanceof Error ? projectsQuery.error.message : t('page.project_view.load_error')}
      </div>
    )
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col overflow-y-auto px-8 pb-16 pt-8 md:px-16 lg:px-24">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <button
          type="button"
          onClick={(): void => {
            navigate('/projects')
          }}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
          {t('page.project_view.back')}
        </button>

        {project === undefined ? (
          <p className="text-muted-foreground text-sm">{t('page.project_view.not_found')}</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <dl className="text-muted-foreground grid gap-2 text-sm">
              <div>
                <dt className="inline font-medium text-foreground">{t('page.project_view.created')}</dt>{' '}
                <dd className="inline">{formatDate(project.createdAt)}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">{t('page.project_view.updated')}</dt>{' '}
                <dd className="inline">{formatDate(project.updatedAt)}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-sm">{t('page.project_view.placeholder')}</p>
          </>
        )}
      </div>
    </div>
  )
}
