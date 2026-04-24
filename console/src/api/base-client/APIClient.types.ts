import type { RequestBody } from './utils/prepare-request-body.types'

type GetHttpMethod = 'GET' | 'DELETE'
type PostHttpMethod = 'POST' | 'PUT' | 'PATCH'
type HttpMethod = GetHttpMethod | PostHttpMethod

type BaseRequest = {
  url: string
  method: HttpMethod
  headers?: HeadersInit
}

type GetRequest = BaseRequest & {
  method: GetHttpMethod
}

export type BodyRequest<T extends RequestBody = RequestBody> = BaseRequest & {
  method: PostHttpMethod
  body: T
}

export type APIRequest<T extends RequestBody = RequestBody> = GetRequest | BodyRequest<T>

export type APIResponse<T = unknown> = {
  response: T
  requestUrl: string
  status: number
  status_message: string
}

type RequestInterceptor = (apiRequest: APIRequest) => APIRequest
type ResponseInterceptor<T = unknown> = (apiResponse: APIResponse<T>) => APIResponse<T>
export type InterceptorManager = {
  request: {
    use: (fn: RequestInterceptor) => void
  }
  response: {
    use: <T>(fn: ResponseInterceptor<T>) => void
  }
}
