import { AuthUseCase } from '@/domain/usecases/auth-usecase'
import { SongUseCase } from '@/domain/usecases/song-usecase'
import { UserUseCase } from '@/domain/usecases/user-usecase'

import { authRepository, songRepository, userRepository } from './repositories'

export const authUseCase: AuthUseCase = new AuthUseCase(authRepository)
export const songUseCase: SongUseCase = new SongUseCase(songRepository)
export const userUseCase: UserUseCase = new UserUseCase(userRepository)
