import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from 'lucide-react'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplates } from '@/api/query/powerpoint.query'
import { useCreateProject } from '@/api/query/project.query'
import { Button } from '@/components/ui/button/Button'
import { SelectMenu, type SelectMenuOption } from '@/components/ui/SelectMenu'
import { Spinner } from '@/components/ui/spinner/Spinner'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import type { ReactElement } from 'react'

function sortTemplatesByName(templates: readonly TemplateResponse[]): TemplateResponse[] {
  return [...templates].sort((a: TemplateResponse, b: TemplateResponse): number =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
}

export function ProjectNewPage(): ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createProject = useCreateProject()

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''

  const templatesQuery = useListTemplates(userId)
  const templatesData: TemplateResponse[] | undefined = getQueryData(templatesQuery)
  const sortedTemplates: TemplateResponse[] = React.useMemo((): TemplateResponse[] => {
    if (templatesData === undefined) {
      return []
    }
    return sortTemplatesByName(templatesData)
  }, [templatesData])

  const [name, setName] = React.useState<string>('')
  const [templateId, setTemplateId] = React.useState<string>('')

  const nameInputId: string = 'project-new-name'
  const templateSelectId: string = 'project-new-template'

  const templateOptions: SelectMenuOption[] = React.useMemo((): SelectMenuOption[] => {
    return sortedTemplates.map(
      (tpl: TemplateResponse): SelectMenuOption => ({
        value: tpl.templateId,
        label: tpl.name,
      }),
    )
  }, [sortedTemplates])

  const canSubmit: boolean =
    name.trim().length > 0 &&
    templateId.length > 0 &&
    !createProject.isPending &&
    userId.length > 0 &&
    sortedTemplates.length > 0

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!canSubmit) {
      return
    }
    createProject.mutate(
      { userId, name: name.trim(), templateId },
      {
        onSuccess: (project): void => {
          navigate(`/projects/${project.id}`)
        },
      }
    )
  }

  if (currentUser === undefined || (userId.length > 0 && templatesQuery.isLoading)) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (userId.length > 0 && templatesQuery.isError) {
    return (
      <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col items-center overflow-y-auto px-8 pb-16 pt-8 md:px-16">
        <div className="flex w-full max-w-4xl flex-col gap-6">
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
          <p className="text-destructive text-sm" role="alert">
            {templatesQuery.error instanceof Error
              ? templatesQuery.error.message
              : t('page.project_new.templates_load_error')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col items-center overflow-y-auto px-8 pb-16 pt-8 md:px-16">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="flex w-full justify-start">
          <button
            type="button"
            onClick={(): void => {
              navigate('/projects')
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
            {t('page.project_view.back')}
          </button>
        </div>

        <div className="flex w-full flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('page.project_new.title')}</h1>
        </div>

        {sortedTemplates.length === 0 ? (
          <div className="flex w-full flex-col gap-4">
            <p className="text-muted-foreground text-sm">{t('page.project_new.no_templates')}</p>
            <Button
              type="button"
              variant="outline"
              onClick={(): void => {
                navigate('/templates')
              }}
            >
              {t('page.project_new.go_templates')}
            </Button>
          </div>
        ) : (
          <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit} noValidate>
            <div className="flex w-full flex-col gap-2">
              <label htmlFor={nameInputId} className="text-muted-foreground text-sm font-medium">
                {t('page.project_new.name_label')}
              </label>
              <input
                id={nameInputId}
                type="text"
                name="projectName"
                autoComplete="off"
                value={name}
                disabled={createProject.isPending}
                onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                  setName(ev.target.value)
                }}
                className="border-input bg-background focus:border-ring h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <label htmlFor={templateSelectId} className="text-muted-foreground text-sm font-medium">
                {t('page.project_new.template_label')}
              </label>
              <SelectMenu
                id={templateSelectId}
                value={templateId}
                onValueChange={setTemplateId}
                options={templateOptions}
                placeholder={t('page.project_new.template_placeholder')}
                disabled={createProject.isPending}
                aria-label={t('page.project_new.template_label')}
              />
            </div>

            {createProject.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {createProject.error instanceof Error
                  ? createProject.error.message
                  : t('page.project_new.error_generic')}
              </p>
            ) : null}

            <div className="flex w-full flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant="default"
                disabled={!canSubmit}
                loading={createProject.isPending}
                loadingLabel={t('common.global.add')}
              >
                {t('common.global.add')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={createProject.isPending}
                onClick={(): void => {
                  navigate('/projects')
                }}
              >
                {t('common.global.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
