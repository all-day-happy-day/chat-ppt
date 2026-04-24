import type { Role } from '@/domain/models/user'

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
