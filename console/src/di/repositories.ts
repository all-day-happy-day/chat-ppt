import { RemoteAuthRepository } from '@/data/repositories/RemoteAuthRepository'
import { RemoteUserRepository } from '@/data/repositories/RemoteUserRepository'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'
import type { UserRepository } from '@/domain/repositories/UserRepository'

export const authRepository: AuthRepository = new RemoteAuthRepository()
export const userRepository: UserRepository = new RemoteUserRepository()
