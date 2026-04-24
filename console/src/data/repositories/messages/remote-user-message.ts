import type { Role } from '@/domain/models/user'

import type { BaseUserResponse } from './common/base-user-response'

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
