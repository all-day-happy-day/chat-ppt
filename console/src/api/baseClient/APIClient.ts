import { prepareRequestBody } from './utils/prepareRequestBody'
import type { PreparedBody, RequestBody } from './utils/prepareRequestBody.type'
import type { APIRequest, APIResponse, InterceptorManager } from './APIClient.type'

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

  async get<TResponse>(url: string, headers?: HeadersInit): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'GET', headers: headers })
  }

  async post<TRequestBody extends RequestBody, TResponse>(
    url: string,
    body: TRequestBody,
    headers?: HeadersInit
  ): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'POST', headers: headers, body: body })
  }

  async patch<TRequestBody extends RequestBody, TResponse>(
    url: string,
    body: TRequestBody,
    headers?: HeadersInit
  ): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'PATCH', headers: headers, body: body })
  }

  async delete<TResponse>(url: string, headers?: HeadersInit): Promise<APIResponse<TResponse>> {
    return this.request<TResponse>({ url: url, method: 'DELETE', headers: headers })
  }

  private async request<TResponse = unknown>(request: APIRequest): Promise<APIResponse<TResponse>> {
    request = this.requestInterceptors.reduce((acc, interceptor) => interceptor(acc), request)

    const requestUrl: string = this.buildRequestUrl(request.url)

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
      ...(preparedRequestBody ? { body: preparedRequestBody.body } : {}),
    })

    const contentType: string = fetchResponse.headers.get('content-type') ?? ''

    let parsedBody: TResponse | string
    if (contentType.includes('application/json')) {
      parsedBody = (await fetchResponse.json()) as TResponse
    } else {
      parsedBody = await fetchResponse.text()
    }

    let response: APIResponse<TResponse> = {
      response: parsedBody as TResponse,
      requestUrl: requestUrl,
      status: fetchResponse.status,
      status_message: fetchResponse.statusText,
    }
    response = this.responseInterceptors.reduce<APIResponse<TResponse>>(
      (acc, interceptor) => interceptor(acc) as APIResponse<TResponse>,
      response
    )

    return response
  }

  private buildRequestUrl(url: string): string {
    const normalizedUrl: string = url.startsWith('/') ? url.slice(1) : url
    return `${this.baseUrl}/${normalizedUrl}`
  }
}
