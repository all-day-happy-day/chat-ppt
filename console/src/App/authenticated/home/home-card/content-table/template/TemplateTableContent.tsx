import { useGetCurrentUser } from '@/api/query/auth.query'
import { useListTemplates } from '@/api/query/powerpoint.query'
import type { Template, TemplateFile } from '@/domain/models/powerpoint'
import { getQueryData } from '@/lib/utils'

import type { ContentTableProps } from '../content-table-types'

export function TemplateItem({ template, templateFile }: { template: Template; templateFile: TemplateFile }) {
  return (
    <div className="flex h-full w-full flex-row items-center justify-between">
      <div className="flex flex-col items-start justify-center gap-1">
        <div className="text-semibold text-md">{template.name}</div>
        <div className="text-muted-foreground text-sm">{template.createdAt.toLocaleDateString()}</div>
      </div>
      <div className="flex flex-col items-end justify-center">
        <div className="text-md">{templateFile.userId}</div>
      </div>
    </div>
  )
}

export function TemplateContentTableProps(): ContentTableProps {
  const currentUser = getQueryData(useGetCurrentUser())
  const listTemplates = useListTemplates(currentUser?.id ?? '')
  if (!currentUser) return { contents: [null, null, null] }

  const data = getQueryData(listTemplates)
  if (!data || !data.templateFiles || !data.templates) return { contents: [null, null, null] }
  let { templateFiles, templates } = data
  console.log('template-check', templateFiles, templates)

  if (templateFiles.length >= 3) {
    templateFiles = templateFiles.slice(0, 3)
    templates = templates.slice(0, 3)
  } else {
    const emptyTemplateFiles: TemplateFile[] = Array(3 - templateFiles.length).fill(null)
    const emptyTemplates: Template[] = Array(3 - templates.length).fill(null)
    templateFiles = templateFiles.concat(emptyTemplateFiles)
    templates = templates.concat(emptyTemplates)
  }

  return {
    contents: [
      <TemplateItem template={templates[0]} templateFile={templateFiles[0]} />,
      <TemplateItem template={templates[1]} templateFile={templateFiles[1]} />,
      <TemplateItem template={templates[2]} templateFile={templateFiles[2]} />,
    ],
    // icons: [<div>Icon1</div>, <div>Icon2</div>, <div>Icon3</div>],
  }
}
