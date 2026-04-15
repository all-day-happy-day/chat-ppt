import { SIGN_IN_REQUIRED_MESSAGE } from "../lib/auth-errors";
import { getApiBaseUrl } from "../lib/api-base";
import { readFetchErrorMessage } from "../lib/read-fetch-error";
import type { GetLayoutResponse, TemplateSlideSizeEmu } from "../types/template-layout";
import type { GetTemplateResponse } from "../types/template";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isGetTemplateResponse = (value: unknown): value is GetTemplateResponse => {
  if (!isRecord(value)) {
    return false;
  }
  const templateId: unknown = value.template_id;
  const userId: unknown = value.user_id;
  const name: unknown = value.name;
  const createdAt: unknown = value.created_at;
  const updatedAt: unknown = value.updated_at;
  return (
    typeof templateId === "string" &&
    typeof userId === "string" &&
    typeof name === "string" &&
    typeof createdAt === "string" &&
    typeof updatedAt === "string"
  );
};

const isGetTemplateResponseList = (value: unknown): value is GetTemplateResponse[] => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item: unknown) => isGetTemplateResponse(item));
};

const isLayoutShapeWithLayoutId = (value: unknown): value is { layout_id: string } => {
  if (!isRecord(value)) {
    return false;
  }
  const layoutId: unknown = value.layout_id;
  return typeof layoutId === "string" && layoutId.length > 0;
};

const isTemplateSlideSizeEmu = (value: unknown): value is TemplateSlideSizeEmu => {
  if (!isRecord(value)) {
    return false;
  }
  const width: unknown = value.width;
  const height: unknown = value.height;
  return (
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  );
};

const isLayoutColorConfigJson = (value: unknown): value is GetLayoutResponse["background_color"] => {
  if (!isRecord(value)) {
    return false;
  }
  const colorType: unknown = value.color_type;
  if (colorType !== "solid" && colorType !== "none") {
    return false;
  }
  const color: unknown = value.color;
  const alpha: unknown = value.alpha;
  const colorOk: boolean = color === null || (typeof color === "string" && color.length > 0);
  const alphaOk: boolean =
    alpha === null || (typeof alpha === "number" && Number.isFinite(alpha) && alpha >= 0 && alpha <= 1);
  if (!colorOk || !alphaOk) {
    return false;
  }
  if (colorType === "solid") {
    return typeof color === "string" && color.length > 0 && typeof alpha === "number";
  }
  return true;
};

const isGetLayoutResponse = (value: unknown): value is GetLayoutResponse => {
  if (!isRecord(value)) {
    return false;
  }
  const name: unknown = value.name;
  const shapes: unknown = value.shapes;
  const slideSize: unknown = value.slide_size;
  const backgroundColor: unknown = value.background_color;
  if (
    typeof name !== "string" ||
    !Array.isArray(shapes) ||
    !isTemplateSlideSizeEmu(slideSize) ||
    !isLayoutColorConfigJson(backgroundColor)
  ) {
    return false;
  }
  return shapes.every((shape: unknown) => isLayoutShapeWithLayoutId(shape));
};

const isGetLayoutResponseList = (value: unknown): value is GetLayoutResponse[] => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item: unknown) => isGetLayoutResponse(item));
};

export const listTemplatesByUserId = async (userId: string): Promise<GetTemplateResponse[]> => {
  const baseUrl: string = getApiBaseUrl();
  const encodedId: string = encodeURIComponent(userId);
  const url: string = `${baseUrl}/powerpoint/template/list/${encodedId}`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not load templates.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isGetTemplateResponseList(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};

export const listTemplateLayoutsByTemplateId = async (templateId: string): Promise<GetLayoutResponse[]> => {
  const baseUrl: string = getApiBaseUrl();
  const encodedId: string = encodeURIComponent(templateId);
  const url: string = `${baseUrl}/powerpoint/template/layouts/${encodedId}`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not load template layouts.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isGetLayoutResponseList(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};

export const readTemplateFromUpload = async (
  userId: string,
  file: File,
  templateDisplayName: string | undefined
): Promise<GetTemplateResponse> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/powerpoint/template/read`;
  const formData: FormData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  if (templateDisplayName !== undefined && templateDisplayName.trim().length > 0) {
    formData.append("template_name", templateDisplayName.trim());
  }
  const response: Response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not upload the template.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isGetTemplateResponse(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};
