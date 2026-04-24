import type { Role, User } from '@/domain/models/User'

interface BaseUserResponse {
  id: string
  username: string
  email: string
  role: Role
  createdAt: Date
  lastSignIn: Date | null
}

export function toUser(response: BaseUserResponse): User {
  return {
    id: response.id,
    username: response.username,
    email: response.email,
    role: response.role,
    createdAt: response.createdAt,
    lastSignIn: response.lastSignIn,
  }
}

// GetUser
export type GetUserResponse = BaseUserResponse

// GetUsers
export type GetUsersResponse = BaseUserResponse[]

// PatchUser
export type PatchUserRequest = {
  email?: string
  username?: string
  password?: string
}
export type PatchUserResponse = BaseUserResponse

// DeleteUser
export type DeleteUserResponse = void

// PatchUserRole
export type PatchUserRoleRequest = {
  role: Role
}
export type PatchUserRoleResponse = BaseUserResponse
