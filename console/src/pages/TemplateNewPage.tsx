import { useCallback, useEffect, useId, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifySession } from "../api/auth";
import { readTemplateFromUpload } from "../api/template";
import { listUsers } from "../api/user";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetTemplateResponse } from "../types/template";
import type { GetUserResponse } from "../types/user";

const TEXT_INPUT_CLASS: string =
  "mt-1 w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.14] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

export const TemplateNewPage = (): ReactElement => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const nameInputId: string = useId();
  const fileInputId: string = useId();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleToggleTheme = useCallback((): void => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSessionExpiredNavigation = useCallback((): void => {
    setSessionExpiredRedirect();
    navigate("/", { replace: true });
  }, [navigate]);

  const loadUser = useCallback(async (): Promise<void> => {
    setIsLoadingUser(true);
    try {
      const session = await verifySession();
      const users: GetUserResponse[] = await listUsers();
      const resolvedId: string | null = findUserIdByPrincipal(session.principal, users);
      setResolvedUserId(resolvedId);
    } catch (error: unknown) {
      if (isSignInRequiredError(error)) {
        handleSessionExpiredNavigation();
        return;
      }
      setResolvedUserId(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, [handleSessionExpiredNavigation]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setFormError(null);
      const trimmedName: string = templateName.trim();
      if (trimmedName.length === 0) {
        setFormError("Enter a name for the template.");
        return;
      }
      if (file === null) {
        setFormError("Choose a .pptx file.");
        return;
      }
      if (resolvedUserId === null) {
        setFormError("Your account could not be loaded. Try refreshing the page.");
        return;
      }
      setIsUploading(true);
      try {
        const uploaded: GetTemplateResponse = await readTemplateFromUpload(resolvedUserId, file, trimmedName);
        navigate(`/templates/${uploaded.template_id}/edit`, { replace: true });
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        setFormError(error instanceof Error ? error.message : "Could not upload the template.");
      } finally {
        setIsUploading(false);
      }
    },
    [templateName, file, resolvedUserId, navigate, handleSessionExpiredNavigation]
  );

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#fbfbfa] dark:bg-[#191919]">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
          >
            {APP_DISPLAY_NAME}
          </Link>
          <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">New template</span>
        </div>
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>
      <nav className="border-b border-black/[0.06] px-6 py-3 dark:border-white/[0.08]">
        <Link
          to="/"
          className="text-[15px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
        >
          ‹ Projects
        </Link>
      </nav>
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Add template</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Upload a PowerPoint file. You can rename it afterward.
        </p>
        {isLoadingUser ? (
          <p className="mt-8 text-[15px] text-neutral-500 dark:text-neutral-400">Loading…</p>
        ) : (
          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor={nameInputId} className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
                Template name
              </label>
              <input
                id={nameInputId}
                type="text"
                value={templateName}
                onChange={(e): void => {
                  setTemplateName(e.target.value);
                }}
                className={TEXT_INPUT_CLASS}
                autoComplete="off"
                disabled={isUploading}
              />
            </div>
            <div>
              <label htmlFor={fileInputId} className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
                PowerPoint file (.pptx)
              </label>
              <input
                id={fileInputId}
                type="file"
                accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="mt-1 block w-full text-[15px] text-neutral-800 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-[14px] file:font-medium file:text-neutral-900 hover:file:bg-neutral-200 dark:text-neutral-200 dark:file:bg-white/10 dark:file:text-neutral-50 dark:hover:file:bg-white/15"
                disabled={isUploading}
                onChange={(e): void => {
                  const next: File | undefined = e.target.files?.[0];
                  setFile(next ?? null);
                  setFormError(null);
                }}
              />
            </div>
            {formError !== null ? (
              <p className="text-[13px] text-red-700 dark:text-red-300" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isUploading || resolvedUserId === null}
              className="inline-flex items-center justify-center rounded-lg bg-[#0071e3] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff]"
            >
              {isUploading ? "Uploading…" : "Upload template"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
