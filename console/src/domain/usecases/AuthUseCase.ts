import type { Role } from '@/domain/models/User'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'

export class AuthUseCase {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async signIn(requestBody: { principal: string; password: string }): Promise<string> {
    return this.authRepository.signIn(requestBody)
  }

  async signOut(): Promise<void> {
    return this.authRepository.signOut()
  }

  async signUp(requestBody: { email: string; username: string; password: string; role?: Role }): Promise<string> {
    return this.authRepository.signUp(requestBody)
  }

  async verifyPassword(requestBody: { principal: string; password: string }): Promise<void> {
    return this.authRepository.verifyPassword(requestBody)
  }

  async verify(): Promise<void> {
    return this.authRepository.verify()
  }

  async reissue(): Promise<void> {
    return this.authRepository.reissue()
  }
}
