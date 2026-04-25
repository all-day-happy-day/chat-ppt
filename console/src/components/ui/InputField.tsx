import { cn } from '@/lib/utils'

export function InputField({
  id,
  name,
  label,
  type,
  defaultValue,
  className,
}: {
  id: string
  name: string
  label: string
  type: string
  defaultValue: string
  className?: string
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <label htmlFor="username" className="text-muted-foreground pl-0.5 text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className={cn(
          'border-input bg-background focus:ring-ring w-fit rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none',
          className
        )}
      />
    </div>
  )
}
