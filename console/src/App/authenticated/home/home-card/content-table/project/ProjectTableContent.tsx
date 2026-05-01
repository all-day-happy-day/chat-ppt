import { useGetCurrentUser } from '@/api/query/auth.query'
import { useGetProjects } from '@/api/query/project.query'
import { useGetUser } from '@/api/query/user.query'
import type { Project } from '@/domain/models/project'
import { getQueryData } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

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

export function ProjectContentTableProps(): ContentTableProps {
  const currentUser = getQueryData(useGetCurrentUser())
  const listProjects = useGetProjects(currentUser?.id ?? '')
  let projects = getQueryData(listProjects)

  if (!currentUser) return { contents: [null, null, null] }
  if (!projects) return { contents: [null, null, null] }

  if (projects.length >= 3) {
    projects = projects.slice(0, 3)
  } else {
    const emptyProjects = Array(3 - projects.length).fill(null)
    projects = projects.concat(emptyProjects)
  }

  return {
    contents: [
      <ProjectItem project={projects[0]} />,
      <ProjectItem project={projects[1]} />,
      <ProjectItem project={projects[2]} />,
    ],
    // icons: [<div>Icon1</div>, <div>Icon2</div>, <div>Icon3</div>],
  }
}
