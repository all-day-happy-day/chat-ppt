import camelcaseKeys from 'camelcase-keys'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { DefaultError, UseMutationResult, UseQueryResult } from '@tanstack/react-query'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function getUserInitials(username: string): string {
  const initial: string = username
    .split(' ')
    .map((name: string) => name[0])
    .join('')

  if (initial.length > 2) {
    return initial.slice(0, 2)
  } else {
    return initial
  }
}

// Query & Mutation
export type QueryDataState<TData, TError = DefaultError> =
  | { kind: 'pending' }
  | { kind: 'error'; error: TError }
  | { kind: 'success'; data: TData }
export type MutationDataState<TData, TError = DefaultError> =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; error: TError }
  | { kind: 'success'; data: TData }
export function getQueryDataState<TData, TError = DefaultError>(
  query: UseQueryResult<TData, TError>
): QueryDataState<TData, TError> {
  switch (query.status) {
    case 'error':
      return { kind: 'error', error: query.error }
    case 'success':
      return { kind: 'success', data: query.data }
    case 'pending':
      return { kind: 'pending' }
  }
}
export function getMutationDataState<TData, TError = DefaultError>(
  mutation: UseMutationResult<TData, TError>
): MutationDataState<TData, TError> {
  switch (mutation.status) {
    case 'error':
      return { kind: 'error', error: mutation.error }
    case 'success':
      return { kind: 'success', data: mutation.data }
    case 'pending':
      return { kind: 'pending' }
    case 'idle':
      return { kind: 'idle' }
  }
}

export function getQueryData<TData, TError = DefaultError>(query: UseQueryResult<TData, TError>): TData | undefined {
  const state: QueryDataState<TData, TError> = getQueryDataState(query)
  return state.kind === 'success' ? state.data : undefined
}
export function getMutationData<TData, TError = DefaultError>(
  mutation: UseMutationResult<TData, TError>
): TData | undefined {
  const state: MutationDataState<TData, TError> = getMutationDataState(mutation)
  return state.kind === 'success' ? state.data : undefined
}

// Date Formatting
export function formatDate(date: Date): string {
  const month: string = String(date.getMonth() + 1).padStart(2, '0')
  const day: string = String(date.getDate()).padStart(2, '0')
  const year: number = date.getFullYear()
  const hours: string = String(date.getHours()).padStart(2, '0')
  const minutes: string = String(date.getMinutes()).padStart(2, '0')
  const seconds: string = String(date.getSeconds()).padStart(2, '0')
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
}

// Map snake_case to camelCase
export type Input = Record<string, unknown> | readonly Record<string, unknown>[]
export function snakeToCamel<TCamel>(data: Input): TCamel {
  return camelcaseKeys(data, { deep: true }) as TCamel
}
