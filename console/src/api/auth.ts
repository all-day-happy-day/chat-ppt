import { getApiBaseUrl } from '../lib/api-base';
import { parseApiErrorBody } from '../lib/parse-api-error';
import type { SignInRequest, SignInResponse } from '../types/auth';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isSignInResponse = (value: unknown): value is SignInResponse => {
  if (!isRecord(value)) {
    return false;
  }
  const username: unknown = value.username;
  return typeof username === 'string';
};

export const signIn = async (body: SignInRequest): Promise<SignInResponse> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/auth/signin`;
  const response: Response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const text: string = await response.text();
  if (!response.ok) {
    const fallback: string = `Sign in failed (${String(response.status)})`;
    let message: string = fallback;
    if (text.length > 0) {
      try {
        const data: unknown = JSON.parse(text) as unknown;
        message = parseApiErrorBody(data, text);
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Invalid response from server.');
  }
  if (!isSignInResponse(parsed)) {
    throw new Error('Invalid response from server.');
  }
  return parsed;
};
