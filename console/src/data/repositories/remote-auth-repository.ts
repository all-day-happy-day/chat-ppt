import type { APIResponse } from '@/api/base-client/APIClient.types'
import type { RequestBody } from '@/api/base-client/utils/prepare-request-body.types'
import { httpClient } from '@/api/client'
import type { Role, User } from '@/domain/models/user'
import type { AuthRepository } from '@/domain/repositories/auth-repository'

import { toUser } from './messages/common/base-user-response'
import type {
  GetCurrentUserResponse,
  PatchPasswordRequest,
  PatchPasswordResponse,
  SignInRequest,
  SignInResponse,
  SignOutResponse,
  SignUpRequest,
  SignUpResponse,
  VerifyPasswordRequest,
} from './messages/remote-auth-message'

export class RemoteAuthRepository implements AuthRepository {
  async signIn(requestBody: { principal: string; password: string }): Promise<string> {
    const { response } = await httpClient.post<SignInRequest, SignInResponse>(`/auth/signin`, requestBody)
    return response.username
  }

  async signOut(): Promise<void> {
    await httpClient.post<RequestBody, SignOutResponse>(`/auth/signout`, {})
  }

  async signUp(requestBody: { email: string; username: string; password: string; role?: Role }): Promise<string> {
    const { response } = await httpClient.post<SignUpRequest, SignUpResponse>(`/auth/signup`, requestBody)
    return response.username
  }

  async verifyPassword(requestBody: { principal: string; password: string }): Promise<void> {
    await httpClient.post<VerifyPasswordRequest, APIResponse>(`/auth/verify-password`, requestBody)
  }

  async verify(): Promise<void> {
    await httpClient.get<APIResponse>(`/auth/verify`)
  }

  async reissue(): Promise<void> {
    await httpClient.post<RequestBody, APIResponse>(`/auth/reissue`, {})
  }

  async getCurrentUser(): Promise<User> {
    const { response } = await httpClient.get<GetCurrentUserResponse>(`/auth/me`)
    return toUser(response)
  }

  async patchPassword(id: string, requestBody: { password: string }): Promise<string> {
    const { response } = await httpClient.patch<PatchPasswordRequest, PatchPasswordResponse>(
      `/auth/password/${id}`,
      requestBody
    )
    return response.username
  }
}
