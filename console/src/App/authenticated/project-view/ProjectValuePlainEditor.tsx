import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { TemplateLayoutSlide } from '@/App/authenticated/template/components/TemplateLayoutSlide'
import type { Layout, Shape } from '@/domain/models/powerpoint'
import { shapePlaceholderApiName } from '@/domain/models/powerpoint'
import type { PlainPart, ValuePart } from '@/domain/models/project'
import type { Size } from '@/domain/valueobjects/powerpoint'
import type { ValueContent } from '@/domain/valueobjects/project'
import { cn, LAYOUT_SELECTION_ACTIVE_CHROME } from '@/lib/utils'

export interface ProjectValuePlainEditorProps {
  readonly layouts: readonly Layout[]
  readonly fallbackSlideSize: Size
  readonly part: ValuePart | PlainPart
  readonly onCommit: (next: ValuePart | PlainPart, nextSlideKind: 'VALUE' | 'PLAIN') => void
  readonly onActivePlaceholderChange: (placeholderShapeId: string | null) => void
}

function layoutHasPlaceholders(layout: Layout): boolean {
  return layout.shapes.some((s: Shape): boolean => s.placeholder)
}

function placeholderShapesInLayout(layout: Layout): Shape[] {
  return layout.shapes.filter((s: Shape): boolean => s.placeholder)
}

function valueContentsForLayout(layout: Layout, prev: ValuePart | PlainPart): ValueContent[] {
  const shapes: Shape[] = placeholderShapesInLayout(layout)
  const prevByShapeId: Map<string, string | null> = new Map<string, string | null>()
  const prevByName: Map<string, string | null> = new Map<string, string | null>()
  if (prev.type === 'VALUE') {
    for (const row of prev.contents.contents) {
      if (
        row.placeholderShapeId !== undefined &&
        row.placeholderShapeId !== null &&
        row.placeholderShapeId.length > 0
      ) {
        prevByShapeId.set(row.placeholderShapeId, row.value)
      }
      prevByName.set(row.placeholderName, row.value)
    }
  }
  return shapes.map((shape: Shape): ValueContent => {
    const placeholderName: string = shapePlaceholderApiName(shape)
    const placeholderShapeId: string = shape.id
    const fromId: string | null | undefined = prevByShapeId.get(placeholderShapeId)
    const value: string | null = fromId !== undefined ? fromId : (prevByName.get(placeholderName) ?? null)
    return { placeholderName, placeholderShapeId, value }
  })
}

/** Rows from server may omit `placeholderShapeId`; zip with layout placeholders by index. */
function resolvePlaceholderShapeId(row: ValueContent, index: number, phShapes: Shape[]): string | null {
  if (row.placeholderShapeId !== undefined && row.placeholderShapeId !== null && row.placeholderShapeId.length > 0) {
    return row.placeholderShapeId
  }
  const sh: Shape | undefined = phShapes[index]
  return sh !== undefined ? sh.id : null
}

export function ProjectValuePlainEditor({
  layouts,
  fallbackSlideSize,
  part,
  onCommit,
  onActivePlaceholderChange,
}: ProjectValuePlainEditorProps): React.ReactElement {
  const { t } = useTranslation()

  const activeLayout: Layout | undefined = React.useMemo((): Layout | undefined => {
    if (part.layoutId === null || part.layoutId.length === 0) {
      return undefined
    }
    return layouts.find((l: Layout): boolean => l.id === part.layoutId)
  }, [layouts, part.layoutId])

  const placeholderShapes: Shape[] = React.useMemo((): Shape[] => {
    return activeLayout !== undefined ? placeholderShapesInLayout(activeLayout) : []
  }, [activeLayout])

  const applyLayout = React.useCallback(
    (layout: Layout): void => {
      const base: Pick<ValuePart, 'id' | 'projectId' | 'containerId' | 'order'> = {
        id: part.id,
        projectId: part.projectId,
        containerId: part.containerId,
        order: part.order,
      }
      if (layoutHasPlaceholders(layout)) {
        const next: ValuePart = {
          ...base,
          type: 'VALUE',
          layoutId: layout.id,
          contents: { type: 'VALUE', contents: valueContentsForLayout(layout, part) },
        }
        onCommit(next, 'VALUE')
        return
      }
      const next: PlainPart = {
        ...base,
        type: 'PLAIN',
        layoutId: layout.id,
        contents: { type: 'PLAIN' },
      }
      onCommit(next, 'PLAIN')
    },
    [onCommit, part]
  )

  const ensureShapeIdsOnRows = React.useCallback(
    (rows: readonly ValueContent[]): ValueContent[] => {
      return rows.map((row: ValueContent, index: number): ValueContent => {
        const sid: string | null = resolvePlaceholderShapeId(row, index, placeholderShapes)
        if (sid === null || (row.placeholderShapeId !== undefined && row.placeholderShapeId === sid)) {
          return row
        }
        return { ...row, placeholderShapeId: sid }
      })
    },
    [placeholderShapes]
  )

  const updatePlaceholderValue = React.useCallback(
    (placeholderShapeId: string, raw: string): void => {
      if (part.type !== 'VALUE') {
        return
      }
      const stored: string | null = raw.length === 0 ? null : raw
      const baseRows: ValueContent[] = ensureShapeIdsOnRows(part.contents.contents)
      const next: ValuePart = {
        ...part,
        contents: {
          type: 'VALUE',
          contents: baseRows.map(
            (row: ValueContent): ValueContent =>
              row.placeholderShapeId === placeholderShapeId ? { ...row, value: stored } : row
          ),
        },
      }
      onCommit(next, 'VALUE')
    },
    [ensureShapeIdsOnRows, onCommit, part]
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="min-w-0">
        <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {t('page.project_view.layout_picker_heading')}
        </h3>
        <p className="text-muted-foreground mb-2 text-xs">{t('page.project_view.layout_picker_hint')}</p>
        <div className="scrollbar-hide flex min-w-0 gap-3 overflow-x-auto px-1 py-1.5">
          {layouts.map((layout: Layout) => {
            const selected: boolean = part.layoutId === layout.id
            return (
              <button
                key={layout.id}
                type="button"
                aria-label={t('page.project_view.layout_option_aria', { name: layout.name })}
                aria-pressed={selected}
                onClick={(): void => {
                  applyLayout(layout)
                }}
                className={cn(
                  'border-border/60 hover:border-border shrink-0 rounded-lg border bg-transparent p-2 transition-[border-color,box-shadow]',
                  selected ? LAYOUT_SELECTION_ACTIVE_CHROME : ''
                )}
              >
                <TemplateLayoutSlide
                  layout={layout}
                  fallbackSlideSize={fallbackSlideSize}
                  maxContentWidthPx={92}
                  disableHoverTip
                  showLayoutTitle={false}
                />
                <span className="text-muted-foreground mt-1 block max-w-[92px] truncate text-center text-[10px] font-medium">
                  {layout.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {part.type === 'VALUE' && part.contents.contents.length > 0 ? (
        <section>
          <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            {t('page.project_view.placeholder_values_heading')}
          </h3>
          <div className="flex flex-col gap-3">
            {part.contents.contents.map((row: ValueContent, index: number): React.ReactElement => {
              const shapeId: string | null = resolvePlaceholderShapeId(row, index, placeholderShapes)
              const rowKey: string = shapeId ?? `${row.placeholderName}-${String(index)}`
              const shapeForRow: Shape | undefined =
                shapeId !== null
                  ? placeholderShapes.find((s: Shape): boolean => s.id === shapeId)
                  : placeholderShapes[index]
              const layoutHint: string | null =
                shapeForRow !== undefined &&
                shapeForRow.text !== null &&
                shapeForRow.text.trim().length > 0
                  ? shapeForRow.text.trim()
                  : null
              const inputPlaceholder: string = layoutHint !== null ? layoutHint : row.placeholderName
              return (
                <label key={rowKey} className="flex min-w-0 flex-col gap-1">
                  <span title={row.placeholderName} className="text-muted-foreground truncate font-mono text-xs">
                    {row.placeholderName}
                  </span>
                  <input
                    type="text"
                    placeholder={inputPlaceholder}
                    value={row.value ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      if (shapeId === null) {
                        return
                      }
                      updatePlaceholderValue(shapeId, e.target.value)
                    }}
                    onFocus={(): void => {
                      if (shapeId === null) {
                        return
                      }
                      onActivePlaceholderChange(shapeId)
                    }}
                    onBlur={(): void => {
                      onActivePlaceholderChange(null)
                    }}
                    className="border-input bg-background focus:border-ring w-full min-w-0 rounded-md border px-2 py-1.5 text-sm outline-none"
                  />
                </label>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
