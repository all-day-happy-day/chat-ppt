import { httpClient } from '@/api/client'
import type { Role, User } from '@/domain/models/User'
import type { UserRepository } from '@/domain/repositories/UserRepository'

import type {
  DeleteUserResponse,
  GetUserResponse,
  GetUsersResponse,
  PatchUserRequest,
  PatchUserResponse,
  PatchUserRoleRequest,
  PatchUserRoleResponse,
} from './messages/RemoteUserMessage'
import { toUser } from './messages/RemoteUserMessage'

export class RemoteUserRepository implements UserRepository {
  async getUser(id: string): Promise<User> {
    const { response } = await httpClient.get<GetUserResponse>(`/user/${id}`)
    return toUser(response)
  }

  async getUsers(): Promise<User[]> {
    const { response } = await httpClient.get<GetUsersResponse>(`/user/`)
    return response.map((user) => toUser(user))
  }

  async patchUser(id: string, requestBody: { email?: string; username?: string; password?: string }): Promise<User> {
    const { response } = await httpClient.patch<PatchUserRequest, PatchUserResponse>(`/user/${id}`, requestBody)
    return toUser(response)
  }

  async deleteUser(id: string): Promise<void> {
    await httpClient.delete<DeleteUserResponse>(`/user/${id}`)
  }

  async patchUserRole(id: string, requestBody: { role: Role }): Promise<User> {
    const { response } = await httpClient.patch<PatchUserRoleRequest, PatchUserRoleResponse>(
      `/user/role/${id}`,
      requestBody
    )
    return toUser(response)
  }
}
