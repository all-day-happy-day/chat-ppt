import { useTranslation } from 'react-i18next'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplates } from '@/api/query/powerpoint.query'
import { useGetProjects } from '@/api/query/project.query'
import { useGetUsers } from '@/api/query/user.query'
import { BaseListLayout } from '@/App/layouts/base-list-layout/BaseListLayout'
import { formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

export function ProjectListPage() {
  const { t } = useTranslation()

  const currentUser = getQueryData(useGetCurrentUser())
  const projects = getQueryData(useGetProjects(currentUser?.id ?? ''))
  const users = getQueryData(useGetUsers())
  const templates = getQueryData(useListTemplates(currentUser?.id ?? ''))

  if (!currentUser) return null
  if (!projects) return null
  if (!users) return null
  if (!templates) return null

  const contents: Record<string, unknown>[] = projects.map((project) => {
    const user = users.find((user) => user.id === project.userId)
    const template = templates.find((template) => template.templateId === project.templateId)
    if (!user) throw new Error('User not found')
    if (!template) throw new Error('Template not found')

    return {
      [t('list.name')]: project.name,
      [t('list.username')]: user.username,
      [t('list.template_name')]: template.name,
      [t('list.created_at')]: formatDate(project.createdAt),
      [t('list.updated_at')]: formatDate(project.updatedAt),
    }
  })
  return (
    <BaseListLayout
      title={t('home.projects')}
      headers={[
        t('list.name'),
        t('list.username'),
        t('list.template_name'),
        t('list.created_at'),
        t('list.updated_at'),
      ]}
      contents={contents}
    />
  )
}
