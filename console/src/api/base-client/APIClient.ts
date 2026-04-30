import type { Input } from '@/lib/utils'
import { snakeToCamel } from '@/lib/utils'

import { prepareRequestBody } from './utils/prepare-request-body'
import type { PreparedBody, RequestBody } from './utils/prepare-request-body.types'
import type { APIRequest, APIResponse, InterceptorManager } from './APIClient.types'

export class APIClient {
  private readonly baseUrl: string
  private readonly requestInterceptors: Array<(config: APIRequest) => APIRequest> = []
  private readonly responseInterceptors: Array<(response: APIResponse) => APIResponse> = []
  public interceptors: InterceptorManager

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.interceptors = {
      request: {
        use: (fn: (apiRequest: APIRequest) => APIRequest) => {
          this.requestInterceptors.push(fn)
        },
      },
      response: {
        use: <T>(fn: (apiResponse: APIResponse<T>) => APIResponse<T>): void => {
          this.responseInterceptors.push(fn as (response: APIResponse) => APIResponse)
        },
      },
    }
  }

  async get<TResponse>(
    url: string,
    headers?: HeadersInit,
    params?: string | URLSearchParams | Record<string, string> | string[][] | undefined
  ): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'GET', headers: headers }, params)
  }

  async post<TRequestBody extends RequestBody, TResponse>(
    url: string,
    body: TRequestBody,
    headers?: HeadersInit,
    params?: string | URLSearchParams | Record<string, string> | string[][] | undefined
  ): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'POST', headers: headers, body: body }, params)
  }

  async patch<TRequestBody extends RequestBody, TResponse>(
    url: string,
    body: TRequestBody,
    headers?: HeadersInit,
    params?: string | URLSearchParams | Record<string, string> | string[][] | undefined
  ): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'PATCH', headers: headers, body: body }, params)
  }

  async delete<TResponse>(
    url: string,
    headers?: HeadersInit,
    params?: string | URLSearchParams | Record<string, string> | string[][] | undefined
  ): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'DELETE', headers: headers }, params)
  }

  private async request<TResponse = unknown>(
    request: APIRequest,
    params?: string | URLSearchParams | Record<string, string> | string[][] | undefined
  ): Promise<APIResponse<TResponse>> {
    request = this.requestInterceptors.reduce((acc, interceptor) => interceptor(acc), request)

    const requestUrl: string = this.buildRequestUrl(request.url, params)

    const preparedRequestBody: PreparedBody | undefined =
      'body' in request ? prepareRequestBody(request.body) : undefined
    const preparedHeaders: HeadersInit =
      preparedRequestBody && 'contentType' in preparedRequestBody
        ? { 'content-type': preparedRequestBody.contentType }
        : {}
    const fetchHeaders: HeadersInit = {
      ...preparedHeaders,
      ...(request.headers ?? {}),
    }

    const fetchResponse: Response = await fetch(requestUrl, {
      method: request.method,
      headers: fetchHeaders,
      credentials: 'include',
      ...(preparedRequestBody ? { body: preparedRequestBody.body } : {}),
    })
    if (!fetchResponse.ok) throw new Error(`Failed to fetch data: ${fetchResponse.statusText}`)

    const contentType: string = fetchResponse.headers.get('content-type') ?? ''

    let parsedBody: TResponse | string
    if (contentType.includes('application/json')) {
      parsedBody = (await fetchResponse.json()) as TResponse
    } else {
      parsedBody = await fetchResponse.text()
    }

    let apiResponse: APIResponse<TResponse> = {
      response: parsedBody as TResponse,
      requestUrl: requestUrl,
      status: fetchResponse.status,
      status_message: fetchResponse.statusText,
    }
    apiResponse = this.responseInterceptors.reduce<APIResponse<TResponse>>(
      (acc, interceptor) => interceptor(acc) as APIResponse<TResponse>,
      apiResponse
    )
    const response: APIResponse<TResponse> = apiResponse
    response.response = snakeToCamel<TResponse>(response.response as Input)

    return response
  }

  private buildRequestUrl(
    url: string,
    params?: string | URLSearchParams | Record<string, string> | string[][] | undefined
  ): string {
    const normalizedUrl: string = url.startsWith('/') ? url.slice(1) : url
    if (params) {
      return `${this.baseUrl}/${normalizedUrl}?${new URLSearchParams(params).toString()}`
    } else {
      return `${this.baseUrl}/${normalizedUrl}`
    }
  }
}
