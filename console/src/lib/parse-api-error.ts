type ValidationErrorDetail = {
  loc?: unknown;
  msg?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isValidationErrorDetail = (
  value: unknown,
): value is ValidationErrorDetail => {
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
    if (typeof msg === 'string' && msg.length > 0) {
      parts.push(msg);
    }
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(' ');
};

export const parseApiErrorBody = (
  data: unknown,
  fallback: string,
): string => {
  if (!isRecord(data)) {
    return fallback;
  }
  const detail: unknown = data.detail;
  if (typeof detail === 'string' && detail.length > 0) {
    return detail;
  }
  const fromArray: string | null = formatValidationDetails(detail);
  if (fromArray !== null && fromArray.length > 0) {
    return fromArray;
  }
  return fallback;
};

export const parseApiErrorMessage = async (
  response: Response,
): Promise<string> => {
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
