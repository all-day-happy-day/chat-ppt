/**
 * Generates a Crockford Base32 ULID (26 chars). Project part `id` on the wire must be ULID — do not use UUID.
 * @see https://github.com/ulid/spec
 */
const ULID_ENCODING: string = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const encodeTimestamp = (timestampMs: number): string => {
  let remaining: number = timestampMs
  let result: string = ''
  for (let i: number = 0; i < 10; i += 1) {
    const mod: number = remaining % 32
    result = ULID_ENCODING.charAt(mod) + result
    remaining = Math.floor(remaining / 32)
  }
  return result
}

const encodeRandomSuffix = (length: number): string => {
  const bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(length))
  let result: string = ''
  for (let i: number = 0; i < length; i += 1) {
    result += ULID_ENCODING.charAt(bytes[i]! & 31)
  }
  return result
}

/** New project part id: client-generated ULID (same format the API expects). */
export function generatePartUlid(): string {
  return `${encodeTimestamp(Date.now())}${encodeRandomSuffix(16)}`
}
