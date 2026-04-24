import type { Role, User } from '@/domain/models/User'
import type { UserRepository } from '@/domain/repositories/UserRepository'

export class UserUseCase {
  private readonly userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  async getUser(id: string): Promise<User> {
    return this.userRepository.getUser(id)
  }

  async getUsers(): Promise<User[]> {
    return this.userRepository.getUsers()
  }

  async patchUser(id: string, requestBody: { email?: string; username?: string; password?: string }): Promise<User> {
    return this.userRepository.patchUser(id, requestBody)
  }

  async deleteUser(id: string): Promise<void> {
    return this.userRepository.deleteUser(id)
  }

  async patchUserRole(id: string, requestBody: { role: Role }): Promise<User> {
    return this.userRepository.patchUserRole(id, requestBody)
  }
}
