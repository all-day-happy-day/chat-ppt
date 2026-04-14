import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { listLayoutThumbnailShapeRects, type LayoutThumbnailShapeRect } from '../lib/project-parts-for-patch';
import type { GetLayoutResponse } from '../types/template-layout';

const FALLBACK_VIEWBOX_WIDTH: number = 16;

const FALLBACK_VIEWBOX_HEIGHT: number = 9;

const DEFAULT_WIREFRAME_FILL: string = "#cbd5e1";

const DEFAULT_WIREFRAME_FILL_OPACITY: number = 0.4;

const IMAGE_PLACEHOLDER_FALLBACK_FILL: string = "#94a3b8";

const PLACEHOLDER_HIGHLIGHT_STROKE: string = "#fbbf24";

const PLACEHOLDER_HIGHLIGHT_STROKE_WIDTH_FACTOR: number = 1.38;

const PLACEHOLDER_HIGHLIGHT_STROKE_OPACITY: number = 0.4;

const PLACEHOLDER_HOVER_CLEAR_MS: number = 45;

const STROKE_NON_PLACEHOLDER: string = "rgba(15, 23, 42, 0.28)";

const STROKE_PLACEHOLDER_IDLE: string = "#64748b";

type ThumbnailModel = {
  slideWidth: number;
  slideHeight: number;
  rects: LayoutThumbnailShapeRect[];
};

export type TemplateLayoutThumbnailProps = {
  entry: GetLayoutResponse;
  className?: string;
  /** When set and it matches a placeholder shape key, that shape uses highlight styling. */
  highlightedShapeKey?: string | null;
  /** When set, placeholder hover reports an uppercase label (e.g. canvas header). */
  onPlaceholderHoverLabelChange?: (label: string | null) => void;
};

const computeRectRotateTransform = (r: LayoutThumbnailShapeRect): string | undefined => {
  const cx: number = r.x + r.width / 2;
  const cy: number = r.y + r.height / 2;
  const hasRotation: boolean = Number.isFinite(r.rotationDeg) && Math.abs(r.rotationDeg) > 1e-6;
  if (!hasRotation) {
    return undefined;
  }
  return `rotate(${String(r.rotationDeg)} ${String(cx)} ${String(cy)})`;
};

const buildPlaceholderLabelForChrome = (r: LayoutThumbnailShapeRect): string => {
  const raw: string = (r.placeholderTagLabel ?? r.placeholderLabel ?? '').trim();
  if (raw.length === 0) {
    return 'PLACEHOLDER';
  }
  return raw.toUpperCase();
};

export const TemplateLayoutThumbnail = ({
  entry,
  className,
  highlightedShapeKey = null,
  onPlaceholderHoverLabelChange,
}: TemplateLayoutThumbnailProps) => {
  const hoverClearTimeoutRef = useRef<number | null>(null);
  const [hoveredPlaceholderShapeKey, setHoveredPlaceholderShapeKey] = useState<string | null>(null);
  const clearHoverTimeout = useCallback((): void => {
    if (hoverClearTimeoutRef.current !== null) {
      window.clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = null;
    }
  }, []);
  useEffect((): (() => void) => {
    return (): void => {
      clearHoverTimeout();
    };
  }, [clearHoverTimeout]);
  const scheduleClearHoverLabel = useCallback((): void => {
    clearHoverTimeout();
    hoverClearTimeoutRef.current = window.setTimeout((): void => {
      hoverClearTimeoutRef.current = null;
      setHoveredPlaceholderShapeKey(null);
      onPlaceholderHoverLabelChange?.(null);
    }, PLACEHOLDER_HOVER_CLEAR_MS);
  }, [clearHoverTimeout, onPlaceholderHoverLabelChange]);
  const handlePlaceholderPointerEnter = useCallback(
    (shapeKey: string, labelUpper: string): void => {
      clearHoverTimeout();
      setHoveredPlaceholderShapeKey(shapeKey);
      onPlaceholderHoverLabelChange?.(labelUpper);
    },
    [clearHoverTimeout, onPlaceholderHoverLabelChange]
  );
  const handleSvgPointerLeave = useCallback((): void => {
    clearHoverTimeout();
    setHoveredPlaceholderShapeKey(null);
    onPlaceholderHoverLabelChange?.(null);
  }, [clearHoverTimeout, onPlaceholderHoverLabelChange]);
  const model: ThumbnailModel | null = useMemo((): ThumbnailModel | null => {
    return listLayoutThumbnailShapeRects(entry);
  }, [entry]);
  if (model === null) {
    return (
      <svg
        viewBox={`0 0 ${String(FALLBACK_VIEWBOX_WIDTH)} ${String(FALLBACK_VIEWBOX_HEIGHT)}`}
        className={className}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <rect
          x={0}
          y={0}
          width={FALLBACK_VIEWBOX_WIDTH}
          height={FALLBACK_VIEWBOX_HEIGHT}
          fill="#e2e8f0"
          className="dark:fill-neutral-700"
        />
      </svg>
    );
  }
  const { slideWidth: sw, slideHeight: sh, rects } = model;
  const baseStrokeWidth: number = Math.max(0.35, Math.min(sw, sh) * 0.0045);
  const chromeActive: boolean = onPlaceholderHoverLabelChange !== undefined;
  return (
    <svg
      viewBox={`0 0 ${String(sw)} ${String(sh)}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      aria-hidden
      onPointerLeave={chromeActive ? handleSvgPointerLeave : undefined}
    >
      <rect x={0} y={0} width={sw} height={sh} fill="#f1f5f9" className="dark:fill-neutral-900" />
      {rects.map((r: LayoutThumbnailShapeRect) => {
        const fillInfo = r.solidFill;
        const useImageFallback: boolean = r.imageLike && fillInfo === null;
        const fill: string = useImageFallback
          ? IMAGE_PLACEHOLDER_FALLBACK_FILL
          : fillInfo !== null
            ? fillInfo.cssColor
            : r.placeholder
              ? "#ffffff"
              : DEFAULT_WIREFRAME_FILL;
        const fillOpacity: number = useImageFallback
          ? 1
          : fillInfo !== null
            ? fillInfo.opacity
            : DEFAULT_WIREFRAME_FILL_OPACITY;
        const isFieldHighlight: boolean =
          highlightedShapeKey !== null &&
          highlightedShapeKey.length > 0 &&
          highlightedShapeKey === r.key &&
          r.placeholder;
        const isHoverHighlight: boolean =
          chromeActive && r.placeholder && hoveredPlaceholderShapeKey === r.key;
        const isAccentStroke: boolean = isFieldHighlight || isHoverHighlight;
        const stroke: string = isAccentStroke
          ? PLACEHOLDER_HIGHLIGHT_STROKE
          : r.placeholder
            ? STROKE_PLACEHOLDER_IDLE
            : STROKE_NON_PLACEHOLDER;
        const highlightStrokeWidth: number = baseStrokeWidth * PLACEHOLDER_HIGHLIGHT_STROKE_WIDTH_FACTOR;
        const strokeWidthForShape: number = isAccentStroke ? highlightStrokeWidth : baseStrokeWidth;
        const rotateTransform: string | undefined = computeRectRotateTransform(r);
        const composedTransform: string | undefined = rotateTransform;
        const shapeRect: ReactElement = (
          <rect
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidthForShape}
            strokeOpacity={isAccentStroke ? PLACEHOLDER_HIGHLIGHT_STROKE_OPACITY : 1}
            className={useImageFallback ? 'dark:fill-[#64748b]' : undefined}
          />
        );
        if (!r.placeholder) {
          return (
            <g key={r.key} transform={composedTransform}>
              {shapeRect}
            </g>
          );
        }
        const labelUpper: string = buildPlaceholderLabelForChrome(r);
        return (
          <g key={r.key} transform={composedTransform}>
            {shapeRect}
            {chromeActive ? (
              <rect
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                fill="transparent"
                className="cursor-default"
                onPointerEnter={(): void => {
                  handlePlaceholderPointerEnter(r.key, labelUpper);
                }}
                onPointerLeave={(): void => {
                  scheduleClearHoverLabel();
                }}
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
