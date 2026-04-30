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
