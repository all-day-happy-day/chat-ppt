import { RemoteAuthRepository } from '@/data/repositories/remote-auth-repository'
import { RemoteSongRepository } from '@/data/repositories/remote-song-repository'
import { RemoteUserRepository } from '@/data/repositories/remote-user-repository'
import type { AuthRepository } from '@/domain/repositories/auth-repository'
import type { SongRepository } from '@/domain/repositories/song-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'

export const authRepository: AuthRepository = new RemoteAuthRepository()
export const songRepository: SongRepository = new RemoteSongRepository()
export const userRepository: UserRepository = new RemoteUserRepository()
