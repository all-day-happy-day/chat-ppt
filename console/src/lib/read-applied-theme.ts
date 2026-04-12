import type { ThemePreference } from './theme';

export const readAppliedThemeFromDocument = (): ThemePreference => {
  const isDark: boolean = document.documentElement.classList.contains('dark');
  return isDark ? 'dark' : 'light';
};
