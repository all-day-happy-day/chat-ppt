export type JSONBody = Record<string, unknown> | unknown[]
export type RequestBody =
  | JSONBody
  | FormData
  | URLSearchParams
  | string
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | ReadableStream
export type PreparedBody =
  | { kind: 'json'; body: string; contentType: 'application/json' }
  | { kind: 'formData'; body: FormData }
  | { kind: 'urlEncoded'; body: URLSearchParams }
  | { kind: 'text'; body: string; contentType: 'text/plain' }
  | { kind: 'binary'; body: Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer> }
  | { kind: 'stream'; body: ReadableStream }
