import * as React from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'

import type { ListSort, ListSortColumn } from '@/domain/list-query'
import { nextSortAfterHeaderClick } from '@/domain/list-query'
import { cn } from '@/lib/utils'

export interface ListSortThProps {
  readonly label: string
  readonly column: ListSortColumn
  readonly sort: ListSort
  readonly onSortChange: (sort: ListSort) => void
  readonly className?: string
}

export function ListSortTh({ label, column, sort, onSortChange, className }: ListSortThProps): React.ReactElement {
  const isNameColumn: boolean = column === 'name'
  const nameUpActive: boolean = isNameColumn && sort === 'name_asc'
  const nameDownActive: boolean = isNameColumn && sort === 'name_desc'
  const dateUpActive: boolean = !isNameColumn && sort === 'date_asc'
  const dateDownActive: boolean = !isNameColumn && sort === 'date_desc'

  return (
    <th className={cn('bg-secondary text-md h-fit min-w-[50px] py-4 pl-4 text-left', className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-left font-medium outline-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2"
        onClick={(): void => {
          onSortChange(nextSortAfterHeaderClick(column, sort))
        }}
      >
        <span>{label}</span>
        <span className="text-muted-foreground flex flex-col leading-none" aria-hidden>
          <ArrowUp
            className={cn('size-3.5', nameUpActive || dateUpActive ? 'text-foreground' : 'opacity-40')}
            strokeWidth={2}
          />
          <ArrowDown
            className={cn('-mt-1 size-3.5', nameDownActive || dateDownActive ? 'text-foreground' : 'opacity-40')}
            strokeWidth={2}
          />
        </span>
      </button>
    </th>
  )
}
