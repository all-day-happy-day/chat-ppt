import { getApiBaseUrl } from '../lib/api-base'
import { SIGN_IN_REQUIRED_MESSAGE } from '../lib/auth-errors'
import { readFetchErrorMessage } from '../lib/read-fetch-error'
import type { GetUserResponse, PatchUserRequest, UserRole } from '../types/user'
import { USER_ROLES } from '../types/user'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isUserRole = (value: unknown): value is UserRole => {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

const isGetUserResponse = (value: unknown): value is GetUserResponse => {
  if (!isRecord(value)) {
    return false
  }
  const id: unknown = value.id
  const username: unknown = value.username
  const email: unknown = value.email
  const role: unknown = value.role
  const createdAt: unknown = value.created_at
  const lastSignIn: unknown = value.last_sign_in
  const lastSignInOk: boolean = lastSignIn === null || typeof lastSignIn === 'string'
  return (
    typeof id === 'string' &&
    typeof username === 'string' &&
    typeof email === 'string' &&
    isUserRole(role) &&
    typeof createdAt === 'string' &&
    lastSignInOk
  )
}

const isGetUserResponseList = (value: unknown): value is GetUserResponse[] => {
  if (!Array.isArray(value)) {
    return false
  }
  return value.every((item: unknown) => isGetUserResponse(item))
}

export const listUsers = async (): Promise<GetUserResponse[]> => {
  const baseUrl: string = getApiBaseUrl()
  const url: string = `${baseUrl}/user/`
  const response: Response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, 'Could not load users.')
    throw new Error(message)
  }
  const text: string = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isGetUserResponseList(parsed)) {
    throw new Error('Invalid response from server.')
  }
  return parsed
}

export const getUserById = async (userId: string): Promise<GetUserResponse> => {
  const baseUrl: string = getApiBaseUrl()
  const encodedId: string = encodeURIComponent(userId)
  const url: string = `${baseUrl}/user/${encodedId}`
  const response: Response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, 'Could not load your profile.')
    throw new Error(message)
  }
  const text: string = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isGetUserResponse(parsed)) {
    throw new Error('Invalid response from server.')
  }
  return parsed
}

export const patchUserById = async (userId: string, body: PatchUserRequest): Promise<GetUserResponse> => {
  const baseUrl: string = getApiBaseUrl()
  const encodedId: string = encodeURIComponent(userId)
  const url: string = `${baseUrl}/user/${encodedId}`
  const response: Response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, 'Could not save your settings.')
    throw new Error(message)
  }
  const text: string = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isGetUserResponse(parsed)) {
    throw new Error('Invalid response from server.')
  }
  return parsed
}

export const patchUserRoleById = async (userId: string, role: UserRole): Promise<GetUserResponse> => {
  const baseUrl: string = getApiBaseUrl()
  const encodedId: string = encodeURIComponent(userId)
  const url: string = `${baseUrl}/user/role/${encodedId}`
  const response: Response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ role }),
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, "Could not update the user's role.")
    throw new Error(message)
  }
  const text: string = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isGetUserResponse(parsed)) {
    throw new Error('Invalid response from server.')
  }
  return parsed
}
