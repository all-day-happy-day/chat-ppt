import type { Role, User } from '@/domain/models/User'

export abstract class AuthRepository {
  abstract signIn(requestBody: { principal: string; password: string }): Promise<User>
  abstract signOut(): Promise<void>
  abstract signUp(requestBody: { email: string; username: string; password: string; role?: Role }): Promise<User>
  abstract verifyPassword(requestBody: { pasword: string }): Promise<void>
  abstract verify(): Promise<void>
  abstract reissue(): Promise<void>
}
