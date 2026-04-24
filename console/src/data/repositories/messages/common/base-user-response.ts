import type { Role, User } from '@/domain/models/user'

export interface BaseUserResponse {
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
