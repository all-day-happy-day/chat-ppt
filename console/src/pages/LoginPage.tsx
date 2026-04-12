import { useCallback, useState, type FormEvent } from 'react';
import { signIn } from '../api/auth';
import { ThemeToggle } from '../components/ThemeToggle';
import { readAppliedThemeFromDocument } from '../lib/read-applied-theme';
import type { ThemePreference } from '../lib/theme';
import { toggleStoredTheme } from '../lib/theme';

export const LoginPage = () => {
  const [principal, setPrincipal] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [signedInUsername, setSignedInUsername] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(() =>
    readAppliedThemeFromDocument(),
  );

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
        const response = await signIn({
          principal: trimmedPrincipal,
          secret,
        });
        setSignedInUsername(response.username);
      } catch (error: unknown) {
        const message: string =
          error instanceof Error ? error.message : 'Something went wrong.';
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [principal, secret],
  );

  if (signedInUsername !== null) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="absolute right-6 top-6">
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
        <div className="w-full max-w-[380px] rounded-3xl border border-black/[0.06] bg-white px-8 py-10 text-center shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#34c759]/15 text-[#34c759]">
            <CheckIcon />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            You are signed in
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-neutral-500 dark:text-neutral-400">
            Signed in as{' '}
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {signedInUsername}
            </span>
            . Session cookies were set by the server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </div>

      <div className="mb-10 flex flex-col items-center">
        <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-neutral-900 text-[22px] font-semibold text-white shadow-md dark:bg-white dark:text-neutral-900">
          C
        </div>
        <h1 className="text-center text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Sign in
        </h1>
        <p className="mt-2 max-w-[320px] text-center text-[15px] leading-snug text-neutral-500 dark:text-neutral-400">
          Use your account to continue to Console.
        </p>
      </div>

      <div className="w-full max-w-[380px] rounded-3xl border border-black/[0.06] bg-white px-8 py-9 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="principal"
            >
              Account
            </label>
            <input
              id="principal"
              name="principal"
              type="text"
              autoComplete="username"
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-[17px] text-neutral-900 outline-none ring-[#0071e3] transition placeholder:text-neutral-400 focus:border-[#0071e3] focus:ring-2 dark:border-neutral-600 dark:bg-[#2c2c2e] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-[#0a84ff]"
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
              <label
                className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="secret"
              >
                Password
              </label>
              <button
                type="button"
                className="text-[13px] font-normal text-[#0071e3] hover:underline dark:text-[#0a84ff]"
                disabled={isSubmitting}
              >
                Forgot password?
              </button>
            </div>
            <input
              id="secret"
              name="secret"
              type="password"
              autoComplete="current-password"
              className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-[17px] text-neutral-900 outline-none ring-[#0071e3] transition placeholder:text-neutral-400 focus:border-[#0071e3] focus:ring-2 dark:border-neutral-600 dark:bg-[#2c2c2e] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-[#0a84ff]"
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
              className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] leading-snug text-red-700 dark:bg-red-500/15 dark:text-red-300"
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
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-500">
          Your organization&apos;s policies may apply to this account.
        </p>
      </div>
    </div>
  );
};

const CheckIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
