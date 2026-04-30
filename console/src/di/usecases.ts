import { AuthUseCase } from '@/domain/usecases/auth-usecase'
import { PowerpointUseCase } from '@/domain/usecases/powerpoint-usecase'
import { SongUseCase } from '@/domain/usecases/song-usecase'
import { UserUseCase } from '@/domain/usecases/user-usecase'

import { authRepository, powerpointRepository, songRepository, userRepository } from './repositories'

export const authUseCase: AuthUseCase = new AuthUseCase(authRepository)
export const powerpointUseCase: PowerpointUseCase = new PowerpointUseCase(powerpointRepository)
export const songUseCase: SongUseCase = new SongUseCase(songRepository)
export const userUseCase: UserUseCase = new UserUseCase(userRepository)
