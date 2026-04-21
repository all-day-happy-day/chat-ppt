export const THEME_STORAGE_KEY = "console-theme" as const;

export type ThemePreference = "light" | "dark";

export const getStoredTheme = (): ThemePreference | null => {
  const raw: string | null = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark") {
    return raw;
  }
  return null;
};

export const applyTheme = (theme: ThemePreference): void => {
  const root: HTMLElement = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const persistTheme = (theme: ThemePreference): void => {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const resolveInitialTheme = (): ThemePreference => {
  const stored: ThemePreference | null = getStoredTheme();
  if (stored !== null) {
    return stored;
  }
  const prefersDark: boolean = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

export const initializeDocumentTheme = (): ThemePreference => {
  const theme: ThemePreference = resolveInitialTheme();
  applyTheme(theme);
  return theme;
};

export const toggleStoredTheme = (current: ThemePreference): ThemePreference => {
  const next: ThemePreference = current === "dark" ? "light" : "dark";
  applyTheme(next);
  persistTheme(next);
  return next;
};
