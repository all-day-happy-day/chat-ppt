import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { verifySession } from "../api/auth";
import { getUserById, listUsers, patchUserById } from "../api/user";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { AUTH_FIELD_CLASS } from "../lib/auth-screen-classes";
import { isSignInRequiredError } from "../lib/auth-errors";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetUserResponse, PatchUserRequest, UserRole } from "../types/user";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  USER: "Standard user",
};

const USER_RESOLVE_ERROR: string = "We could not match your signed-in user to an account in this workspace.";

export const UserSettingsPage = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSessionExpiredNavigation = useCallback((): void => {
    setSessionExpiredRedirect();
    navigate("/", { replace: true });
  }, [navigate]);

  const handleBackToProjects = useCallback((): void => {
    navigate("/", { replace: true });
  }, [navigate]);

  const handleGoHome = useCallback((): void => {
    void (async (): Promise<void> => {
      try {
        await verifySession();
        navigate("/", { replace: true });
      } catch {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  useEffect(() => {
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      setResolvedUserId(null);
      try {
        const session = await verifySession();
        const users: GetUserResponse[] = await listUsers();
        const userId: string | null = findUserIdByPrincipal(session.principal, users);
        if (userId === null) {
          if (!cancelled) {
            setLoadError(USER_RESOLVE_ERROR);
          }
          return;
        }
        const profile: GetUserResponse = await getUserById(userId);
        if (!cancelled) {
          setResolvedUserId(userId);
          setUsername(profile.username);
          setEmail(profile.email);
          setRole(profile.role);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string = error instanceof Error ? error.message : "Could not load your profile.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [handleSessionExpiredNavigation]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setFormError(null);
      setSaveSuccess(false);
      if (resolvedUserId === null) {
        setFormError("Your account could not be loaded. Try refreshing the page.");
        return;
      }
      const trimmedUsername: string = username.trim();
      const trimmedEmail: string = email.trim();
      if (trimmedUsername.length === 0) {
        setFormError("Enter a username.");
        return;
      }
      if (trimmedUsername.includes("@")) {
        setFormError('Username cannot contain "@".');
        return;
      }
      if (trimmedEmail.length === 0) {
        setFormError("Enter an email address.");
        return;
      }
      const passwordFilled: boolean = newPassword.length > 0 || confirmPassword.length > 0;
      if (passwordFilled) {
        if (newPassword.length < 8) {
          setFormError("New password must be at least 8 characters.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setFormError("New password and confirmation do not match.");
          return;
        }
      }
      setIsSaving(true);
      try {
        const body: PatchUserRequest = {
          email: trimmedEmail,
          username: trimmedUsername,
        };
        if (passwordFilled) {
          body.password = newPassword;
        }
        const updated: GetUserResponse = await patchUserById(resolvedUserId, body);
        setUsername(updated.username);
        setEmail(updated.email);
        setRole(updated.role);
        setNewPassword("");
        setConfirmPassword("");
        setSaveSuccess(true);
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string = error instanceof Error ? error.message : "Could not save your settings.";
        setFormError(message);
      } finally {
        setIsSaving(false);
      }
    },
    [resolvedUserId, username, email, newPassword, confirmPassword, handleSessionExpiredNavigation]
  );

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <button
            type="button"
            className="min-w-0 truncate text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
            aria-label={`${APP_DISPLAY_NAME} home`}
            onClick={handleGoHome}
          >
            {APP_DISPLAY_NAME}
          </button>
          <span className="shrink-0 text-[15px] font-medium text-neutral-500 dark:text-neutral-400">User settings</span>
        </div>
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>

      <nav className="bg-neutral-50/90 px-6 py-3 dark:bg-white/[0.04]" aria-label="Back to projects">
        <button
          type="button"
          className="text-[15px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
          onClick={handleBackToProjects}
        >
          ‹ Projects
        </button>
      </nav>

      <main className="flex min-h-0 flex-1 flex-col px-6 py-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <h1 className="text-center text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            User settings
          </h1>
          <p className="mt-2 text-center text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Update your sign-in details. Your role is managed separately and cannot be changed here.
          </p>

          {isLoading ? (
            <p className="mt-10 text-center text-[15px] text-neutral-500 dark:text-neutral-400">
              Loading your profile…
            </p>
          ) : null}

          {loadError !== null ? (
            <p
              className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-center text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
              role="alert"
            >
              {loadError}
            </p>
          ) : null}

          {!isLoading && loadError === null && role !== null && resolvedUserId !== null ? (
            <form className="mt-10 flex w-full flex-col gap-6" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="settings-username"
                >
                  Username
                </label>
                <input
                  id="settings-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  className={AUTH_FIELD_CLASS}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                  }}
                  disabled={isSaving}
                  aria-invalid={formError !== null}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="settings-email"
                >
                  Email
                </label>
                <input
                  id="settings-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  className={AUTH_FIELD_CLASS}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  disabled={isSaving}
                  aria-invalid={formError !== null}
                />
              </div>

              <div className="rounded-2xl border border-black/[0.06] bg-neutral-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Role</p>
                <p className="mt-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                  {ROLE_LABELS[role]}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  Roles cannot be changed from this screen.
                </p>
              </div>

              <div className="border-t border-black/[0.06] pt-6 dark:border-white/[0.08]">
                <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Change password</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  Leave both fields blank to keep your current password.
                </p>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                      htmlFor="settings-new-password"
                    >
                      New password
                    </label>
                    <input
                      id="settings-new-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      className={AUTH_FIELD_CLASS}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                      }}
                      disabled={isSaving}
                      aria-invalid={formError !== null}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                      htmlFor="settings-confirm-password"
                    >
                      Confirm new password
                    </label>
                    <input
                      id="settings-confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      className={AUTH_FIELD_CLASS}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                      }}
                      disabled={isSaving}
                      aria-invalid={formError !== null}
                    />
                  </div>
                </div>
              </div>

              {formError !== null ? (
                <p
                  className="rounded-xl bg-red-500/10 px-4 py-3 text-[13px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}

              {saveSuccess ? (
                <p className="text-[14px] font-medium text-emerald-700 dark:text-emerald-400" role="status">
                  Settings saved.
                </p>
              ) : null}

              <button
                type="submit"
                className="mx-auto flex h-11 w-full max-w-[280px] items-center justify-center rounded-xl bg-[#0071e3] text-[17px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          ) : null}
        </div>
      </main>
    </div>
  );
};
