import type { Role, User } from '@/domain/models/user'

export interface BaseUserResponse {
  id: string
  username: string
  email: string
  role: Role
  createdAt: string
  lastSignIn: string | null
}

export function toUser(response: BaseUserResponse): User {
  return {
    id: response.id,
    username: response.username,
    email: response.email,
    role: response.role,
    createdAt: new Date(response.createdAt),
    lastSignIn: response.lastSignIn ? new Date(response.lastSignIn) : null,
  }
}
