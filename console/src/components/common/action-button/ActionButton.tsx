import { Button } from '@/components/ui/button/Button'
import { cn } from '@/lib/utils'

export function ActionButton({
  className,
  type,
  label,
}: {
  className?: string
  type?: 'button' | 'submit'
  label: string
}) {
  return (
    <Button
      variant="default"
      size="sm"
      type={type ?? 'button'}
      className={cn(
        'bg-foreground text-background hover:bg-foreground/90 h-[30px] w-[50px] text-[13px] font-semibold active:scale-95',
        className
      )}
    >
      {label}
    </Button>
  )
}
