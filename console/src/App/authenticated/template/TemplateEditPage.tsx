import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from 'lucide-react'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useChangeTemplateName, useListLayouts, useListTemplates } from '@/api/query/powerpoint.query'
import { Button } from '@/components/ui/button/Button'
import { Spinner } from '@/components/ui/spinner/Spinner'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import { TemplateLayoutSlide } from './components/TemplateLayoutSlide'

interface TemplateNameFieldProps {
  readonly inputId: string
  readonly initialName: string
  readonly isSaving: boolean
  readonly saveLabel: string
  readonly onSave: (trimmed: string) => void
}

function TemplateNameField({
  inputId,
  initialName,
  isSaving,
  saveLabel,
  onSave,
}: TemplateNameFieldProps): React.ReactElement {
  const [value, setValue] = React.useState<string>(initialName)

  const commitIfChanged = (): void => {
    const trimmed: string = value.trim()
    if (trimmed === '' || trimmed === initialName) {
      setValue(initialName)
      return
    }
    onSave(trimmed)
  }

  return (
    <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center">
      <input
        id={inputId}
        type="text"
        value={value}
        disabled={isSaving}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
          setValue(e.target.value)
        }}
        onBlur={(): void => {
          commitIfChanged()
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitIfChanged()
            e.currentTarget.blur()
          }
        }}
        className="border-input bg-background focus:border-ring h-10 w-full max-w-md rounded-lg border px-3 py-2 text-sm outline-none"
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={isSaving}
        loadingLabel={saveLabel}
        disabled={isSaving || value.trim() === initialName}
        onClick={(): void => {
          commitIfChanged()
        }}
      >
        {saveLabel}
      </Button>
    </div>
  )
}

export function TemplateEditPage(): React.ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { templateId = '' } = useParams<{ templateId: string }>()

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''

  const templatesQuery = useListTemplates(userId)

  const template: TemplateResponse | undefined = templatesQuery.data?.find(
    (row: TemplateResponse): boolean => row.templateId === templateId
  )

  const layoutsQuery = useListLayouts(templateId, { enabled: template !== undefined })
  const changeName = useChangeTemplateName()

  if (templateId.length === 0) {
    return <div className="text-muted-foreground text-center text-sm">{t('page.template_edit.missing_id')}</div>
  }

  if (currentUser === undefined || templatesQuery.isLoading) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (templatesQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {templatesQuery.error instanceof Error ? templatesQuery.error.message : t('page.template_edit.load_error')}
      </div>
    )
  }

  if (template === undefined) {
    return <div className="text-muted-foreground text-center text-sm">{t('page.template_edit.not_found')}</div>
  }

  if (layoutsQuery.isLoading) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (layoutsQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">
        {layoutsQuery.error instanceof Error ? layoutsQuery.error.message : t('page.template_edit.layouts_error')}
      </div>
    )
  }

  const layouts = layoutsQuery.data?.layouts ?? []
  const nameFieldKey: string = `${template.templateId}-${template.name}-${String(template.updatedAt.getTime())}`
  const nameInputId: string = `template-name-${template.templateId}`

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full flex-col items-center overflow-y-auto px-8 pb-16 pt-8 md:px-16">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="flex w-full justify-start">
          <button
            type="button"
            onClick={(): void => {
              navigate('/templates')
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
            {t('page.template_edit.back')}
          </button>
        </div>

        <div className="flex w-full flex-col gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{t('page.template_edit.title')}</h1>
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">{t('page.template_edit.source_file_label')}</span>{' '}
            <span className="wrap-break-word">{template.filename}</span>
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] sm:items-center sm:gap-x-4 sm:gap-y-0">
            <label
              htmlFor={nameInputId}
              className="text-muted-foreground text-sm font-medium sm:text-right sm:leading-none"
            >
              {t('page.template_edit.name_label')}
            </label>
            <TemplateNameField
              key={nameFieldKey}
              inputId={nameInputId}
              initialName={template.name}
              isSaving={changeName.isPending}
              saveLabel={t('common.global.save')}
              onSave={(trimmed: string): void => {
                changeName.mutate({ templateId, requestBody: { newName: trimmed } })
              }}
            />
          </div>
        </div>

        <section className="flex w-full flex-col items-center gap-6">
          <h2 className="w-full text-lg font-semibold">{t('page.template_edit.layouts_heading')}</h2>
          {layouts.length === 0 ? (
            <p className="text-muted-foreground w-full text-center text-sm">{t('page.template_edit.no_layouts')}</p>
          ) : (
            <div className="flex w-full flex-col items-center gap-10">
              {layouts.map((layout) => (
                <TemplateLayoutSlide
                  key={layout.id}
                  layout={layout}
                  fallbackSlideSize={template.layoutSize}
                  maxContentWidthPx={640}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
