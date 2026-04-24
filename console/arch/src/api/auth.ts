import { getApiBaseUrl } from '../lib/api-base'
import { SIGN_IN_REQUIRED_MESSAGE } from '../lib/auth-errors'
import { readFetchErrorMessage } from '../lib/read-fetch-error'
import { getSignInUserMessage } from '../lib/sign-in-error-message'
import { getSignUpUserMessage } from '../lib/sign-up-error-message'
import type { SignInRequest, SignInResponse, SignUpRequest, SignUpResponse } from '../types/auth'
import type { VerifyTokenResponse } from '../types/session'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isAuthUsernameResponse = (value: unknown): value is SignInResponse | SignUpResponse => {
  if (!isRecord(value)) {
    return false
  }
  const username: unknown = value.username
  return typeof username === 'string'
}

const isVerifyTokenResponse = (value: unknown): value is VerifyTokenResponse => {
  if (!isRecord(value)) {
    return false
  }
  const principal: unknown = value.principal
  return typeof principal === 'string'
}

export const signIn = async (body: SignInRequest): Promise<SignInResponse> => {
  const baseUrl: string = getApiBaseUrl()
  const url: string = `${baseUrl}/auth/signin`
  const response: Response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const text: string = await response.text()
  if (!response.ok) {
    let parsedBody: unknown = null
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text) as unknown
      } catch {
        parsedBody = null
      }
    }
    const message: string = getSignInUserMessage(response.status, parsedBody)
    throw new Error(message)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isAuthUsernameResponse(parsed)) {
    throw new Error('Invalid response from server.')
  }
  return parsed
}

export const signOut = async (): Promise<void> => {
  const baseUrl: string = getApiBaseUrl()
  const url: string = `${baseUrl}/auth/signout`
  const response: Response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  })
  if (response.ok) {
    return
  }
  if (response.status === 401) {
    return
  }
  const message: string = await readFetchErrorMessage(response, 'Could not sign out.')
  throw new Error(message)
}

export const verifySession = async (): Promise<VerifyTokenResponse> => {
  const baseUrl: string = getApiBaseUrl()
  const url: string = `${baseUrl}/auth/verify`
  const response: Response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE)
    }
    const message: string = await readFetchErrorMessage(response, 'Could not verify your session.')
    throw new Error(message)
  }
  const text: string = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isVerifyTokenResponse(parsed)) {
    throw new Error('Invalid response from server.')
  }
  return parsed
}

export const signUp = async (body: SignUpRequest): Promise<SignUpResponse> => {
  const baseUrl: string = getApiBaseUrl()
  const url: string = `${baseUrl}/auth/signup`
  const response: Response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const text: string = await response.text()
  if (!response.ok) {
    let parsedBody: unknown = null
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text) as unknown
      } catch {
        parsedBody = null
      }
    }
    const message: string = getSignUpUserMessage(response.status, parsedBody)
    throw new Error(message)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Invalid response from server.')
  }
  if (!isAuthUsernameResponse(parsed)) {
    throw new Error('Invalid response from server.')
  }
  return parsed
}
