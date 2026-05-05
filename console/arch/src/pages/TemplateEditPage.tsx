import {
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { verifySession } from "../api/auth";
import { changeTemplateName, deleteTemplateById, listTemplatesByUserId } from "../api/template";
import { listUsers } from "../api/user";
import { ConfirmationCodeDeleteDialog } from "../components/ConfirmationCodeDeleteDialog";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import { generateDestructiveConfirmCode } from "../lib/destructive-confirm-code";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetTemplateResponse } from "../types/template";
import type { GetUserResponse } from "../types/user";

const TEXT_INPUT_CLASS: string =
  "mt-1 w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.14] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

const TEMPLATE_DELETE_DESCRIPTION: string =
  "This permanently deletes this PowerPoint template from your library. Projects that still reference it may be affected. You cannot undo this action.";

export const TemplateEditPage = (): ReactElement => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const nameInputId: string = useId();
  const deleteConfirmInputId: string = useId();
  const templateDeleteDialogRef = useRef<HTMLDialogElement | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [template, setTemplate] = useState<GetTemplateResponse | null>(null);
  const [draftName, setDraftName] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string>("");
  const [typedDeleteConfirm, setTypedDeleteConfirm] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleToggleTheme = useCallback((): void => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSessionExpiredNavigation = useCallback((): void => {
    setSessionExpiredRedirect();
    navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (templateId === undefined || templateId.length === 0) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      setTemplate(null);
      setDraftName("");
      try {
        const session = await verifySession();
        if (cancelled) {
          return;
        }
        const users: GetUserResponse[] = await listUsers();
        if (cancelled) {
          return;
        }
        const resolvedId: string | null = findUserIdByPrincipal(session.principal, users);
        if (resolvedId === null) {
          setLoadError("We could not match your signed-in user to an account in this workspace.");
          return;
        }
        const templates: GetTemplateResponse[] = await listTemplatesByUserId(resolvedId);
        if (cancelled) {
          return;
        }
        const match: GetTemplateResponse | undefined = templates.find(
          (row: GetTemplateResponse): boolean => row.template_id === templateId
        );
        if (match === undefined) {
          setLoadError("This template was not found. It may have been deleted.");
          return;
        }
        setTemplate(match);
        setDraftName(match.name);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        setLoadError(readableClientFetchFailureMessage(error, WORKSPACE_LOAD_NETWORK_FALLBACK));
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
  }, [templateId, navigate, handleSessionExpiredNavigation]);

  const handleSave = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (template === null || templateId === undefined || templateId.length === 0) {
        return;
      }
      const nextName: string = draftName.trim();
      if (nextName.length === 0) {
        setSaveError("Enter a template name.");
        return;
      }
      setSaveError(null);
      setIsSaving(true);
      try {
        const updated: GetTemplateResponse = await changeTemplateName(templateId, nextName);
        setTemplate(updated);
        setDraftName(updated.name);
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        setSaveError(error instanceof Error ? error.message : "Could not save the template name.");
      } finally {
        setIsSaving(false);
      }
    },
    [template, templateId, draftName, handleSessionExpiredNavigation]
  );

  const handleOpenTemplateDeleteDialog = useCallback((): void => {
    setDeleteConfirmCode(generateDestructiveConfirmCode());
    setTypedDeleteConfirm("");
    setDeleteError(null);
    const dialogEl: HTMLDialogElement | null = templateDeleteDialogRef.current;
    if (dialogEl !== null && typeof dialogEl.showModal === "function" && !dialogEl.open) {
      dialogEl.showModal();
    }
  }, []);

  const handleTemplateDeleteDialogClose = useCallback((): void => {
    setDeleteError(null);
    setTypedDeleteConfirm("");
  }, []);

  const handleTypedTemplateDeleteConfirmChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setTypedDeleteConfirm(event.target.value);
    setDeleteError(null);
  }, []);

  const handleCancelTemplateDelete = useCallback((): void => {
    templateDeleteDialogRef.current?.close();
  }, []);

  const handleConfirmTemplateDelete = useCallback((): void => {
    if (templateId === undefined || templateId.length === 0) {
      return;
    }
    if (typedDeleteConfirm !== deleteConfirmCode) {
      setDeleteError("The code does not match. Try again.");
      return;
    }
    void (async (): Promise<void> => {
      setIsDeleting(true);
      setDeleteError(null);
      try {
        await deleteTemplateById(templateId);
        templateDeleteDialogRef.current?.close();
        navigate("/", { replace: true });
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          templateDeleteDialogRef.current?.close();
          handleSessionExpiredNavigation();
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not delete the template. Try again after refreshing.";
        setDeleteError(message);
      } finally {
        setIsDeleting(false);
      }
    })();
  }, [templateId, typedDeleteConfirm, deleteConfirmCode, navigate, handleSessionExpiredNavigation]);

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
          <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Edit template</span>
        </div>
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>
      <nav className="border-b border-black/[0.06] px-6 py-3 dark:border-white/[0.08]" aria-label="Back">
        <Link
          to="/"
          className="text-[15px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
        >
          ‹ Projects
        </Link>
      </nav>
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Template name
        </h1>
        {loadError !== null ? (
          <p className="mt-6 text-[14px] text-red-700 dark:text-red-300" role="alert">
            {loadError}
          </p>
        ) : null}
        {isLoading ? (
          <p className="mt-8 text-[15px] text-neutral-500 dark:text-neutral-400">Loading…</p>
        ) : template !== null ? (
          <form className="mt-8 flex flex-col gap-6" onSubmit={handleSave}>
            <div>
              <label htmlFor={nameInputId} className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
                Name
              </label>
              <input
                id={nameInputId}
                type="text"
                value={draftName}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                  setDraftName(event.target.value);
                }}
                className={TEXT_INPUT_CLASS}
                autoComplete="off"
                disabled={isSaving || isDeleting}
              />
            </div>
            {saveError !== null ? (
              <p className="text-[13px] text-red-700 dark:text-red-300" role="alert">
                {saveError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving || isDeleting || draftName.trim() === template.name.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-[#0071e3] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff]"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleOpenTemplateDeleteDialog}
                disabled={isSaving || isDeleting}
                className="inline-flex items-center justify-center rounded-lg border border-red-500/40 px-4 py-2 text-[13px] font-medium text-red-700 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/15"
              >
                Delete template
              </button>
            </div>
          </form>
        ) : null}
      </main>
      <ConfirmationCodeDeleteDialog
        dialogRef={templateDeleteDialogRef}
        title="Delete template?"
        entityName={template?.name ?? ""}
        description={TEMPLATE_DELETE_DESCRIPTION}
        confirmCode={deleteConfirmCode}
        typedConfirmCode={typedDeleteConfirm}
        onTypedConfirmChange={handleTypedTemplateDeleteConfirmChange}
        confirmInputId={deleteConfirmInputId}
        confirmInputName="template-delete-confirm-code"
        deleteError={deleteError}
        isDeleting={isDeleting}
        confirmButtonLabel="Delete template"
        onClose={handleTemplateDeleteDialogClose}
        onCancel={handleCancelTemplateDelete}
        onConfirm={handleConfirmTemplateDelete}
      />
    </div>
  );
};
