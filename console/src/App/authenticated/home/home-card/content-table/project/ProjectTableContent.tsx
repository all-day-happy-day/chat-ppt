import { useGetCurrentUser } from '@/api/query/auth.query'
import { useGetProjectsPartial } from '@/api/query/project.query'
import { useGetUser } from '@/api/query/user.query'
import { HOME_CARD_PREVIEW_LIMIT } from '@/domain/list-query'
import type { Project } from '@/domain/models/project'
import { formatDate, getQueryData } from '@/lib/utils'

import type { ContentTableProps } from '../content-table-types'

export function ProjectItem({ project }: { project: Project | null }) {
  const user = getQueryData(useGetUser(project?.userId ?? ''))
  if (!user) return null

  return (
    <div className="flex h-full w-full flex-row items-center justify-between">
      <div className="flex flex-col items-start justify-center gap-1">
        {project && (
          <>
            <div className="text-semibold text-md">{project.name}</div>
            <div className="text-muted-foreground text-sm">{user.username}</div>
          </>
        )}
      </div>
      <div className="flex h-full flex-col items-end justify-start pt-4">
        {project && <div className="text-muted-foreground text-sm">{formatDate(new Date(project.createdAt))}</div>}
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

export function ProjectContentTableProps(): ContentTableProps {
  const currentUser = getQueryData(useGetCurrentUser())
  const partial = useGetProjectsPartial(currentUser?.id ?? '', HOME_CARD_PREVIEW_LIMIT)

  if (!currentUser) return { contents: [null, null, null] }
  if (partial.isLoading || partial.data === undefined) return { contents: [null, null, null] }

  const projects: (Project | null)[] = padPreviewSlots(partial.data, HOME_CARD_PREVIEW_LIMIT)

  return {
    contents: [
      <ProjectItem key="p0" project={projects[0]} />,
      <ProjectItem key="p1" project={projects[1]} />,
      <ProjectItem key="p2" project={projects[2]} />,
    ],
  }
}
