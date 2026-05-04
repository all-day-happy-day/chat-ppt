import type { ShapeType } from '@/domain/enums/powerpoint'
import type { ColorConfig, ImageData, Position, Size } from '@/domain/valueobjects/powerpoint'

export interface Shape {
  id: string
  layoutId: string
  shapeId: number
  size: Size
  position: Position
  name: string
  text: string | null
  placeholder: boolean
  type: ShapeType
  fillColor: ColorConfig
  image?: ImageData | null
}

/** Placeholder text written into PPT; from shape name or synthetic `shape_{shapeId}` — may duplicate across shapes. */
export function shapePlaceholderApiName(shape: Shape): string {
  const trimmed: string = shape.name.trim()
  return trimmed.length > 0 ? trimmed : `shape_${String(shape.shapeId)}`
}

/** Same as API `placeholderName` when `shape.placeholder`; otherwise null. */
export function shapePlaceholderKey(shape: Shape): string | null {
  if (!shape.placeholder) {
    return null
  }
  return shapePlaceholderApiName(shape)
}

export interface Layout {
  id: string
  templateId: string
  name: string
  shapes: Shape[]
  backgroundColor: ColorConfig
  /** Slide dimensions in the same unit as shape positions (template slide size). */
  slideSize: Size
}

export interface Template {
  id: string
  userId: string
  name: string
  slideSize: Size
  createdAt: string
  updatedAt: string
  layouts: Layout[]
}

export interface TemplateFile {
  templateId: string
  userId: string
  path: string
  size: number
}
