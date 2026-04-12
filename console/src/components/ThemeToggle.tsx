import type { ThemePreference } from '../lib/theme';

export type ThemeToggleProps = {
  theme: ThemePreference;
  onToggle: () => void;
};

export const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
  const label: string =
    theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance';
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300/80 bg-white/80 text-neutral-800 shadow-sm backdrop-blur-sm transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/15"
      aria-label={label}
      onClick={onToggle}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

const SunIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
