import type { Role, User } from '@/domain/models/user'

export abstract class AuthRepository {
  abstract signIn(requestBody: { principal: string; password: string }): Promise<string>
  abstract signOut(): Promise<void>
  abstract signUp(requestBody: { email: string; username: string; password: string; role?: Role }): Promise<string>
  abstract verifyPassword(requestBody: { principal: string; password: string }): Promise<void>
  abstract verify(): Promise<void>
  abstract reissue(): Promise<void>
  abstract getCurrentUser(): Promise<User>
}
