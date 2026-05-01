import { useTranslation } from 'react-i18next'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplates } from '@/api/query/powerpoint.query'
import { useGetUsers } from '@/api/query/user.query'
import { BaseListLayout } from '@/App/layouts/base-list-layout/BaseListLayout'
import { formatDate, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

export function TemplateListPage() {
  const { t } = useTranslation()

  const currentUser = getQueryData(useGetCurrentUser())
  const users = getQueryData(useGetUsers())
  const templates = getQueryData(useListTemplates(currentUser?.id ?? ''))

  if (!currentUser) return null
  if (!users) return null
  if (!templates) return null

  const contents: Record<string, unknown>[] = templates.map((template) => {
    const user = users.find((user) => user.id === template.userId)
    if (!user) throw new Error('User not found')

    return {
      [t('list.name')]: template.name,
      [t('list.username')]: user.username,
      [t('list.created_at')]: formatDate(template.createdAt),
      [t('list.updated_at')]: formatDate(template.updatedAt),
    }
  })
  return (
    <BaseListLayout
      title={t('home.templates')}
      headers={[t('list.name'), t('list.username'), t('list.created_at'), t('list.updated_at')]}
      contents={contents}
    />
  )
}
