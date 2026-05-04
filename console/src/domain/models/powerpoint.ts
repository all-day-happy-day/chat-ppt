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
