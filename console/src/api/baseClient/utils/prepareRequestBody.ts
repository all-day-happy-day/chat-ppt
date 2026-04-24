import type { PreparedBody, RequestBody } from './prepareRequestBody.type'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  const prototype: object | null = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

export function prepareRequestBody(body: RequestBody): PreparedBody {
  // isFormData
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return { kind: 'formData', body: body }
  }
  // isURLEncoded
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
    return { kind: 'urlEncoded', body: body }
  // isText
  if (typeof String !== 'undefined' && typeof body === 'string') {
    return { kind: 'text', body: body, contentType: 'text/plain' }
  }
  // isBinary
  if (
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) ||
    (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(body))
  ) {
    if (ArrayBuffer.isView(body)) {
      if (body.buffer instanceof ArrayBuffer) {
        body = body as ArrayBufferView<ArrayBuffer>
      } else {
        const copied = new Uint8Array(body.byteLength)
        copied.set(new Uint8Array(body.buffer, body.byteOffset, body.byteLength))
        body = copied.buffer
      }
    }
    return { kind: 'binary', body: body as Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer> }
  }
  // isStream
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    return { kind: 'stream', body: body }
  }
  // isJSON
  if (isPlainObject(body) || Array.isArray(body)) {
    return { kind: 'json', body: JSON.stringify(body), contentType: 'application/json' }
  }

  throw new Error('Unsupported body type')
}
