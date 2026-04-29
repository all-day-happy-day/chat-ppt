import * as React from 'react'

import { cn } from '@/lib/utils'

import type { FieldValues, Path, RegisterOptions, UseFormRegister } from 'react-hook-form'

export function InputField<T extends FieldValues>({
  register,
  name,
  label,
  className,
  placeholder,
  required = true,
  type,
  registerOptions,
}: {
  register: UseFormRegister<T>
  name: Path<T>
  label?: string
  className?: string
  placeholder?: string
  required?: boolean
  type?: React.HTMLInputTypeAttribute
  registerOptions?: RegisterOptions<T, Path<T>>
}) {
  return (
    <div className={cn('flex w-full flex-col items-start gap-2', className)}>
      {label && <label className="text-muted-foreground pl-0.5 text-sm font-medium">{label}</label>}
      <input
        placeholder={placeholder}
        {...register(name, { required: required, ...registerOptions })}
        type={type ?? 'text'}
        className="border-input bg-background focus:border-ring focus:placeholder:text-secondary-foreground/20 h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
      />
    </div>
  )
}
