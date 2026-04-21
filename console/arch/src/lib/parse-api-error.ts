type ValidationErrorDetail = {
  loc?: unknown;
  msg?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isValidationErrorDetail = (value: unknown): value is ValidationErrorDetail => {
  return isRecord(value);
};

const formatValidationDetails = (details: unknown): string | null => {
  if (!Array.isArray(details)) {
    return null;
  }
  const parts: string[] = [];
  for (const item of details) {
    if (!isValidationErrorDetail(item)) {
      continue;
    }
    const msg: unknown = item.msg;
    if (typeof msg === "string" && msg.length > 0) {
      parts.push(msg);
    }
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" ");
};

/** Backend `DuplicatedPartName` for lyric line `part` values (project PATCH and song lyrics PATCH). */
export const DUPLICATE_LYRIC_PART_NAME_API_DETAIL: string = "Part name must be unique";

export const DUPLICATE_LYRIC_PART_NAME_USER_WARNING: string = "Part names must be unique within this song.";

export const DUPLICATE_LYRIC_PART_NAME_WARNING_MS: number = 2000;

const CHAT_PPT_HTTP_ERROR_KEY: string = "chatPptHttpError";

export type ChatPptHttpErrorAttachment = {
  httpStatus: number;
  /** FastAPI `detail` when it is a plain string (e.g. `DuplicatedPartName`). */
  detailString: string | null;
};

type ErrorWithChatPptHttp = Error & { [key: string]: ChatPptHttpErrorAttachment | undefined };

export const attachChatPptHttpErrorToThrownError = (
  error: Error,
  response: Response,
  responseBodyText: string
): void => {
  let detailString: string | null = null;
  try {
    const data: unknown = JSON.parse(responseBodyText) as unknown;
    if (isRecord(data)) {
      const d: unknown = data.detail;
      if (typeof d === "string") {
        detailString = d;
      }
    }
  } catch {
    detailString = null;
  }
  (error as ErrorWithChatPptHttp)[CHAT_PPT_HTTP_ERROR_KEY] = {
    httpStatus: response.status,
    detailString,
  };
};

export const readChatPptHttpErrorAttachment = (error: unknown): ChatPptHttpErrorAttachment | null => {
  if (!(error instanceof Error)) {
    return null;
  }
  const attachment: ChatPptHttpErrorAttachment | undefined = (error as ErrorWithChatPptHttp)[CHAT_PPT_HTTP_ERROR_KEY];
  return attachment !== undefined ? attachment : null;
};

/**
 * True only for the API's DuplicatedPartName case: HTTP 400 and string detail exactly
 * {@link DUPLICATE_LYRIC_PART_NAME_API_DETAIL}, or the same message as the sole Error#message (legacy throws).
 */
export const isDuplicateLyricPartNamePatchError = (error: unknown): boolean => {
  const attachment: ChatPptHttpErrorAttachment | null = readChatPptHttpErrorAttachment(error);
  if (attachment !== null) {
    return attachment.httpStatus === 400 && attachment.detailString === DUPLICATE_LYRIC_PART_NAME_API_DETAIL;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.trim() === DUPLICATE_LYRIC_PART_NAME_API_DETAIL;
};

export const parseApiErrorBody = (data: unknown, fallback: string): string => {
  if (!isRecord(data)) {
    return fallback;
  }
  const detail: unknown = data.detail;
  if (typeof detail === "string" && detail.length > 0) {
    return detail;
  }
  const fromArray: string | null = formatValidationDetails(detail);
  if (fromArray !== null && fromArray.length > 0) {
    return fromArray;
  }
  return fallback;
};

export const messageFromFailedResponseBody = (text: string, fallback: string): string => {
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

export const parseApiErrorMessage = async (response: Response): Promise<string> => {
  const text: string = await response.text();
  const fallback: string = `Request failed (${String(response.status)})`;
  if (text.length === 0) {
    return fallback;
  }
  try {
    const data: unknown = JSON.parse(text) as unknown;
    return parseApiErrorBody(data, text);
  } catch {
    return text;
  }
};
