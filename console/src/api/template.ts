import { SIGN_IN_REQUIRED_MESSAGE } from "../lib/auth-errors";
import { getApiBaseUrl } from "../lib/api-base";
import { readFetchErrorMessage } from "../lib/read-fetch-error";
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
