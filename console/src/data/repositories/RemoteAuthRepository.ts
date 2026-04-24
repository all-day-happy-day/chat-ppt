import type { APIResponse } from '@/api/baseClient/APIClient.type'
import type { RequestBody } from '@/api/baseClient/utils/prepareRequestBody.type'
import { httpClient } from '@/api/client'
import type { Role } from '@/domain/models/User'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'

import type {
  SignInRequest,
  SignInResponse,
  SignOutResponse,
  SignUpRequest,
  SignUpResponse,
  VerifyPasswordRequest,
} from './messages/RemoteAuthMessage'

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
    await httpClient.post<RequestBody, APIResponse>(`/auth/verify`, {})
  }

  async reissue(): Promise<void> {
    await httpClient.post<RequestBody, APIResponse>(`/auth/refresh`, {})
  }
}
