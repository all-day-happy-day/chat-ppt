import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from 'lucide-react'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useReadTemplate } from '@/api/query/powerpoint.query'
import { Button } from '@/components/ui/button/Button'
import { Spinner } from '@/components/ui/spinner/Spinner'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

export function TemplateNewPage(): React.ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const readTemplate = useReadTemplate()

  const currentUser = getQueryData(useGetCurrentUser())
  const userId: string = currentUser?.id ?? ''

  const [name, setName] = React.useState<string>('')
  const [file, setFile] = React.useState<File | null>(null)

  const nameInputId: string = 'template-new-name'
  const fileInputId: string = 'template-new-file'

  const canSubmit: boolean =
    name.trim().length > 0 && file !== null && !readTemplate.isPending && userId.length > 0

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!canSubmit || file === null) {
      return
    }
    readTemplate.mutate(
      { file, userId, templateName: name.trim() },
      {
        onSuccess: (res): void => {
          navigate(`/templates/${res.templateId}/edit`)
        },
      }
    )
  }

  if (currentUser === undefined) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
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
              navigate('/templates')
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
            {t('page.template_edit.back')}
          </button>
        </div>

        <div className="flex w-full flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('page.template_new.title')}</h1>
        </div>

        <form
          className="flex w-full flex-col gap-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex w-full flex-col gap-2">
            <label htmlFor={nameInputId} className="text-muted-foreground text-sm font-medium">
              {t('page.template_new.name_label')}
            </label>
            <input
              id={nameInputId}
              type="text"
              name="templateName"
              autoComplete="off"
              value={name}
              disabled={readTemplate.isPending}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                setName(ev.target.value)
              }}
              className="border-input bg-background focus:border-ring h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="flex w-full flex-col gap-2">
            <label htmlFor={fileInputId} className="text-muted-foreground text-sm font-medium">
              {t('page.template_new.file_label')}
            </label>
            <input
              id={fileInputId}
              type="file"
              name="templateFile"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              disabled={readTemplate.isPending}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                const next: File | undefined = ev.target.files?.[0]
                setFile(next ?? null)
              }}
              className="border-input bg-background focus:border-ring text-foreground w-full cursor-pointer rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
            />
            {file !== null ? (
              <p className="text-muted-foreground wrap-break-word text-xs">{file.name}</p>
            ) : null}
          </div>

          {readTemplate.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {readTemplate.error instanceof Error ? readTemplate.error.message : t('page.template_new.error_generic')}
            </p>
          ) : null}

          <div className="flex w-full flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="default"
              disabled={!canSubmit}
              loading={readTemplate.isPending}
              loadingLabel={t('common.global.add')}
            >
              {t('common.global.add')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={readTemplate.isPending}
              onClick={(): void => {
                navigate('/templates')
              }}
            >
              {t('common.global.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
