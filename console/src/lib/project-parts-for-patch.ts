import { generateUlid } from "./generate-ulid";
import type { GetLayoutResponse } from "../types/template-layout";

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
      const layoutId: unknown = part.layout_id;
      if (typeof layoutId !== "string") {
        throw new Error(INVALID_PART_MESSAGE);
      }
      return {
        id,
        order,
        type: "PLAIN",
        contents: { type: "PLAIN" },
        layout_id: layoutId,
      };
    }
    if (typeValue === "LYRICS") {
      return {
        id,
        order,
        type: "LYRICS",
        contents: part.contents,
        lyrics_layout_id: part.lyrics_layout_id,
        title_layout_id: part.title_layout_id ?? null,
      };
    }
    if (typeValue === "BIBLE") {
      return {
        id,
        order,
        type: "BIBLE",
        contents: part.contents,
        phrase_layout_id: part.phrase_layout_id,
        title_layout_id: part.title_layout_id ?? null,
      };
    }
    if (typeValue === "VALUE") {
      return {
        id,
        order,
        type: "VALUE",
        contents: part.contents,
        layout_id: part.layout_id,
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

type ShapeLayoutBounds = {
  layoutId: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const readShapeLayoutBounds = (shape: unknown): ShapeLayoutBounds | null => {
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
  return {
    layoutId,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
  };
};

/**
 * Union bounding box (template units) for shapes whose `layout_id` is in `layoutIds`.
 * Used to match the slide aspect implied by the template, which varies by layout.
 */
export const computeSlideBoundsPxForLayoutIds = (
  layouts: GetLayoutResponse[],
  layoutIds: string[]
): { widthPx: number; heightPx: number } | null => {
  if (layoutIds.length === 0) {
    return null;
  }
  const idSet: Set<string> = new Set(layoutIds);
  let minLeft: number = Number.POSITIVE_INFINITY;
  let minTop: number = Number.POSITIVE_INFINITY;
  let maxRight: number = Number.NEGATIVE_INFINITY;
  let maxBottom: number = Number.NEGATIVE_INFINITY;
  for (const layout of layouts) {
    for (const shape of layout.shapes) {
      const bounds: ShapeLayoutBounds | null = readShapeLayoutBounds(shape as unknown);
      if (bounds === null || !idSet.has(bounds.layoutId)) {
        continue;
      }
      minLeft = Math.min(minLeft, bounds.left);
      minTop = Math.min(minTop, bounds.top);
      maxRight = Math.max(maxRight, bounds.right);
      maxBottom = Math.max(maxBottom, bounds.bottom);
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

export const appendNewPartForPatch = (parts: unknown[], kind: PartKindForCreate, layoutId: string): unknown[] => {
  const normalized: unknown[] = normalizePartsForPatchRequest(parts);
  const order: number = normalized.length;
  const id: string = generateUlid();
  if (kind === PART_KIND_FOR_CREATE.PLAIN) {
    normalized.push({
      id,
      order,
      type: "PLAIN",
      contents: { type: "PLAIN" },
      layout_id: layoutId,
    });
    return normalized;
  }
  if (kind === PART_KIND_FOR_CREATE.VALUE) {
    normalized.push({
      id,
      order,
      type: "VALUE",
      contents: {
        type: "VALUE",
        contents: [{ placeholder_name: "value", value: null }],
      },
      layout_id: layoutId,
    });
    return normalized;
  }
  if (kind === PART_KIND_FOR_CREATE.LYRICS) {
    normalized.push({
      id,
      order,
      type: "LYRICS",
      contents: {
        type: "LYRICS",
        contents: [
          {
            title: "Slide",
            lyrics: [{ part: "Main", lyrics: "" }],
          },
        ],
      },
      lyrics_layout_id: layoutId,
      title_layout_id: null,
    });
    return normalized;
  }
  normalized.push({
    id,
    order,
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
    phrase_layout_id: layoutId,
    title_layout_id: null,
  });
  return normalized;
};
