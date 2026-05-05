import type { Role } from '@/domain/models/user'

import type { BaseUserResponse } from './common/base-user-response'

interface BaseAuthResponse {
  username: string
}

// SignIn
export type SignInRequest = {
  principal: string
  password: string
}
export type SignInResponse = BaseAuthResponse

// SignOut
export type SignOutResponse = BaseAuthResponse

// SignUp
export type SignUpRequest = {
  email: string
  username: string
  password: string
  role?: Role
}
export type SignUpResponse = BaseAuthResponse

// VerifyPassword
export type VerifyPasswordRequest = {
  principal: string
  password: string
}

// Verify

// Reissue

// GetCurrentUser
export type GetCurrentUserResponse = BaseUserResponse

// PatchPassword
export type PatchPasswordRequest = {
  password: string
}
export type PatchPasswordResponse = BaseAuthResponse
