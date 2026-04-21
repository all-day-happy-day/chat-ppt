import { useCallback, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";

const PRIMARY_BUTTON_CLASS =
  "flex h-10 w-full max-w-[280px] items-center justify-center rounded-lg bg-[#0071e3] text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]" as const;

const SECONDARY_BUTTON_CLASS =
  "flex h-10 w-full max-w-[280px] items-center justify-center rounded-lg border border-neutral-300 bg-transparent text-[15px] font-medium text-neutral-900 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10" as const;

export type HomePageProps = {
  onGoHome: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

export const HomePage = ({ onGoHome, onSignIn, onSignUp }: HomePageProps) => {
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <button
          type="button"
          className="text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
          aria-label={`${APP_DISPLAY_NAME} home`}
          onClick={onGoHome}
        >
          {APP_DISPLAY_NAME}
        </button>
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-8">
        <p className="mb-3 text-center text-[13px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"></p>
        <h1 className="max-w-[560px] text-center text-[40px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[48px]">
          {`Welcome to ${APP_DISPLAY_NAME}`}
        </h1>
        <p className="mt-5 max-w-[460px] text-center text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Easier way to make presentations for your Sunday service.
        </p>

        <nav className="mt-12 flex w-full max-w-[320px] flex-col items-center gap-3" aria-label="Account">
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={onSignIn}>
            Sign in
          </button>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onSignUp}>
            Create account
          </button>
        </nav>
      </main>
    </div>
  );
};
