import { RemoteAuthRepository } from '@/data/repositories/remote-auth-repository'
import { RemoteUserRepository } from '@/data/repositories/remote-user-repository'
import type { AuthRepository } from '@/domain/repositories/auth-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'

export const authRepository: AuthRepository = new RemoteAuthRepository()
export const userRepository: UserRepository = new RemoteUserRepository()
