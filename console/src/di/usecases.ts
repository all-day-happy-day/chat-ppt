import { AuthUseCase } from '@/domain/usecases/auth-usecase'
import { UserUseCase } from '@/domain/usecases/user-usecase'

import { authRepository, userRepository } from './repositories'

export const authUseCase: AuthUseCase = new AuthUseCase(authRepository)
export const userUseCase: UserUseCase = new UserUseCase(userRepository)
