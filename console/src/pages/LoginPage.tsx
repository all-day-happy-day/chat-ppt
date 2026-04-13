import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { signIn } from "../api/auth";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { AUTH_FIELD_CLASS, AUTH_LINK_CLASS } from "../lib/auth-screen-classes";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";

const FORGOT_PASSWORD_BALLOON_MESSAGE: string = "Figure out yourself! 🫡";

export type LoginPageProps = {
  onSuccess: () => void;
  onGoHome: () => void;
  onGoSignUp: () => void;
};

export const LoginPage = ({ onSuccess, onGoHome, onGoSignUp }: LoginPageProps) => {
  const [principal, setPrincipal] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isForgotPasswordBalloonOpen, setIsForgotPasswordBalloonOpen] = useState<boolean>(false);
  const forgotPasswordPopoverRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    setIsForgotPasswordBalloonOpen(false);
  }, [isSubmitting]);

  useEffect(() => {
    if (!isForgotPasswordBalloonOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      const root: HTMLDivElement | null = forgotPasswordPopoverRef.current;
      if (root === null || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        setIsForgotPasswordBalloonOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isForgotPasswordBalloonOpen]);

  useEffect(() => {
    if (!isForgotPasswordBalloonOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsForgotPasswordBalloonOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isForgotPasswordBalloonOpen]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage(null);
      setIsSubmitting(true);
      try {
        const trimmedPrincipal: string = principal.trim();
        await signIn({
          principal: trimmedPrincipal,
          secret,
        });
        onSuccess();
      } catch (error: unknown) {
        const message: string = error instanceof Error ? error.message : "Something went wrong.";
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [principal, secret, onSuccess]
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
            Sign in
          </h1>
          <p className="mt-2 max-w-[320px] text-center text-[15px] leading-snug text-neutral-500 dark:text-neutral-400">
            {`Use your account to continue to ${APP_DISPLAY_NAME}.`}
          </p>
        </div>

        <div className="w-full max-w-[420px] rounded-3xl border border-black/[0.06] bg-white px-8 py-9 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300" htmlFor="principal">
                Account
              </label>
              <input
                id="principal"
                name="principal"
                type="text"
                autoComplete="username"
                spellCheck={false}
                className={AUTH_FIELD_CLASS}
                placeholder="Email or username"
                value={principal}
                onChange={(e) => {
                  setPrincipal(e.target.value);
                }}
                disabled={isSubmitting}
                aria-invalid={errorMessage !== null}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300" htmlFor="secret">
                  Password
                </label>
                <div ref={forgotPasswordPopoverRef} className="relative shrink-0">
                  <button
                    type="button"
                    className={`text-[13px] ${AUTH_LINK_CLASS}`}
                    disabled={isSubmitting}
                    aria-expanded={isForgotPasswordBalloonOpen}
                    aria-controls="forgot-password-balloon"
                    id="forgot-password-trigger"
                    onClick={() => {
                      setIsForgotPasswordBalloonOpen((open: boolean) => !open);
                    }}
                  >
                    Forgot password?
                  </button>
                  {isForgotPasswordBalloonOpen ? (
                    <div
                      id="forgot-password-balloon"
                      role="status"
                      className="absolute bottom-full right-0 z-10 mb-2 w-max max-w-[min(17.5rem,calc(100vw-3rem))]"
                    >
                      <div className="relative rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-left text-[14px] font-medium leading-snug text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                        {FORGOT_PASSWORD_BALLOON_MESSAGE}
                        <span
                          className="absolute -bottom-1.5 right-5 block size-2.5 rotate-45 border-b border-r border-black/[0.1] bg-white dark:border-white/[0.12] dark:bg-[#2c2c2e]"
                          aria-hidden
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <input
                id="secret"
                name="secret"
                type="password"
                autoComplete="current-password"
                className={AUTH_FIELD_CLASS}
                placeholder="Password"
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
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
              className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-[#0071e3] text-[17px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[15px] text-neutral-600 dark:text-neutral-400">
            Don&apos;t have an account?{" "}
            <button type="button" className={AUTH_LINK_CLASS} onClick={onGoSignUp}>
              Sign up
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
