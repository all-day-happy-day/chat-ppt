import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplates } from '@/api/query/powerpoint.query'
import { useGetUser } from '@/api/query/user.query'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import { getQueryData } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

import type { ContentTableProps } from '../content-table-types'

export function TemplateItem({ template }: { template: TemplateResponse | null }) {
  const user = getQueryData(useGetUser(template?.userId ?? ''))
  if (!user) return null

  return (
    <div className="flex h-full w-full flex-row items-center justify-between">
      <div className="flex flex-col items-start justify-center gap-1">
        {template && (
          <>
            <div className="text-semibold text-md">{template.name}</div>
            <div className="text-muted-foreground text-sm">{user.username}</div>
          </>
        )}
      </div>
      <div className="flex h-full flex-col items-end justify-start pt-4">
        {template && <div className="text-muted-foreground text-sm">{formatDate(new Date(template.createdAt))}</div>}
      </div>
    </div>
  )
}

export function TemplateContentTableProps(): ContentTableProps {
  const currentUser = getQueryData(useGetCurrentUser())
  const listTemplates = useListTemplates(currentUser?.id ?? '')
  let templates = getQueryData(listTemplates)

  if (!currentUser) return { contents: [null, null, null] }
  if (!templates) return { contents: [null, null, null] }

  if (templates.length >= 3) {
    templates = templates.slice(0, 3)
  } else {
    const emptyTemplates = Array(3 - templates.length).fill(null)
    templates = templates.concat(emptyTemplates)
  }

  return {
    contents: [
      <TemplateItem template={templates[0]} />,
      <TemplateItem template={templates[1]} />,
      <TemplateItem template={templates[2]} />,
    ],
    // icons: [<div>Icon1</div>, <div>Icon2</div>, <div>Icon3</div>],
  }
}
