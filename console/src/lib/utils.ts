import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function getUserInitials(username: string): string {
  const initial: string = username
    .split(' ')
    .map((name: string) => name[0])
    .join('')

  if (initial.length > 2) {
    return initial.slice(0)
  } else {
    return initial
  }
}
