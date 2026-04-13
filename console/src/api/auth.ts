import { getApiBaseUrl } from "../lib/api-base";
import { getSignInUserMessage } from "../lib/sign-in-error-message";
import { getSignUpUserMessage } from "../lib/sign-up-error-message";
import type { SignInRequest, SignInResponse, SignUpRequest, SignUpResponse } from "../types/auth";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isAuthUsernameResponse = (value: unknown): value is SignInResponse | SignUpResponse => {
  if (!isRecord(value)) {
    return false;
  }
  const username: unknown = value.username;
  return typeof username === "string";
};

export const signIn = async (body: SignInRequest): Promise<SignInResponse> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/auth/signin`;
  const response: Response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const text: string = await response.text();
  if (!response.ok) {
    let parsedBody: unknown = null;
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text) as unknown;
      } catch {
        parsedBody = null;
      }
    }
    const message: string = getSignInUserMessage(response.status, parsedBody);
    throw new Error(message);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isAuthUsernameResponse(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};

export const signUp = async (body: SignUpRequest): Promise<SignUpResponse> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/auth/signup`;
  const response: Response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const text: string = await response.text();
  if (!response.ok) {
    let parsedBody: unknown = null;
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text) as unknown;
      } catch {
        parsedBody = null;
      }
    }
    const message: string = getSignUpUserMessage(response.status, parsedBody);
    throw new Error(message);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  if (!isAuthUsernameResponse(parsed)) {
    throw new Error("Invalid response from server.");
  }
  return parsed;
};
