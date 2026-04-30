import { cn } from '@/lib/utils'

import type { ContentTableProps, TableRowProps } from './content-table-types'

const TableRow = ({ content, icon, borderTop = true }: TableRowProps) => {
  return (
    <div className="content-table-row group flex min-h-0 min-w-0 flex-1 basis-0 flex-col">
      <div
        data-slot="table-row"
        className="hover:bg-accent/30 active:bg-accent/20 active:**:text-muted-foreground/70 flex min-h-0 flex-1 flex-row rounded-xl px-4 transition-all duration-0"
      >
        <TableRowContainer content={content} icon={icon} borderTop={borderTop} />
      </div>
    </div>
  )
}

const TableRowContainer = ({ content, icon, borderTop = true }: TableRowProps) => {
  return (
    <div className="flex h-full w-full flex-row items-center gap-4">
      <div className="flex">{icon && icon}</div>
      <div
        className={cn(
          'content-table-row-border flex h-full w-full flex-row items-center border-t border-transparent',
          borderTop && 'border-border group-hover:border-t-transparent'
        )}
      >
        {content}
      </div>
    </div>
  )
}

export function TableRowContent() {}

export function ContentTable({ contents, icons }: ContentTableProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <TableRow content={contents[0]} icon={icons ? icons[0] : null} borderTop={false} />
      <TableRow content={contents[1]} icon={icons ? icons[1] : null} borderTop={true} />
      <TableRow content={contents[2]} icon={icons ? icons[2] : null} borderTop={true} />
    </div>
  )
}
