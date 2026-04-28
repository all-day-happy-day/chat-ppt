import { APIClient } from './base-client/APIClient'

export const httpClient = new APIClient(`http://${window.location.hostname}:8000`)

httpClient.interceptors.request.use((request) => {
  console.log('[Request] Sent', request.url, request)
  return request
})

httpClient.interceptors.response.use((response) => {
  console.log('[Response] Received', response.requestUrl, response)
  return response
})
