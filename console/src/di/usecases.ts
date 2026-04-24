import { AuthUseCase } from '@/domain/usecases/AuthUseCase'
import { UserUseCase } from '@/domain/usecases/UserUseCase'

import { authRepository, userRepository } from './repositories'

export const authUseCase: AuthUseCase = new AuthUseCase(authRepository)
export const userUseCase: UserUseCase = new UserUseCase(userRepository)
