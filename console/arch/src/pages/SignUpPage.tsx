import { type FormEvent,useCallback, useState } from "react";

import { signUp } from "../api/auth";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { AUTH_FIELD_CLASS, AUTH_LINK_CLASS } from "../lib/auth-screen-classes";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";

export type SignUpPageProps = {
  onSuccess: () => void;
  onGoHome: () => void;
  onGoSignIn: () => void;
};

export const SignUpPage = ({ onSuccess, onGoHome, onGoSignIn }: SignUpPageProps) => {
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage(null);
      setIsSubmitting(true);
      try {
        await signUp({
          email: email.trim(),
          username: username.trim(),
          password,
        });
        onSuccess();
      } catch (error: unknown) {
        const message: string = error instanceof Error ? error.message : "Something went wrong.";
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, username, password, onSuccess]
  );

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

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-4">
        <div className="mb-10 flex flex-col items-center">
          <h1 className="text-center text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Create your account
          </h1>
          <p className="mt-2 max-w-[320px] text-center text-[15px] leading-snug text-neutral-500 dark:text-neutral-400">
            {`Join ${APP_DISPLAY_NAME} with your email, username, and password.`}
          </p>
        </div>

        <div className="w-full max-w-[420px] rounded-3xl border border-black/[0.06] bg-white px-8 py-9 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                className={AUTH_FIELD_CLASS}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                disabled={isSubmitting}
                aria-invalid={errorMessage !== null}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="signup-username"
              >
                Username
              </label>
              <input
                id="signup-username"
                name="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                className={AUTH_FIELD_CLASS}
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                disabled={isSubmitting}
                aria-invalid={errorMessage !== null}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="signup-password"
              >
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                className={AUTH_FIELD_CLASS}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                disabled={isSubmitting}
                aria-invalid={errorMessage !== null}
              />
            </div>

            {errorMessage !== null ? (
              <p
                className="rounded-xl bg-red-500/10 px-4 py-4 text-left text-[11px] font-normal leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-[#0071e3] text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="mt-6 text-center text-[15px] text-neutral-600 dark:text-neutral-400">
            Already have an account?{" "}
            <button type="button" className={AUTH_LINK_CLASS} onClick={onGoSignIn}>
              Sign in
            </button>
          </p>

          <p className="mt-6 text-center text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-500">
            Your organization&apos;s policies may apply to this account.
          </p>
        </div>
      </main>
    </div>
  );
};
