import { createDefaultLyricsPartContentsPayload } from "./lyrics-part-contents";
import { generateUlid } from "./generate-ulid";
import type { GetLayoutResponse, TemplateSlideSizeEmu } from "../types/template-layout";

const INVALID_PART_MESSAGE: string = "This project contains a part the editor cannot send back to the server yet.";

export const PART_KIND_FOR_CREATE = {
  PLAIN: "PLAIN",
  VALUE: "VALUE",
  LYRICS: "LYRICS",
  BIBLE: "BIBLE",
} as const;

export type PartKindForCreate = (typeof PART_KIND_FOR_CREATE)[keyof typeof PART_KIND_FOR_CREATE];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const sortProjectPartsForDisplay = (parts: unknown[]): unknown[] => {
  const copy: unknown[] = [...parts];
  copy.sort((a: unknown, b: unknown): number => {
    const orderA: number = isRecord(a) && typeof a.order === "number" ? a.order : 0;
    const orderB: number = isRecord(b) && typeof b.order === "number" ? b.order : 0;
    return orderA - orderB;
  });
  return copy;
};

export const getPartTypeLabel = (part: unknown): string => {
  if (!isRecord(part)) {
    return "Part";
  }
  const typeValue: unknown = part.type;
  return typeof typeValue === "string" ? typeValue : "Part";
};

export const getProjectPartStableKey = (part: unknown, index: number): string => {
  if (!isRecord(part)) {
    return `part-${index}`;
  }
  const idValue: unknown = part.id;
  return typeof idValue === "string" && idValue.length > 0 ? idValue : `part-${index}`;
};

export const getProjectPartId = (part: unknown): string | null => {
  if (!isRecord(part)) {
    return null;
  }
  const idValue: unknown = part.id;
  return typeof idValue === "string" && idValue.length > 0 ? idValue : null;
};

export const removePartByIdForPatch = (parts: unknown[], idToRemove: string): unknown[] => {
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const remaining: unknown[] = sorted.filter((part: unknown): boolean => {
    const id: string | null = getProjectPartId(part);
    return id !== idToRemove;
  });
  return normalizePartsForPatchRequest(remaining);
};

const normalizeOptionalLayoutIdForPatch = (raw: unknown): string | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "string") {
    return raw.length > 0 ? raw : null;
  }
  throw new Error(INVALID_PART_MESSAGE);
};

export const normalizePartsForPatchRequest = (parts: unknown[]): unknown[] => {
  return parts.map((part: unknown, index: number): unknown => {
    if (!isRecord(part)) {
      throw new Error(INVALID_PART_MESSAGE);
    }
    const id: unknown = part.id;
    const typeValue: unknown = part.type;
    if (typeof id !== "string" || typeof typeValue !== "string") {
      throw new Error(INVALID_PART_MESSAGE);
    }
    const order: number = index;
    if (typeValue === "PLAIN") {
      const layoutId: string | null = normalizeOptionalLayoutIdForPatch(part.layout_id);
      return {
        id,
        order,
        type: "PLAIN",
        contents: { type: "PLAIN" },
        layout_id: layoutId,
      };
    }
    if (typeValue === "LYRICS") {
      const lyricsLayoutId: string | null = normalizeOptionalLayoutIdForPatch(part.lyrics_layout_id);
      const titleLayoutId: string | null = normalizeOptionalLayoutIdForPatch(part.title_layout_id);
      return {
        id,
        order,
        type: "LYRICS",
        contents: part.contents,
        lyrics_layout_id: lyricsLayoutId,
        title_layout_id: titleLayoutId,
      };
    }
    if (typeValue === "BIBLE") {
      const phraseLayoutId: string | null = normalizeOptionalLayoutIdForPatch(part.phrase_layout_id);
      const titleLayoutIdBible: string | null = normalizeOptionalLayoutIdForPatch(part.title_layout_id);
      return {
        id,
        order,
        type: "BIBLE",
        contents: part.contents,
        phrase_layout_id: phraseLayoutId,
        title_layout_id: titleLayoutIdBible,
      };
    }
    if (typeValue === "VALUE") {
      const layoutId: string | null = normalizeOptionalLayoutIdForPatch(part.layout_id);
      return {
        id,
        order,
        type: "VALUE",
        contents: part.contents,
        layout_id: layoutId,
      };
    }
    throw new Error(INVALID_PART_MESSAGE);
  });
};

/** Layout ids on a part that define the slide geometry for canvas preview. */
export const extractLayoutIdsForCanvasPreview = (part: unknown): string[] => {
  if (!isRecord(part)) {
    return [];
  }
  const typeValue: unknown = part.type;
  if (typeValue === "PLAIN" || typeValue === "VALUE") {
    const layoutId: unknown = part.layout_id;
    return typeof layoutId === "string" && layoutId.length > 0 ? [layoutId] : [];
  }
  if (typeValue === "LYRICS") {
    const lyricsLayoutId: unknown = part.lyrics_layout_id;
    const titleLayoutId: unknown = part.title_layout_id;
    const ids: string[] = [];
    if (typeof lyricsLayoutId === "string" && lyricsLayoutId.length > 0) {
      ids.push(lyricsLayoutId);
    }
    if (typeof titleLayoutId === "string" && titleLayoutId.length > 0) {
      ids.push(titleLayoutId);
    }
    return ids;
  }
  if (typeValue === "BIBLE") {
    const phraseLayoutId: unknown = part.phrase_layout_id;
    const titleLayoutId: unknown = part.title_layout_id;
    const ids: string[] = [];
    if (typeof phraseLayoutId === "string" && phraseLayoutId.length > 0) {
      ids.push(phraseLayoutId);
    }
    if (typeof titleLayoutId === "string" && titleLayoutId.length > 0) {
      ids.push(titleLayoutId);
    }
    return ids;
  }
  return [];
};

/** Unrotated box plus rotation in degrees (python-pptx / server). */
type ShapeLayoutGeometry = {
  layoutId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotationDeg: number;
};

const readShapeLayoutGeometry = (shape: unknown): ShapeLayoutGeometry | null => {
  if (!isRecord(shape)) {
    return null;
  }
  const layoutId: unknown = shape.layout_id;
  const size: unknown = shape.size;
  const position: unknown = shape.position;
  if (typeof layoutId !== "string" || layoutId.length === 0 || !isRecord(size) || !isRecord(position)) {
    return null;
  }
  const width: unknown = size.width;
  const height: unknown = size.height;
  const x: unknown = position.x;
  const y: unknown = position.y;
  const rotationRaw: unknown = position.rotation;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  const rotationDeg: number = typeof rotationRaw === "number" && Number.isFinite(rotationRaw) ? rotationRaw : 0;
  return {
    layoutId,
    left: x,
    top: y,
    width,
    height,
    rotationDeg,
  };
};

/** Axis-aligned bounds of a rectangle after rotating around its center (degrees). */
const axisAlignedBoundsForRotatedRect = (
  left: number,
  top: number,
  width: number,
  height: number,
  rotationDeg: number
): { minLeft: number; minTop: number; maxRight: number; maxBottom: number } => {
  const cx: number = left + width / 2;
  const cy: number = top + height / 2;
  const rad: number = (rotationDeg * Math.PI) / 180;
  const cos: number = Math.cos(rad);
  const sin: number = Math.sin(rad);
  const corners: { x: number; y: number }[] = [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
  let minLeft: number = Number.POSITIVE_INFINITY;
  let minTop: number = Number.POSITIVE_INFINITY;
  let maxRight: number = Number.NEGATIVE_INFINITY;
  let maxBottom: number = Number.NEGATIVE_INFINITY;
  for (const p of corners) {
    const dx: number = p.x - cx;
    const dy: number = p.y - cy;
    const rx: number = cx + dx * cos - dy * sin;
    const ry: number = cy + dx * sin + dy * cos;
    minLeft = Math.min(minLeft, rx);
    minTop = Math.min(minTop, ry);
    maxRight = Math.max(maxRight, rx);
    maxBottom = Math.max(maxBottom, ry);
  }
  return { minLeft, minTop, maxRight, maxBottom };
};

const readSlideSizeEmuFromLayoutEntry = (entry: GetLayoutResponse): TemplateSlideSizeEmu | null => {
  const sz: TemplateSlideSizeEmu = entry.slide_size;
  if (
    typeof sz.width !== "number" ||
    typeof sz.height !== "number" ||
    !Number.isFinite(sz.width) ||
    !Number.isFinite(sz.height) ||
    sz.width <= 0 ||
    sz.height <= 0
  ) {
    return null;
  }
  return { width: sz.width, height: sz.height };
};

/**
 * Slide size for preview: prefers `slide_size` from the template (EMU), same as PowerPoint slide,
 * when a matching layout entry is present; otherwise unions shape bounds (legacy).
 */
export const computeSlideBoundsPxForLayoutIds = (
  layouts: GetLayoutResponse[],
  layoutIds: string[]
): { widthPx: number; heightPx: number } | null => {
  if (layoutIds.length === 0) {
    return null;
  }
  const idSet: Set<string> = new Set(layoutIds);
  for (const entry of layouts) {
    const slide: TemplateSlideSizeEmu | null = readSlideSizeEmuFromLayoutEntry(entry);
    if (slide === null) {
      continue;
    }
    let touchesRequestedLayout: boolean = false;
    for (const shape of entry.shapes) {
      const g: ShapeLayoutGeometry | null = readShapeLayoutGeometry(shape as unknown);
      if (g !== null && idSet.has(g.layoutId)) {
        touchesRequestedLayout = true;
        break;
      }
    }
    if (touchesRequestedLayout) {
      return { widthPx: slide.width, heightPx: slide.height };
    }
  }
  let minLeft: number = Number.POSITIVE_INFINITY;
  let minTop: number = Number.POSITIVE_INFINITY;
  let maxRight: number = Number.NEGATIVE_INFINITY;
  let maxBottom: number = Number.NEGATIVE_INFINITY;
  for (const layout of layouts) {
    for (const shape of layout.shapes) {
      const g: ShapeLayoutGeometry | null = readShapeLayoutGeometry(shape as unknown);
      if (g === null || !idSet.has(g.layoutId)) {
        continue;
      }
      const bb: { minLeft: number; minTop: number; maxRight: number; maxBottom: number } =
        axisAlignedBoundsForRotatedRect(g.left, g.top, g.width, g.height, g.rotationDeg);
      minLeft = Math.min(minLeft, bb.minLeft);
      minTop = Math.min(minTop, bb.minTop);
      maxRight = Math.max(maxRight, bb.maxRight);
      maxBottom = Math.max(maxBottom, bb.maxBottom);
    }
  }
  if (
    !Number.isFinite(minLeft) ||
    !Number.isFinite(minTop) ||
    !Number.isFinite(maxRight) ||
    !Number.isFinite(maxBottom) ||
    maxRight <= minLeft ||
    maxBottom <= minTop
  ) {
    return null;
  }
  const widthPx: number = maxRight - minLeft;
  const heightPx: number = maxBottom - minTop;
  return { widthPx, heightPx };
};

export type SlideBoundsWithOrigin = {
  minLeft: number;
  minTop: number;
  widthPx: number;
  heightPx: number;
};

/**
 * Slide bounds for one layout entry: union of every shape that exposes geometry,
 * in the same coordinate space used for thumbnails and previews.
 */
export const computeSlideBoundsWithOriginForLayoutEntry = (entry: GetLayoutResponse): SlideBoundsWithOrigin | null => {
  let minLeft: number = Number.POSITIVE_INFINITY;
  let minTop: number = Number.POSITIVE_INFINITY;
  let maxRight: number = Number.NEGATIVE_INFINITY;
  let maxBottom: number = Number.NEGATIVE_INFINITY;
  for (const shape of entry.shapes) {
    const g: ShapeLayoutGeometry | null = readShapeLayoutGeometry(shape as unknown);
    if (g === null) {
      continue;
    }
    const bb: { minLeft: number; minTop: number; maxRight: number; maxBottom: number } =
      axisAlignedBoundsForRotatedRect(g.left, g.top, g.width, g.height, g.rotationDeg);
    minLeft = Math.min(minLeft, bb.minLeft);
    minTop = Math.min(minTop, bb.minTop);
    maxRight = Math.max(maxRight, bb.maxRight);
    maxBottom = Math.max(maxBottom, bb.maxBottom);
  }
  if (
    !Number.isFinite(minLeft) ||
    !Number.isFinite(minTop) ||
    !Number.isFinite(maxRight) ||
    !Number.isFinite(maxBottom) ||
    maxRight <= minLeft ||
    maxBottom <= minTop
  ) {
    return null;
  }
  const widthPx: number = maxRight - minLeft;
  const heightPx: number = maxBottom - minTop;
  return { minLeft, minTop, widthPx, heightPx };
};

const readSolidFillFromColorConfigUnknown = (fillColor: unknown): { cssColor: string; opacity: number } | null => {
  if (!isRecord(fillColor)) {
    return null;
  }
  const colorType: unknown = fillColor.color_type;
  if (colorType !== "solid") {
    return null;
  }
  const color: unknown = fillColor.color;
  if (typeof color !== "string" || color.length === 0) {
    return null;
  }
  const cssColor: string = color.startsWith("#") || color.startsWith("rgb") ? color : `#${color}`;
  const alphaRaw: unknown = fillColor.alpha;
  const opacity: number =
    typeof alphaRaw === "number" && Number.isFinite(alphaRaw) ? Math.min(1, Math.max(0, alphaRaw)) : 1;
  return { cssColor, opacity };
};

const readSolidFillFromShape = (shape: unknown): { cssColor: string; opacity: number } | null => {
  if (!isRecord(shape)) {
    return null;
  }
  return readSolidFillFromColorConfigUnknown(shape.fill_color);
};

/** Slide / layout background as a solid RGB fill for thumbnails (matches PPT slide background when solid). */
export const readSlideBackgroundSolidFillFromLayoutEntry = (
  entry: GetLayoutResponse
): { cssColor: string; opacity: number } | null => {
  return readSolidFillFromColorConfigUnknown(entry.background_color);
};

const readShapePlaceholderFlag = (shape: unknown): boolean => {
  if (!isRecord(shape)) {
    return false;
  }
  return shape.placeholder === true;
};

const readShapeTypeIsImage = (shape: unknown): boolean => {
  if (!isRecord(shape)) {
    return false;
  }
  return shape.type === "IMAGE";
};

export type LayoutThumbnailShapeRect = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  solidFill: { cssColor: string; opacity: number } | null;
  placeholder: boolean;
  imageLike: boolean;
  /** Raw placeholder name from layout (may match other shapes). */
  placeholderLabel: string | null;
  /** Unique label for tags when several shapes share the same name; null when not a placeholder. */
  placeholderTagLabel: string | null;
};

export type PlaceholderLabelRow = {
  shapeKey: string;
  baseLabel: string;
};

/** When several placeholders share the same base name, suffixes (1), (2), … keep labels distinct. */
export const buildDisambiguatedPlaceholderLabelsByShapeKey = (rows: PlaceholderLabelRow[]): Map<string, string> => {
  const counts: Map<string, number> = new Map();
  for (const row of rows) {
    const prev: number = counts.get(row.baseLabel) ?? 0;
    counts.set(row.baseLabel, prev + 1);
  }
  const running: Map<string, number> = new Map();
  const out: Map<string, string> = new Map();
  for (const row of rows) {
    const total: number = counts.get(row.baseLabel) ?? 1;
    let label: string = row.baseLabel;
    if (total > 1) {
      const n: number = (running.get(row.baseLabel) ?? 0) + 1;
      running.set(row.baseLabel, n);
      label = `${row.baseLabel} (${String(n)})`;
    }
    out.set(row.shapeKey, label);
  }
  return out;
};

/** Stable rect key for thumbnails; must match {@link listLayoutPlaceholderDescriptors}. */
export const getLayoutShapeThumbnailKey = (shapeUnknown: unknown, geometryIndex: number): string => {
  if (isRecord(shapeUnknown) && typeof shapeUnknown.shape_id === "number") {
    return `shape-${String(shapeUnknown.shape_id)}`;
  }
  return `shape-${String(geometryIndex)}`;
};

export type LayoutPlaceholderDescriptor = {
  shapeKey: string;
  placeholderName: string;
  shapeId: number | null;
};

export const readShapePlaceholderNameForValuePart = (shape: unknown): string | null => {
  if (!isRecord(shape) || !readShapePlaceholderFlag(shape)) {
    return null;
  }
  const rawName: unknown = shape.name;
  if (typeof rawName === "string") {
    const trimmed: string = rawName.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  const shapeIdRaw: unknown = shape.shape_id;
  if (typeof shapeIdRaw === "number" && Number.isFinite(shapeIdRaw)) {
    return `shape-${String(shapeIdRaw)}`;
  }
  return null;
};

export const listLayoutPlaceholderDescriptors = (entry: GetLayoutResponse): LayoutPlaceholderDescriptor[] => {
  const out: LayoutPlaceholderDescriptor[] = [];
  let geometryIndex: number = 0;
  for (const shape of entry.shapes) {
    const shapeUnknown: unknown = shape;
    const g: ShapeLayoutGeometry | null = readShapeLayoutGeometry(shapeUnknown);
    if (g === null) {
      continue;
    }
    if (g.width <= 0 || g.height <= 0) {
      continue;
    }
    const shapeKey: string = getLayoutShapeThumbnailKey(shapeUnknown, geometryIndex);
    geometryIndex += 1;
    if (!readShapePlaceholderFlag(shapeUnknown)) {
      continue;
    }
    const placeholderName: string | null = readShapePlaceholderNameForValuePart(shapeUnknown);
    if (placeholderName === null) {
      continue;
    }
    let shapeId: number | null = null;
    if (isRecord(shapeUnknown) && typeof shapeUnknown.shape_id === "number") {
      shapeId = shapeUnknown.shape_id;
    }
    out.push({ shapeKey, placeholderName, shapeId });
  }
  return out;
};

export const readValueContentsPlaceholderValueMap = (contentsUnknown: unknown): Map<string, string> => {
  const map: Map<string, string> = new Map();
  if (!isRecord(contentsUnknown) || contentsUnknown.type !== "VALUE") {
    return map;
  }
  const items: unknown = contentsUnknown.contents;
  if (!Array.isArray(items)) {
    return map;
  }
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }
    const nameRaw: unknown = item.placeholder_name;
    const valRaw: unknown = item.value;
    if (typeof nameRaw !== "string" || nameRaw.length === 0) {
      continue;
    }
    map.set(nameRaw, typeof valRaw === "string" ? valRaw : "");
  }
  return map;
};

export const readValuePartPlaceholderValueMap = (part: unknown): Map<string, string> => {
  if (!isRecord(part) || part.type !== "VALUE") {
    return new Map();
  }
  return readValueContentsPlaceholderValueMap(part.contents);
};

export const buildValuePartPlaceholderEditRows = (
  layoutEntry: GetLayoutResponse,
  part: unknown
): { shapeKey: string; placeholderName: string; displayLabel: string; value: string }[] => {
  const valueMap: Map<string, string> = readValuePartPlaceholderValueMap(part);
  const descriptors: LayoutPlaceholderDescriptor[] = listLayoutPlaceholderDescriptors(layoutEntry);
  const labelByKey: Map<string, string> = buildDisambiguatedPlaceholderLabelsByShapeKey(
    descriptors.map(
      (d: LayoutPlaceholderDescriptor): PlaceholderLabelRow => ({
        shapeKey: d.shapeKey,
        baseLabel: d.placeholderName,
      })
    )
  );
  return descriptors.map(
    (
      d: LayoutPlaceholderDescriptor
    ): {
      shapeKey: string;
      placeholderName: string;
      displayLabel: string;
      value: string;
    } => ({
      shapeKey: d.shapeKey,
      placeholderName: d.placeholderName,
      displayLabel: labelByKey.get(d.shapeKey) ?? d.placeholderName,
      value: valueMap.get(d.placeholderName) ?? "",
    })
  );
};

export const mergeValueContentsWithLayout = (
  layoutEntry: GetLayoutResponse,
  existingContentsUnknown: unknown
): { type: "VALUE"; contents: { placeholder_name: string; value: string | null }[] } => {
  const valueMap: Map<string, string> = readValueContentsPlaceholderValueMap(existingContentsUnknown);
  const contents: { placeholder_name: string; value: string | null }[] = listLayoutPlaceholderDescriptors(
    layoutEntry
  ).map((d: LayoutPlaceholderDescriptor): { placeholder_name: string; value: string | null } => {
    const raw: string = valueMap.get(d.placeholderName) ?? "";
    const trimmed: string = raw.trim();
    return {
      placeholder_name: d.placeholderName,
      value: trimmed.length === 0 ? null : trimmed,
    };
  });
  return { type: "VALUE", contents };
};

export const buildValuePartContentsPayloadFromFieldRows = (
  layoutEntry: GetLayoutResponse,
  rows: { placeholderName: string; value: string }[]
): { type: "VALUE"; contents: { placeholder_name: string; value: string | null }[] } => {
  const valueByName: Map<string, string> = new Map(
    rows.map((r: { placeholderName: string; value: string }): [string, string] => [r.placeholderName, r.value])
  );
  const contents: { placeholder_name: string; value: string | null }[] = listLayoutPlaceholderDescriptors(
    layoutEntry
  ).map((d: LayoutPlaceholderDescriptor): { placeholder_name: string; value: string | null } => {
    const raw: string = valueByName.get(d.placeholderName) ?? "";
    const trimmed: string = raw.trim();
    return {
      placeholder_name: d.placeholderName,
      value: trimmed.length === 0 ? null : trimmed,
    };
  });
  return { type: "VALUE", contents };
};

export const listLayoutThumbnailShapeRects = (
  entry: GetLayoutResponse
): { slideWidth: number; slideHeight: number; rects: LayoutThumbnailShapeRect[] } | null => {
  const slideFromTemplate: TemplateSlideSizeEmu | null = readSlideSizeEmuFromLayoutEntry(entry);
  const originFallback: SlideBoundsWithOrigin | null =
    slideFromTemplate === null ? computeSlideBoundsWithOriginForLayoutEntry(entry) : null;
  if (slideFromTemplate === null && originFallback === null) {
    return null;
  }
  let slideW: number;
  let slideH: number;
  let minLeft: number;
  let minTop: number;
  if (slideFromTemplate !== null) {
    slideW = slideFromTemplate.width;
    slideH = slideFromTemplate.height;
    minLeft = 0;
    minTop = 0;
  } else {
    if (originFallback === null) {
      return null;
    }
    slideW = originFallback.widthPx;
    slideH = originFallback.heightPx;
    minLeft = originFallback.minLeft;
    minTop = originFallback.minTop;
  }
  const rects: LayoutThumbnailShapeRect[] = [];
  let index: number = 0;
  for (const shape of entry.shapes) {
    const shapeUnknown: unknown = shape;
    const g: ShapeLayoutGeometry | null = readShapeLayoutGeometry(shapeUnknown);
    if (g === null) {
      continue;
    }
    const x: number = g.left - minLeft;
    const y: number = g.top - minTop;
    const width: number = g.width;
    const height: number = g.height;
    if (width <= 0 || height <= 0) {
      continue;
    }
    const key: string = getLayoutShapeThumbnailKey(shapeUnknown, index);
    rects.push({
      key,
      x,
      y,
      width,
      height,
      rotationDeg: g.rotationDeg,
      solidFill: readSolidFillFromShape(shapeUnknown),
      placeholder: readShapePlaceholderFlag(shapeUnknown),
      imageLike: readShapeTypeIsImage(shapeUnknown),
      placeholderLabel: readShapePlaceholderNameForValuePart(shapeUnknown),
      placeholderTagLabel: null,
    });
    index += 1;
  }
  if (rects.length === 0) {
    return null;
  }
  const labelRows: PlaceholderLabelRow[] = rects
    .filter((r: LayoutThumbnailShapeRect): boolean => r.placeholder)
    .map(
      (r: LayoutThumbnailShapeRect): PlaceholderLabelRow => ({
        shapeKey: r.key,
        baseLabel: r.placeholderLabel ?? r.key,
      })
    );
  const tagLabelByKey: Map<string, string> = buildDisambiguatedPlaceholderLabelsByShapeKey(labelRows);
  const rectsWithTagLabels: LayoutThumbnailShapeRect[] = rects.map(
    (r: LayoutThumbnailShapeRect): LayoutThumbnailShapeRect => {
      if (!r.placeholder) {
        return { ...r, placeholderTagLabel: null };
      }
      return {
        ...r,
        placeholderTagLabel: tagLabelByKey.get(r.key) ?? r.placeholderLabel ?? r.key,
      };
    }
  );
  return { slideWidth: slideW, slideHeight: slideH, rects: rectsWithTagLabels };
};

export const findTemplateLayoutEntryByLayoutId = (
  layouts: GetLayoutResponse[],
  layoutId: string
): GetLayoutResponse | null => {
  if (layoutId.length === 0) {
    return null;
  }
  for (const entry of layouts) {
    for (const shape of entry.shapes) {
      if (shape.layout_id === layoutId) {
        return entry;
      }
    }
  }
  return null;
};

export const layoutEntryHasPlaceholderShape = (entry: GetLayoutResponse): boolean => {
  for (const shape of entry.shapes) {
    if (readShapePlaceholderFlag(shape as unknown)) {
      return true;
    }
  }
  return false;
};

export type PlainValueLayoutReconcileResult = {
  part: unknown;
  didChange: boolean;
  notice: string | null;
};

export const reconcilePlainOrValuePartWithLayoutEntry = (
  part: unknown,
  layoutEntry: GetLayoutResponse
): PlainValueLayoutReconcileResult => {
  if (!isRecord(part)) {
    return { part, didChange: false, notice: null };
  }
  const typeValue: unknown = part.type;
  const idValue: unknown = part.id;
  const layoutIdValue: unknown = part.layout_id;
  if (typeof idValue !== "string" || typeof layoutIdValue !== "string") {
    return { part, didChange: false, notice: null };
  }
  const hasPlaceholder: boolean = layoutEntryHasPlaceholderShape(layoutEntry);
  if (typeValue === "VALUE") {
    if (hasPlaceholder) {
      const mergedContents: { type: "VALUE"; contents: { placeholder_name: string; value: string | null }[] } =
        mergeValueContentsWithLayout(layoutEntry, part.contents);
      const contentsUnchanged: boolean = JSON.stringify(part.contents) === JSON.stringify(mergedContents);
      if (contentsUnchanged) {
        return { part, didChange: false, notice: null };
      }
      return {
        part: {
          ...part,
          contents: mergedContents,
        },
        didChange: true,
        notice: null,
      };
    }
    return {
      part: {
        id: idValue,
        type: "PLAIN",
        contents: { type: "PLAIN" },
        layout_id: layoutIdValue,
      },
      didChange: true,
      notice: null,
    };
  }
  if (typeValue === "PLAIN") {
    if (!hasPlaceholder) {
      return { part, didChange: false, notice: null };
    }
    return {
      part: {
        id: idValue,
        type: "VALUE",
        contents: {
          type: "VALUE",
          contents: [{ placeholder_name: "value", value: null }],
        },
        layout_id: layoutIdValue,
      },
      didChange: true,
      notice: null,
    };
  }
  return { part, didChange: false, notice: null };
};

/**
 * After a layout id change, align Plain vs Value with whether the target layout defines placeholders.
 */
export const applyPlainValueLayoutReconcileToNormalizedParts = (
  parts: unknown[],
  partId: string,
  layoutEntry: GetLayoutResponse | null
): { parts: unknown[]; notice: string | null } => {
  if (layoutEntry === null) {
    return { parts, notice: null };
  }
  let notice: string | null = null;
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const mapped: unknown[] = sorted.map((p: unknown): unknown => {
    const id: string | null = getProjectPartId(p);
    if (id !== partId || !isRecord(p)) {
      return p;
    }
    const typeValue: unknown = p.type;
    if (typeValue !== "PLAIN" && typeValue !== "VALUE") {
      return p;
    }
    const result: PlainValueLayoutReconcileResult = reconcilePlainOrValuePartWithLayoutEntry(p, layoutEntry);
    if (result.notice !== null) {
      notice = result.notice;
    }
    return result.part;
  });
  return { parts: normalizePartsForPatchRequest(mapped), notice };
};

export type PlainValueExplicitTarget = "PLAIN" | "VALUE";

export const PART_CANNOT_VALUE_WITHOUT_PLACEHOLDER_MESSAGE: string =
  "This layout has no placeholders. Only Plain is available until you pick a layout with placeholders.";

export const applyExplicitPlainValueTargetAtSortedIndex = (
  parts: unknown[],
  sortedIndex: number,
  target: PlainValueExplicitTarget,
  layoutEntry: GetLayoutResponse | null
): { parts: unknown[]; infoNotice: string | null } => {
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const part: unknown | undefined = sorted[sortedIndex];
  if (part === undefined || !isRecord(part)) {
    return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
  }
  const typeValue: unknown = part.type;
  if (typeValue !== "PLAIN" && typeValue !== "VALUE") {
    return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
  }
  const idValue: unknown = part.id;
  const layoutIdValue: unknown = part.layout_id;
  if (typeof idValue !== "string" || typeof layoutIdValue !== "string") {
    return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
  }
  if (target === "PLAIN") {
    if (typeValue === "PLAIN") {
      return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
    }
    const next: unknown[] = [...sorted];
    next[sortedIndex] = {
      id: idValue,
      type: "PLAIN",
      contents: { type: "PLAIN" },
      layout_id: layoutIdValue,
    };
    return {
      parts: normalizePartsForPatchRequest(next),
      infoNotice: null,
    };
  }
  if (typeValue === "VALUE") {
    return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
  }
  if (layoutEntry === null || !layoutEntryHasPlaceholderShape(layoutEntry)) {
    return {
      parts: normalizePartsForPatchRequest(sorted),
      infoNotice: PART_CANNOT_VALUE_WITHOUT_PLACEHOLDER_MESSAGE,
    };
  }
  const next: unknown[] = [...sorted];
  next[sortedIndex] = {
    id: idValue,
    type: "VALUE",
    contents: {
      type: "VALUE",
      contents: [{ placeholder_name: "value", value: null }],
    },
    layout_id: layoutIdValue,
  };
  return {
    parts: normalizePartsForPatchRequest(next),
    infoNotice: null,
  };
};

/**
 * Replace a part at display order index with a new kind, keeping the same part id and primary template layout id.
 */
export const replacePartKindAtSortedIndex = (
  parts: unknown[],
  sortedIndex: number,
  kind: PartKindForCreate,
  primaryLayoutId: string | null
): { parts: unknown[]; infoNotice: string | null } => {
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const part: unknown | undefined = sorted[sortedIndex];
  if (part === undefined || !isRecord(part)) {
    return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
  }
  const idValue: unknown = part.id;
  if (typeof idValue !== "string" || idValue.length === 0) {
    return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
  }
  const currentType: unknown = part.type;
  if (currentType === kind) {
    return { parts: normalizePartsForPatchRequest(sorted), infoNotice: null };
  }
  if (kind === PART_KIND_FOR_CREATE.PLAIN) {
    const next: unknown[] = [...sorted];
    next[sortedIndex] = {
      id: idValue,
      type: "PLAIN",
      contents: { type: "PLAIN" },
      layout_id: primaryLayoutId,
    };
    return { parts: normalizePartsForPatchRequest(next), infoNotice: null };
  }
  if (kind === PART_KIND_FOR_CREATE.VALUE) {
    const next: unknown[] = [...sorted];
    next[sortedIndex] = {
      id: idValue,
      type: "VALUE",
      contents: {
        type: "VALUE",
        contents: [{ placeholder_name: "value", value: null }],
      },
      layout_id: primaryLayoutId,
    };
    return { parts: normalizePartsForPatchRequest(next), infoNotice: null };
  }
  const lyricsOrBiblePrimaryLayoutId: string | null =
    primaryLayoutId !== null && primaryLayoutId.length > 0 ? primaryLayoutId : null;
  if (kind === PART_KIND_FOR_CREATE.LYRICS) {
    const next: unknown[] = [...sorted];
    next[sortedIndex] = {
      id: idValue,
      type: "LYRICS",
      contents: createDefaultLyricsPartContentsPayload(),
      lyrics_layout_id: lyricsOrBiblePrimaryLayoutId,
      title_layout_id: null,
    };
    return { parts: normalizePartsForPatchRequest(next), infoNotice: null };
  }
  const next: unknown[] = [...sorted];
  next[sortedIndex] = {
    id: idValue,
    type: "BIBLE",
    contents: {
      type: "BIBLE",
      contents: [
        {
          start: { version: "NIV", book: "John", chapter: 3, verse: 16 },
          end: null,
        },
      ],
    },
    phrase_layout_id: lyricsOrBiblePrimaryLayoutId,
    title_layout_id: null,
  };
  return { parts: normalizePartsForPatchRequest(next), infoNotice: null };
};

export const moveSortedPartToSortedIndex = (
  parts: unknown[],
  fromSortedIndex: number,
  toSortedIndex: number
): unknown[] => {
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const len: number = sorted.length;
  if (len === 0) {
    return normalizePartsForPatchRequest(sorted);
  }
  if (fromSortedIndex < 0 || fromSortedIndex >= len) {
    return normalizePartsForPatchRequest(sorted);
  }
  const clampedTo: number = Math.max(0, Math.min(Math.floor(toSortedIndex), len - 1));
  if (fromSortedIndex === clampedTo) {
    return normalizePartsForPatchRequest(sorted);
  }
  const next: unknown[] = [...sorted];
  const removedSlice: unknown[] = next.splice(fromSortedIndex, 1);
  const moved: unknown | undefined = removedSlice[0];
  if (moved === undefined) {
    return normalizePartsForPatchRequest(sorted);
  }
  next.splice(clampedTo, 0, moved);
  return normalizePartsForPatchRequest(next);
};

export const insertClonedLyricsPartBeforeSortedIndex = (
  parts: unknown[],
  sourceLyricsPartId: string,
  insertBeforeSortedIndex: number
): unknown[] => {
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const source: unknown | undefined = sorted.find((p: unknown): boolean => getProjectPartId(p) === sourceLyricsPartId);
  if (source === undefined) {
    return normalizePartsForPatchRequest(sorted);
  }
  if (!isRecord(source) || source.type !== PART_KIND_FOR_CREATE.LYRICS) {
    return normalizePartsForPatchRequest(sorted);
  }
  const newId: string = generateUlid();
  let cloned: unknown;
  try {
    cloned = JSON.parse(JSON.stringify(source)) as unknown;
  } catch {
    return normalizePartsForPatchRequest(sorted);
  }
  if (!isRecord(cloned)) {
    return normalizePartsForPatchRequest(sorted);
  }
  cloned.id = newId;
  const insertAt: number = Math.max(0, Math.min(Math.floor(insertBeforeSortedIndex), sorted.length));
  const next: unknown[] = [...sorted];
  next.splice(insertAt, 0, cloned);
  return normalizePartsForPatchRequest(next);
};

/**
 * Display-order index where a new part is inserted (0 = first / only slot when there are no parts yet).
 */
export const clampSortedInsertIndexForNewPart = (
  sortedParts: unknown[],
  insertBeforeSortedIndex: number | undefined
): number => {
  const maxInsert: number = sortedParts.length;
  const rawInsert: number = insertBeforeSortedIndex === undefined ? maxInsert : insertBeforeSortedIndex;
  return Math.max(0, Math.min(Math.floor(rawInsert), maxInsert));
};

export const appendNewPartForPatch = (
  parts: unknown[],
  kind: PartKindForCreate,
  primaryLayoutId: string | null,
  insertBeforeSortedIndex?: number
): unknown[] => {
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const insertAt: number = clampSortedInsertIndexForNewPart(sorted, insertBeforeSortedIndex);
  const id: string = generateUlid();
  const lyricsOrBiblePrimaryLayoutId: string | null =
    primaryLayoutId !== null && primaryLayoutId.length > 0 ? primaryLayoutId : null;
  let newPart: unknown;
  if (kind === PART_KIND_FOR_CREATE.PLAIN) {
    newPart = {
      id,
      type: "PLAIN",
      contents: { type: "PLAIN" },
      layout_id: primaryLayoutId,
    };
  } else if (kind === PART_KIND_FOR_CREATE.VALUE) {
    newPart = {
      id,
      type: "VALUE",
      contents: {
        type: "VALUE",
        contents: [{ placeholder_name: "value", value: null }],
      },
      layout_id: primaryLayoutId,
    };
  } else if (kind === PART_KIND_FOR_CREATE.LYRICS) {
    newPart = {
      id,
      type: "LYRICS",
      contents: createDefaultLyricsPartContentsPayload(),
      lyrics_layout_id: lyricsOrBiblePrimaryLayoutId,
      title_layout_id: null,
    };
  } else {
    newPart = {
      id,
      type: "BIBLE",
      contents: {
        type: "BIBLE",
        contents: [
          {
            start: { version: "NIV", book: "John", chapter: 3, verse: 16 },
            end: null,
          },
        ],
      },
      phrase_layout_id: lyricsOrBiblePrimaryLayoutId,
      title_layout_id: null,
    };
  }
  const next: unknown[] = [...sorted];
  next.splice(insertAt, 0, newPart);
  return normalizePartsForPatchRequest(next);
};

export type TemplateLayoutChoice = {
  layoutId: string;
  label: string;
  entry: GetLayoutResponse;
};

const pickRepresentativeLayoutIdFromEntry = (entry: GetLayoutResponse): string | null => {
  const firstShape = entry.shapes[0];
  if (firstShape !== undefined && firstShape.layout_id.length > 0) {
    return firstShape.layout_id;
  }
  return null;
};

export const listTemplateLayoutChoices = (layouts: GetLayoutResponse[]): TemplateLayoutChoice[] => {
  const choices: TemplateLayoutChoice[] = [];
  for (const entry of layouts) {
    const layoutId: string | null = pickRepresentativeLayoutIdFromEntry(entry);
    if (layoutId === null) {
      continue;
    }
    const label: string = entry.name.length > 0 ? entry.name : "Layout";
    choices.push({ layoutId, label, entry });
  }
  const seen: Set<string> = new Set();
  const deduped: TemplateLayoutChoice[] = [];
  for (const choice of choices) {
    if (seen.has(choice.layoutId)) {
      continue;
    }
    seen.add(choice.layoutId);
    deduped.push(choice);
  }
  return deduped;
};

export const getPrimaryLayoutIdFromPart = (part: unknown): string | null => {
  if (!isRecord(part)) {
    return null;
  }
  const typeValue: unknown = part.type;
  if (typeValue === "PLAIN" || typeValue === "VALUE") {
    const layoutId: unknown = part.layout_id;
    return typeof layoutId === "string" && layoutId.length > 0 ? layoutId : null;
  }
  if (typeValue === "LYRICS") {
    const lyricsLayoutId: unknown = part.lyrics_layout_id;
    return typeof lyricsLayoutId === "string" && lyricsLayoutId.length > 0 ? lyricsLayoutId : null;
  }
  if (typeValue === "BIBLE") {
    const phraseLayoutId: unknown = part.phrase_layout_id;
    return typeof phraseLayoutId === "string" && phraseLayoutId.length > 0 ? phraseLayoutId : null;
  }
  return null;
};

export const partSupportsPrimaryTemplateLayoutEdit = (part: unknown): boolean => {
  if (!isRecord(part)) {
    return false;
  }
  const typeValue: unknown = part.type;
  return typeValue === "PLAIN" || typeValue === "VALUE" || typeValue === "LYRICS" || typeValue === "BIBLE";
};

export const getPrimaryTemplateLayoutFieldLabel = (part: unknown): string => {
  if (!isRecord(part)) {
    return "Slide layout";
  }
  const typeValue: unknown = part.type;
  if (typeValue === "LYRICS") {
    return "Lyrics slide layout";
  }
  if (typeValue === "BIBLE") {
    return "Phrase slide layout";
  }
  if (typeValue === "VALUE") {
    return "Slide layout (value placeholders)";
  }
  if (typeValue === "PLAIN") {
    return "Slide layout (fixed content)";
  }
  return "Slide layout";
};

export const replacePartPrimaryTemplateLayoutId = (
  parts: unknown[],
  partId: string,
  newLayoutId: string
): unknown[] => {
  const sorted: unknown[] = sortProjectPartsForDisplay(parts);
  const next: unknown[] = sorted.map((part: unknown): unknown => {
    const id: string | null = getProjectPartId(part);
    if (id !== partId || !isRecord(part)) {
      return part;
    }
    const typeValue: unknown = part.type;
    if (typeValue === "PLAIN" || typeValue === "VALUE") {
      return { ...part, layout_id: newLayoutId };
    }
    if (typeValue === "LYRICS") {
      return { ...part, lyrics_layout_id: newLayoutId };
    }
    if (typeValue === "BIBLE") {
      return { ...part, phrase_layout_id: newLayoutId };
    }
    return part;
  });
  return normalizePartsForPatchRequest(next);
};
