import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { ShapeTypes } from '@/domain/enums/powerpoint'
import type { Layout, Shape } from '@/domain/models/powerpoint'
import type { ColorConfig, Size } from '@/domain/valueobjects/powerpoint'
import { imageDataToDataUrl } from '@/domain/valueobjects/powerpoint'
import { cn } from '@/lib/utils'

import '@/i18n/i18n'

function fillStyle(fill: ColorConfig): React.CSSProperties {
  if (fill.colorType === 'none') {
    return { backgroundColor: 'transparent' }
  }
  const color: string = fill.color ?? 'transparent'
  if (fill.alpha !== null && fill.alpha !== undefined && fill.alpha < 1) {
    return { backgroundColor: color, opacity: fill.alpha }
  }
  return { backgroundColor: color }
}

function outlineRingClass(placeholder: boolean): string {
  return placeholder
    ? 'border-primary border border-solid'
    : 'border-muted-foreground border border-dashed'
}

interface HoverTipState {
  readonly shape: Shape
  readonly clientX: number
  readonly clientY: number
}

interface ShapeViewProps {
  readonly shape: Shape
  readonly slideW: number
  readonly slideH: number
  readonly onHoverStart: (event: React.PointerEvent<HTMLElement>, shape: Shape) => void
  readonly onHoverMove: (event: React.PointerEvent<HTMLElement>) => void
  readonly onHoverEnd: () => void
}

function ShapeView({
  shape,
  slideW,
  slideH,
  onHoverStart,
  onHoverMove,
  onHoverEnd,
}: ShapeViewProps): React.ReactElement {
  const leftPct: number = (shape.position.x / slideW) * 100
  const topPct: number = (shape.position.y / slideH) * 100
  const wPct: number = (shape.size.width / slideW) * 100
  const hPct: number = (shape.size.height / slideH) * 100
  const rot: number = shape.position.rotation
  const ring: string = outlineRingClass(shape.placeholder)

  const base: React.CSSProperties = {
    position: 'absolute',
    left: `${String(leftPct)}%`,
    top: `${String(topPct)}%`,
    width: `${String(wPct)}%`,
    height: `${String(hPct)}%`,
    transform: `rotate(${String(rot)}deg)`,
    transformOrigin: 'center center',
    boxSizing: 'border-box',
  }

  const hitProps: Pick<
    React.HTMLAttributes<HTMLDivElement>,
    'onPointerEnter' | 'onPointerLeave' | 'onPointerMove' | 'onPointerCancel'
  > = {
    onPointerEnter: (e: React.PointerEvent<HTMLDivElement>): void => {
      onHoverStart(e, shape)
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>): void => {
      onHoverMove(e)
    },
    onPointerLeave: (): void => {
      onHoverEnd()
    },
    onPointerCancel: (): void => {
      onHoverEnd()
    },
  }

  if (shape.image != null) {
    return (
      <div style={base} className={cn('relative cursor-help overflow-hidden', ring)} {...hitProps}>
        <div className="absolute inset-0" style={fillStyle(shape.fillColor)} aria-hidden />
        <img
          src={imageDataToDataUrl(shape.image)}
          alt=""
          className="relative z-10 block h-full w-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      </div>
    )
  }

  if (shape.type === ShapeTypes.IMAGE) {
    return (
      <div
        style={{ ...base, ...fillStyle(shape.fillColor) }}
        className={cn('cursor-help overflow-hidden', ring)}
        {...hitProps}
        aria-hidden
      />
    )
  }

  return (
    <div
      style={{ ...base, ...fillStyle(shape.fillColor) }}
      className={cn('cursor-help overflow-hidden', ring)}
      {...hitProps}
      aria-hidden
    />
  )
}

function resolveSlideDimensions(layout: Layout, fallback: Size): { width: number; height: number } {
  const w: number = layout.slideSize.width > 0 ? layout.slideSize.width : fallback.width
  const h: number = layout.slideSize.height > 0 ? layout.slideSize.height : fallback.height
  return { width: Math.max(w, 1), height: Math.max(h, 1) }
}

function ShapeHoverTooltip({ tip }: { readonly tip: HoverTipState }): React.ReactElement {
  const { t } = useTranslation()
  const { shape, clientX, clientY } = tip
  const textPreview: string | null =
    shape.text !== null && shape.text.trim().length > 0 ? shape.text : null
  const kindLabel: string = shape.placeholder
    ? t('page.template_layout.tooltip_placeholder')
    : shape.type

  return (
    <div
      style={{
        position: 'fixed',
        left: clientX,
        top: clientY,
        transform: 'translate(-50%, calc(-100% - 10px))',
        zIndex: 60,
      }}
      className="bg-popover text-popover-foreground border-border pointer-events-none max-w-xs rounded-md border px-3 py-2 text-left text-xs shadow-lg"
    >
      <div className="text-foreground font-semibold">{kindLabel}</div>
      <div className="text-muted-foreground mt-0.5 font-mono text-[11px]">
        {String(shape.shapeId)}:{shape.name}
      </div>
      {textPreview !== null ? (
        <pre className="border-border text-foreground mt-2 max-h-40 max-w-full overflow-auto whitespace-pre-wrap rounded border bg-transparent p-2 text-[11px] leading-snug">
          {textPreview}
        </pre>
      ) : null}
    </div>
  )
}

export interface TemplateLayoutSlideProps {
  readonly layout: Layout
  /** When API omits slide dimensions, use template-level layout size from `TemplateResponse`. */
  readonly fallbackSlideSize: Size
  readonly maxContentWidthPx?: number
}

export function TemplateLayoutSlide({
  layout,
  fallbackSlideSize,
  maxContentWidthPx = 640,
}: TemplateLayoutSlideProps): React.ReactElement {
  const slide: { width: number; height: number } = resolveSlideDimensions(layout, fallbackSlideSize)
  const aspect: number = slide.height / slide.width
  const displayW: number = maxContentWidthPx
  const displayH: number = Math.round(displayW * aspect)

  const [hoverTip, setHoverTip] = React.useState<HoverTipState | null>(null)

  const onHoverStart = React.useCallback((event: React.PointerEvent<HTMLElement>, shape: Shape): void => {
    setHoverTip({
      shape,
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }, [])

  const onHoverMove = React.useCallback((event: React.PointerEvent<HTMLElement>): void => {
    setHoverTip((prev: HoverTipState | null): HoverTipState | null => {
      if (prev === null) return null
      return { ...prev, clientX: event.clientX, clientY: event.clientY }
    })
  }, [])

  const onHoverEnd = React.useCallback((): void => {
    setHoverTip(null)
  }, [])

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      <div className="text-muted-foreground w-full max-w-full text-center text-sm font-medium">
        {layout.name}
      </div>
      <div
        className="border-border bg-muted/10 relative mx-auto max-w-full overflow-hidden rounded-lg border shadow-sm"
        style={{ width: displayW, height: displayH }}
      >
        <div className="absolute inset-0" style={{ ...fillStyle(layout.backgroundColor) }} />
        <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
          {layout.shapes.map((shape: Shape) => (
            <ShapeView
              key={shape.id}
              shape={shape}
              slideW={slide.width}
              slideH={slide.height}
              onHoverStart={onHoverStart}
              onHoverMove={onHoverMove}
              onHoverEnd={onHoverEnd}
            />
          ))}
        </div>
      </div>
      {hoverTip !== null ? createPortal(<ShapeHoverTooltip tip={hoverTip} />, document.body) : null}
    </div>
  )
}
