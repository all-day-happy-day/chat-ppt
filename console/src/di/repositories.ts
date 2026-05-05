import { RemoteAuthRepository } from '@/data/repositories/remote-auth-repository'
import { RemotePowerpointRepository } from '@/data/repositories/remote-powerpoint-repository'
import { RemoteProjectRepository } from '@/data/repositories/remote-project-repository'
import { RemoteSongRepository } from '@/data/repositories/remote-song-repository'
import { RemoteUserRepository } from '@/data/repositories/remote-user-repository'
import type { AuthRepository } from '@/domain/repositories/auth-repository'
import type { PowerpointRepository } from '@/domain/repositories/powerpoint-repository'
import type { ProjectRepository } from '@/domain/repositories/project-repository'
import type { SongRepository } from '@/domain/repositories/song-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'

export const authRepository: AuthRepository = new RemoteAuthRepository()
export const powerpointRepository: PowerpointRepository = new RemotePowerpointRepository()
export const projectRepository: ProjectRepository = new RemoteProjectRepository()
export const songRepository: SongRepository = new RemoteSongRepository()
export const userRepository: UserRepository = new RemoteUserRepository()
