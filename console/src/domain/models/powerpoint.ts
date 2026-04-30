import type { ShapeType } from '@/domain/enums/powerpoint'
import type { ColorConfig, Position, Size } from '@/domain/valueobjects/powerpoint'

export interface Shape {
  id: string
  layout_id: string
  shape_id: number
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
  template_id: string
  name: string
  shapes: Shape[]
  background_color: ColorConfig
}

export interface Template {
  id: string
  user_id: string
  name: string
  slide_size: Size
  created_at: Date
  updated_at: Date
  layouts: Layout[]
}

export interface TemplateFile {
  template_id: string
  user_id: string
  path: string
  size: number
}
