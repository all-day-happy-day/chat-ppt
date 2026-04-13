export type ValidationRow = {
  loc: (string | number)[];
  msg: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const asLocArray = (loc: unknown): (string | number)[] => {
  if (!Array.isArray(loc)) {
    return [];
  }
  const out: (string | number)[] = [];
  for (const part of loc) {
    if (typeof part === "string" || typeof part === "number") {
      out.push(part);
    }
  }
  return out;
};

export const collectValidationRows = (parsed: unknown): ValidationRow[] => {
  const rows: ValidationRow[] = [];
  const pushFromArray = (arr: unknown): void => {
    if (!Array.isArray(arr)) {
      return;
    }
    for (const item of arr) {
      if (!isRecord(item)) {
        continue;
      }
      const loc: unknown = item.loc;
      const msg: unknown = item.msg;
      if (typeof msg !== "string" || msg.length === 0) {
        continue;
      }
      rows.push({ loc: asLocArray(loc), msg });
    }
  };
  if (Array.isArray(parsed)) {
    pushFromArray(parsed);
    return rows;
  }
  if (!isRecord(parsed)) {
    return rows;
  }
  const detail: unknown = parsed.detail;
  if (Array.isArray(detail)) {
    pushFromArray(detail);
  }
  return rows;
};

export const locNamesField = (loc: (string | number)[], field: string): boolean => {
  return loc.some((part: string | number) => part === field);
};

export const looksLikeMissingField = (msg: string): boolean => {
  const lower: string = msg.toLowerCase();
  return lower.includes("field required") || lower.includes("missing") || lower.includes("is required");
};
