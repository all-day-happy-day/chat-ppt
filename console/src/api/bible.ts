import { SIGN_IN_REQUIRED_MESSAGE } from "../lib/auth-errors";
import { getApiBaseUrl } from "../lib/api-base";
import { readFetchErrorMessage } from "../lib/read-fetch-error";

/** Matches `ParseVerseRangeService` / `str(e)` on `MultipleNumbers`, `MultipleSeparators`, `UnsupportedLetter` (verse). */
const VERSE_PARSE_FORMAT_MESSAGE_MARKERS: readonly string[] = [
  "Multiple numbers:",
  "Multiple separators:",
  "Unsupported letter:",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readStringArray = (value: unknown, key: string): string[] => {
  if (!isRecord(value)) {
    return [];
  }
  const raw: unknown = value[key];
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push(item);
    }
  }
  return out;
};

const readNumberArray = (value: unknown, key: string): number[] => {
  if (!isRecord(value)) {
    return [];
  }
  const raw: unknown = value[key];
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: number[] = [];
  for (const item of raw) {
    if (typeof item === "number" && Number.isInteger(item)) {
      out.push(item);
    }
  }
  return out;
};

export type BibleVersionOption = {
  /**
   * StrEnum **value** for `/bible/books/{version}` etc. (matches Python `AvailableBibleVersions` string values).
   */
  key: string;
  /** Same as `key` — what users see and search (GET /bible/versions `versions` dict values). */
  label: string;
  /** Python enum member name (dict key), e.g. `GAE` — for migrating old rows that stored the member name. */
  memberName: string;
};

/**
 * GET /bible/versions returns `versions` from `AvailableBibleVersions.__members__`:
 * dict keys = member names, serialized values = StrEnum string values (e.g. `개역개정`).
 */
const readBibleVersionOptions = (parsed: unknown): BibleVersionOption[] => {
  if (!isRecord(parsed)) {
    return [];
  }
  const raw: unknown = parsed.versions;
  if (!isRecord(raw)) {
    return [];
  }
  const out: BibleVersionOption[] = [];
  for (const [memberName, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      out.push({ key: value, label: value, memberName });
    }
  }
  return out;
};

export const fetchBibleVersions = async (signal?: AbortSignal): Promise<BibleVersionOption[]> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/bible/versions`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not load Bible versions.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  return readBibleVersionOptions(parsed);
};

/** GET /bible/books/{version} — server uses path params (GET bodies are unreliable in browsers). */
export const fetchBibleBooks = async (version: string, signal?: AbortSignal): Promise<string[]> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/bible/books/${encodeURIComponent(version)}`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not load Bible books.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  return readStringArray(parsed, "books");
};

/** GET /bible/chapters/{version}/{book} */
export const fetchBibleChapters = async (version: string, book: string, signal?: AbortSignal): Promise<number[]> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/bible/chapters/${encodeURIComponent(version)}/${encodeURIComponent(book)}`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not load Bible chapters.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  return readNumberArray(parsed, "chapters");
};

const isVerseParseFormatMessage = (message: string): boolean => {
  return VERSE_PARSE_FORMAT_MESSAGE_MARKERS.some((marker: string): boolean => message.includes(marker));
};

const isVerseFieldValidationLoc = (loc: unknown): boolean => {
  if (!Array.isArray(loc)) {
    return false;
  }
  return loc.some((part: unknown): boolean => part === "verse");
};

const readValidationErrorItems = (parsed: unknown): unknown[] => {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!isRecord(parsed)) {
    return [];
  }
  const detail: unknown = parsed.detail;
  return Array.isArray(detail) ? detail : [];
};

const isVerseParseFormatFromValidationItems = (items: unknown[]): boolean => {
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }
    const msg: unknown = item.msg;
    const loc: unknown = item.loc;
    if (typeof msg !== "string") {
      continue;
    }
    if (!isVerseFieldValidationLoc(loc)) {
      continue;
    }
    if (isVerseParseFormatMessage(msg)) {
      return true;
    }
  }
  return false;
};

/**
 * True when the response body indicates verse-string parse failures from the domain layer
 * (`MultipleNumbers`, `MultipleSeparators`, `UnsupportedLetter` on the verse field).
 */
const isVerseParseFormatApiBody = (parsed: unknown): boolean => {
  if (typeof parsed === "string" && isVerseParseFormatMessage(parsed)) {
    return true;
  }
  if (isRecord(parsed) && typeof parsed.detail === "string" && isVerseParseFormatMessage(parsed.detail)) {
    return true;
  }
  return isVerseParseFormatFromValidationItems(readValidationErrorItems(parsed));
};

export type GetBiblePhraseRequestItem = {
  version: string;
  book: string;
  chapter: string;
  verse: string;
};

export type BiblePhraseProbeResult =
  | { ok: true }
  | { ok: false; reason: "parse_format" | "phrase_not_found" | "other" };

const buildBiblePhraseByPathUrl = (baseUrl: string, body: GetBiblePhraseRequestItem): string => {
  const v: string = encodeURIComponent(body.version);
  const b: string = encodeURIComponent(body.book);
  const c: string = encodeURIComponent(body.chapter);
  const verse: string = encodeURIComponent(body.verse);
  return `${baseUrl}/bible/${v}/${b}/${c}/${verse}`;
};

/**
 * GET /bible/{version}/{book}/{chapter}/{verse} — phrase probe for verse validation (same contract as OpenAPI).
 */
export const probeBiblePhraseViaGetBible = async (
  body: GetBiblePhraseRequestItem,
  signal?: AbortSignal
): Promise<BiblePhraseProbeResult> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = buildBiblePhraseByPathUrl(baseUrl, body);
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (response.ok) {
    return { ok: true };
  }
  if (response.status === 401) {
    throw new Error(SIGN_IN_REQUIRED_MESSAGE);
  }
  if (response.status === 404) {
    return { ok: false, reason: "phrase_not_found" };
  }
  const text: string = await response.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = null;
    }
  }
  if (response.status === 400 || response.status === 422) {
    if (parsed !== null && isVerseParseFormatApiBody(parsed)) {
      return { ok: false, reason: "parse_format" };
    }
  }
  return { ok: false, reason: "other" };
};

/** GET /bible/verses/{version}/{book}/{chapter} */
export const fetchBibleVerses = async (
  version: string,
  book: string,
  chapter: number,
  signal?: AbortSignal
): Promise<number[]> => {
  const baseUrl: string = getApiBaseUrl();
  const url: string = `${baseUrl}/bible/verses/${encodeURIComponent(version)}/${encodeURIComponent(book)}/${String(chapter)}`;
  const response: Response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(SIGN_IN_REQUIRED_MESSAGE);
    }
    const message: string = await readFetchErrorMessage(response, "Could not load Bible verses.");
    throw new Error(message);
  }
  const text: string = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid response from server.");
  }
  return readNumberArray(parsed, "verses");
};
