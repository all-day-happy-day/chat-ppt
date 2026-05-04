import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { cn } from '@/lib/utils'

import type { ReactElement } from 'react'

export interface SelectMenuOption {
  readonly value: string
  readonly label: string
}

export interface SelectMenuProps {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly options: readonly SelectMenuOption[]
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly 'aria-label'?: string
  readonly className?: string
  readonly triggerClassName?: string
  readonly contentClassName?: string
  /** Narrow rail (e.g. project slide type). */
  readonly size?: 'default' | 'sm'
  /** Use when the trigger sits inside a draggable ancestor (stops pointerdown from bubbling). */
  readonly stopTriggerPointerPropagation?: boolean
}

export function SelectMenu({
  value,
  onValueChange,
  options,
  placeholder = '',
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
  triggerClassName,
  contentClassName,
  size = 'default',
  stopTriggerPointerPropagation = false,
}: SelectMenuProps): ReactElement {
  const selectedLabel: string | undefined = React.useMemo((): string | undefined => {
    return options.find((o: SelectMenuOption): boolean => o.value === value)?.label
  }, [options, value])

  const displayText: string = selectedLabel ?? placeholder
  const isPlaceholder: boolean = selectedLabel === undefined

  return (
    <div className={cn('w-full', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          onPointerDown={(event: React.PointerEvent<HTMLButtonElement>): void => {
            if (stopTriggerPointerPropagation) {
              event.stopPropagation()
            }
          }}
          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
            if (stopTriggerPointerPropagation) {
              event.stopPropagation()
            }
          }}
          className={cn(
            'border-input bg-background text-foreground inline-flex w-full items-center justify-between rounded-lg border text-left outline-none transition-[color,box-shadow]',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2',
            'disabled:pointer-events-none disabled:opacity-40',
            'data-[state=open]:border-ring data-[state=open]:ring-ring/40 data-[state=open]:ring-[1px]',
            size === 'default' && 'h-10 gap-3 px-3 py-2 text-sm',
            size === 'sm' && 'h-7 gap-2 rounded border px-2 py-0.5 text-[10px] leading-tight',
            triggerClassName,
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', isPlaceholder && 'text-muted-foreground')}>{displayText}</span>
          <ChevronDownIcon
            aria-hidden
            className={cn(
              'text-muted-foreground pointer-events-none shrink-0',
              size === 'default' ? 'size-4' : 'size-3.5',
            )}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className={cn(
            'max-h-60 min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto p-1',
            contentClassName,
          )}
        >
          {options.map((opt: SelectMenuOption): ReactElement => {
            return (
              <DropdownMenuItem
                key={opt.value}
                className={cn(
                  'cursor-pointer rounded-md px-2 py-1.5',
                  size === 'default' && 'text-sm',
                  size === 'sm' && 'text-[10px] leading-tight',
                )}
                onSelect={(): void => {
                  onValueChange(opt.value)
                }}
              >
                {opt.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
