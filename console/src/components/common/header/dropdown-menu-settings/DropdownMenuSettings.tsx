import { Button } from '@/components/ui/button/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'

import '@/i18n/i18n'

export function DropdownMenuSettings({
  triggerIcon,
  children,
}: {
  triggerIcon: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="data-[state=open]:bg-accent/60 hover:bg-accent/60 cursor-pointer rounded-md border-none p-1.5"
        >
          {triggerIcon}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[200px] rounded-xl px-1 py-1">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
