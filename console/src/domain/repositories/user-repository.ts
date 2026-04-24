import type { Role, User } from '@/domain/models/user'

export abstract class UserRepository {
  abstract getUser(id: string): Promise<User>
  abstract getUsers(): Promise<User[]>
  abstract patchUser(id: string, requestBody: { email?: string; username?: string; password?: string }): Promise<User>
  abstract deleteUser(id: string): Promise<void>
  abstract patchUserRole(id: string, requestBody: { role: Role }): Promise<User>
}
