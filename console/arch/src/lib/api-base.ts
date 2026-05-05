const trimTrailingSlash = (value: string): string => {
  if (value.endsWith("/")) {
    return value.slice(0, -1);
  }
  return value;
};

export const getApiBaseUrl = (): string => {
  const raw: string | undefined = import.meta.env.VITE_API_BASE_URL;
  if (raw === undefined || raw === "") {
    return "";
  }
  return trimTrailingSlash(raw);
};
