import { APIClient } from './base-client/APIClient'

export const API_BASE_URL: string = `http://${window.location.hostname}:8000`

export const httpClient = new APIClient(API_BASE_URL)

httpClient.interceptors.request.use((request) => {
  console.log('[Request] Sent', request.url, request)
  return request
})

httpClient.interceptors.response.use((response) => {
  console.log('[Response] Received', response.requestUrl, response)
  return response
})
