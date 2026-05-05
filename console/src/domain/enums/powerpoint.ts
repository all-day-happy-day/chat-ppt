export const ShapeTypes = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  SHAPE: 'SHAPE',
  TABLE: 'TABLE',
  OTHER: 'OTHER',
} as const

export type ShapeType = (typeof ShapeTypes)[keyof typeof ShapeTypes]
