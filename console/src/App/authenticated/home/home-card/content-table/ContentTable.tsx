import { cn } from '@/lib/utils'

import type { ContentTableProps, TableRowProps } from './content-table-types'

const TableRow = ({ content, icon, borderTop = true }: TableRowProps) => {
  return (
    <tr className="group">
      <td
        data-slot="table-row"
        className="hover:bg-accent/30 active:bg-accent/20 active:**:text-muted-foreground/70 rounded-xl px-4 transition-colors"
      >
        <TableRowContainer content={content} icon={icon} borderTop={borderTop} />
      </td>
    </tr>
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
    <table className="h-full w-full">
      <tbody>
        <TableRow content={contents[0]} icon={icons ? icons[0] : null} borderTop={false} />
        <TableRow content={contents[1]} icon={icons ? icons[1] : null} borderTop={true} />
        <TableRow content={contents[2]} icon={icons ? icons[2] : null} borderTop={true} />
      </tbody>
    </table>
  )
}
