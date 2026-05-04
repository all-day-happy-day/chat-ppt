export interface Size {
  width: number
  height: number
}

export interface Position {
  x: number
  y: number
  rotation: number
}

export interface ColorConfig {
  colorType: 'solid' | 'none'
  color: string | null
  alpha: number | null
}

export interface ImageData {
  readonly data: string
  // readonly ext: string
  readonly byteLength: number
}

export function normalizeImageBase64Payload(data: string): string {
  let s: string = data.trim()
  const marker: string = 'base64,'
  const idx: number = s.indexOf(marker)
  if (idx >= 0) {
    s = s.slice(idx + marker.length)
  }
  return s.replace(/\s/g, '')
}

export function imageDataToDataUrl(image: ImageData): string {
  const dataStr: string = typeof image.data === 'string' ? image.data : ''
  const rawBase64: string = normalizeImageBase64Payload(dataStr)
  return `data:image/png;base64,${rawBase64}`
}
