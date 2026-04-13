import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { APP_DISPLAY_NAME } from '../lib/app-display-name';
import { readAppliedThemeFromDocument } from '../lib/read-applied-theme';
import type { ThemePreference } from '../lib/theme';
import { toggleStoredTheme } from '../lib/theme';

const PRIMARY_BUTTON_CLASS =
  'flex h-11 w-full max-w-[280px] items-center justify-center rounded-xl bg-[#0071e3] text-[17px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]' as const;

const SECONDARY_BUTTON_CLASS =
  'flex h-11 w-full max-w-[280px] items-center justify-center rounded-xl border border-neutral-300 bg-transparent text-[17px] font-medium text-neutral-900 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10' as const;

export const HomePage = () => {
  const [theme, setTheme] = useState<ThemePreference>(() =>
    readAppliedThemeFromDocument(),
  );

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
        >
          {APP_DISPLAY_NAME}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/signin"
            className="text-[15px] font-medium text-[#0071e3] hover:underline dark:text-[#0a84ff]"
          >
            Sign in
          </Link>
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-8">
        <p className="mb-3 text-center text-[13px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Presentations
        </p>
        <h1 className="max-w-[560px] text-center text-[40px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[48px]">
          {`Welcome to ${APP_DISPLAY_NAME}`}
        </h1>
        <p className="mt-5 max-w-[460px] text-center text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Sign in to work with your projects and templates, or create an account to get started.
        </p>

        <nav
          className="mt-12 flex w-full max-w-[320px] flex-col items-center gap-3"
          aria-label="Account"
        >
          <Link to="/signin" className={PRIMARY_BUTTON_CLASS}>
            Sign in
          </Link>
          <Link to="/signup" className={SECONDARY_BUTTON_CLASS}>
            Create account
          </Link>
        </nav>
      </main>
    </div>
  );
};
