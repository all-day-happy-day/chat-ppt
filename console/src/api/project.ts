import { SIGN_IN_REQUIRED_MESSAGE } from "../lib/auth-errors";
import { getApiBaseUrl } from "../lib/api-base";
import { readFetchErrorMessage } from "../lib/read-fetch-error";
import type { CreateProjectRequest, CreateProjectResponse, GetProjectResponse } from "../types/project";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isGetProjectResponse = (value: unknown): value is GetProjectResponse => {
  if (!isRecord(value)) {
    return false;
  }
  const id: unknown = value.id;
  const templateId: unknown = value.template_id;
  const userId: unknown = value.user_id;
  const name: unknown = value.name;
  const createdAt: unknown = value.created_at;
  const updatedAt: unknown = value.updated_at;
  const parts: unknown = value.parts;
  return (
    typeof id === "string" &&
    typeof templateId === "string" &&
    typeof userId === "string" &&
    typeof name === "string" &&
    typeof createdAt === "string" &&
    typeof updatedAt === "string" &&
    Array.isArray(parts)
  );
};

const isGetProjectResponseList = (value: unknown): value is GetProjectResponse[] => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item: unknown) => isGetProjectResponse(item));
};

const isCreateProjectResponse = (value: unknown): value is CreateProjectResponse => {
  return isGetProjectResponse(value);
};

export const listProjectsByUserId = async (userId: string): Promise<GetProjectResponse[]> => {
  const baseUrl: string = getApiBaseUrl();
  const encodedId: string = encodeURIComponent(userId);
  const url: string = `${baseUrl}/project/${encodedId}`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not load projects.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isGetProjectResponseList(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};

export const createProject = async (body: CreateProjectRequest): Promise<CreateProjectResponse> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/project`;
  const response: Response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not create the project.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isCreateProjectResponse(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};

export const patchProjectById = async (
  projectId: string,
  body: Record<string, unknown>
): Promise<GetProjectResponse> => {
  const baseUrl: string = getApiBaseUrl();
  const encodedId: string = encodeURIComponent(projectId);
  const url: string = `${baseUrl}/project/${encodedId}`;
  const response: Response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not update the project.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isGetProjectResponse(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};

export const deleteProjectById = async (projectId: string): Promise<void> => {
  const baseUrl: string = getApiBaseUrl();
  const encodedId: string = encodeURIComponent(projectId);
  const url: string = `${baseUrl}/project/${encodedId}`;
  const response: Response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not delete the project.");
    throw new Error(message);
  }
};
