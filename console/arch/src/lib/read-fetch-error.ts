import { parseApiErrorBody } from "./parse-api-error";

const CLIENT_FETCH_FAILURE_SUBSTRINGS: readonly string[] = ["failed to fetch", "load failed", "networkerror"];

export const readableClientFetchFailureMessage = (error: unknown, fallback: string): string => {
  if (error instanceof TypeError) {
    return fallback;
  }
  if (error instanceof Error) {
    const normalized: string = error.message.toLowerCase();
    const matched: boolean = CLIENT_FETCH_FAILURE_SUBSTRINGS.some((fragment: string) => normalized.includes(fragment));
    if (matched) {
      return fallback;
    }
    return error.message;
  }
  return fallback;
};

export const readFetchErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const text: string = await response.text();
  if (text.length === 0) {
    return fallback;
  }
  try {
    const data: unknown = JSON.parse(text) as unknown;
    return parseApiErrorBody(data, fallback);
  } catch {
    return text;
  }
};
