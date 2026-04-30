import type { ShapeType } from '@/domain/enums/powerpoint'
import type { ColorConfig, Position, Size } from '@/domain/valueobjects/powerpoint'

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
}

export interface Layout {
  id: string
  templateId: string
  name: string
  shapes: Shape[]
  backgroundColor: ColorConfig
}

export interface Template {
  id: string
  userId: string
  name: string
  slideSize: Size
  createdAt: Date
  updatedAt: Date
  layouts: Layout[]
}

export interface TemplateFile {
  templateId: string
  userId: string
  path: string
  size: number
}
