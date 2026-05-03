import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplatesPartial } from '@/api/query/powerpoint.query'
import { useGetUser } from '@/api/query/user.query'
import { HOME_CARD_PREVIEW_LIMIT } from '@/domain/list-query'
import type { TemplateResponse } from '@/domain/repositories/powerpoint-repository'
import { formatDate, getQueryData } from '@/lib/utils'

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
        {template && (
          <div className="text-muted-foreground text-sm">{formatDate(new Date(template.createdAt))}</div>
        )}
      </div>
    </div>
  )
}

function padPreviewSlots<T>(items: readonly T[], slotCount: number): (T | null)[] {
  const padded: (T | null)[] = [...items]
  while (padded.length < slotCount) {
    padded.push(null)
  }
  return padded.slice(0, slotCount)
}

export function TemplateContentTableProps(): ContentTableProps {
  const currentUser = getQueryData(useGetCurrentUser())
  const partial = useListTemplatesPartial(currentUser?.id ?? '', HOME_CARD_PREVIEW_LIMIT)

  if (!currentUser) return { contents: [null, null, null] }
  if (partial.isLoading || partial.data === undefined) return { contents: [null, null, null] }

  const templates: (TemplateResponse | null)[] = padPreviewSlots(partial.data, HOME_CARD_PREVIEW_LIMIT)

  return {
    contents: [
      <TemplateItem key="t0" template={templates[0]} />,
      <TemplateItem key="t1" template={templates[1]} />,
      <TemplateItem key="t2" template={templates[2]} />,
    ],
  }
}
