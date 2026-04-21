import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { signOut, verifySession } from "../api/auth";
import { deleteProjectById, listProjectsByUserId, patchProjectById } from "../api/project";
import { listTemplatesByUserId } from "../api/template";
import { listUsers } from "../api/user";
import { WorkspaceHeader } from "./project-workspace/WorkspaceHeader";
import { ProjectDeleteDialog } from "./project-workspace/ProjectDeleteDialog";
import { TemplateChangeWarningDialog } from "./project-workspace/TemplateChangeWarningDialog";
import { AUTH_FIELD_CLASS } from "../lib/auth-screen-classes";
import { isSignInRequiredError } from "../lib/auth-errors";
import { generateDestructiveConfirmCode } from "../lib/destructive-confirm-code";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetProjectResponse } from "../types/project";
import type { GetTemplateResponse } from "../types/template";
import type { GetUserResponse } from "../types/user";

const USER_RESOLVE_ERROR: string = "We could not match your signed-in user to an account in this workspace.";

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

const SETTINGS_SECTION_TITLE_CLASS: string =
  "text-[13px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400";

const SETTINGS_PRIMARY_BUTTON_CLASS: string =
  "inline-flex h-9 items-center justify-center rounded-lg bg-[#0071e3] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]";

export const ProjectSettingsPage = () => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const deleteConfirmInputId: string = useId();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [principal, setPrincipal] = useState<string | null>(null);
  const [isSessionAdmin, setIsSessionAdmin] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [project, setProject] = useState<GetProjectResponse | null>(null);
  const [templates, setTemplates] = useState<GetTemplateResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [draftName, setDraftName] = useState<string>("");
  const [draftTemplateId, setDraftTemplateId] = useState<string>("");
  const [saveNameError, setSaveNameError] = useState<string | null>(null);
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [projectDeleteError, setProjectDeleteError] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState<boolean>(false);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string>("");
  const [typedDeleteConfirm, setTypedDeleteConfirm] = useState<string>("");
  const templateWarningDialogRef: RefObject<HTMLDialogElement | null> = useRef<HTMLDialogElement | null>(null);
  const projectDeleteDialogRef: RefObject<HTMLDialogElement | null> = useRef<HTMLDialogElement | null>(null);

  const handleToggleTheme = useCallback((): void => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSessionExpiredNavigation = useCallback((): void => {
    setSessionExpiredRedirect();
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

  const handleSignOutClick = useCallback((): void => {
    void (async (): Promise<void> => {
      setIsSigningOut(true);
      try {
        await signOut();
      } catch {
        // Session may already be invalid or the network failed; still return to the home shell.
      } finally {
        setIsSigningOut(false);
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (projectId === undefined || projectId.length === 0) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      setProject(null);
      setTemplates([]);
      setDraftName("");
      setDraftTemplateId("");
      try {
        const session = await verifySession();
        if (cancelled) {
          return;
        }
        setPrincipal(session.principal);
        const users: GetUserResponse[] = await listUsers();
        const resolvedId: string | null = findUserIdByPrincipal(session.principal, users);
        if (resolvedId === null) {
          if (!cancelled) {
            setLoadError(USER_RESOLVE_ERROR);
          }
          return;
        }
        const self: GetUserResponse | undefined = users.find((row: GetUserResponse) => row.id === resolvedId);
        if (!cancelled) {
          setIsSessionAdmin(self?.role === "ADMIN");
        }
        const projectList: GetProjectResponse[] = await listProjectsByUserId(resolvedId);
        if (cancelled) {
          return;
        }
        const match: GetProjectResponse | undefined = projectList.find(
          (row: GetProjectResponse) => row.id === projectId
        );
        if (match === undefined) {
          navigate("/", { replace: true });
          return;
        }
        let templateList: GetTemplateResponse[] = [];
        try {
          templateList = await listTemplatesByUserId(resolvedId);
        } catch (templateErr: unknown) {
          if (isSignInRequiredError(templateErr)) {
            handleSessionExpiredNavigation();
            return;
          }
          templateList = [];
        }
        if (cancelled) {
          return;
        }
        setProject(match);
        setDraftName(match.name);
        setDraftTemplateId(match.template_id);
        setTemplates(templateList);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string = readableClientFetchFailureMessage(error, WORKSPACE_LOAD_NETWORK_FALLBACK);
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
  }, [projectId, navigate, handleSessionExpiredNavigation]);

  useEffect(() => {
    return () => {
      templateWarningDialogRef.current?.close();
      projectDeleteDialogRef.current?.close();
    };
  }, []);

  const handleDraftNameChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setDraftName(event.target.value);
    setSaveNameError(null);
  }, []);

  const handleDraftTemplateChange = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setDraftTemplateId(event.target.value);
    setSaveTemplateError(null);
  }, []);

  const handleSaveProjectName = useCallback((): void => {
    if (project === null) {
      return;
    }
    const trimmed: string = draftName.trim();
    if (trimmed.length === 0) {
      setSaveNameError("Enter a project name.");
      return;
    }
    if (trimmed === project.name) {
      return;
    }
    void (async (): Promise<void> => {
      setIsSavingName(true);
      setSaveNameError(null);
      try {
        const updated: GetProjectResponse = await patchProjectById(project.id, { name: trimmed });
        setProject(updated);
        setDraftName(updated.name);
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not update the project name. Try again after refreshing.";
        setSaveNameError(message);
      } finally {
        setIsSavingName(false);
      }
    })();
  }, [project, draftName, handleSessionExpiredNavigation]);

  const handleRequestTemplateChange = useCallback((): void => {
    if (project === null) {
      return;
    }
    if (draftTemplateId === project.template_id) {
      return;
    }
    setSaveTemplateError(null);
    const dialogEl: HTMLDialogElement | null = templateWarningDialogRef.current;
    if (dialogEl !== null && typeof dialogEl.showModal === "function" && !dialogEl.open) {
      dialogEl.showModal();
    }
  }, [project, draftTemplateId]);

  const handleTemplateWarningDialogClose = useCallback((): void => {
    setSaveTemplateError(null);
  }, []);

  const handleCancelTemplateWarning = useCallback((): void => {
    templateWarningDialogRef.current?.close();
  }, []);

  const handleConfirmTemplateChange = useCallback((): void => {
    if (project === null) {
      return;
    }
    templateWarningDialogRef.current?.close();
    void (async (): Promise<void> => {
      setIsSavingTemplate(true);
      setSaveTemplateError(null);
      try {
        const updated: GetProjectResponse = await patchProjectById(project.id, { template_id: draftTemplateId });
        setProject(updated);
        setDraftTemplateId(updated.template_id);
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not change the template. Try again after refreshing.";
        setSaveTemplateError(message);
      } finally {
        setIsSavingTemplate(false);
      }
    })();
  }, [project, draftTemplateId, handleSessionExpiredNavigation]);

  const handleOpenProjectDeleteDialog = useCallback((): void => {
    setDeleteConfirmCode(generateDestructiveConfirmCode());
    setTypedDeleteConfirm("");
    setProjectDeleteError(null);
    const dialogEl: HTMLDialogElement | null = projectDeleteDialogRef.current;
    if (dialogEl !== null && typeof dialogEl.showModal === "function" && !dialogEl.open) {
      dialogEl.showModal();
    }
  }, []);

  const handleProjectDeleteDialogClose = useCallback((): void => {
    setProjectDeleteError(null);
    setTypedDeleteConfirm("");
  }, []);

  const handleTypedDeleteConfirmChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setTypedDeleteConfirm(event.target.value);
    setProjectDeleteError(null);
  }, []);

  const handleCancelProjectDelete = useCallback((): void => {
    projectDeleteDialogRef.current?.close();
  }, []);

  const handleConfirmProjectDelete = useCallback((): void => {
    if (project === null) {
      return;
    }
    if (typedDeleteConfirm !== deleteConfirmCode) {
      setProjectDeleteError("The code does not match. Try again.");
      return;
    }
    void (async (): Promise<void> => {
      setIsDeletingProject(true);
      setProjectDeleteError(null);
      try {
        await deleteProjectById(project.id);
        projectDeleteDialogRef.current?.close();
        navigate("/", { replace: true });
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          projectDeleteDialogRef.current?.close();
          handleSessionExpiredNavigation();
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not delete the project. Try again after refreshing.";
        setProjectDeleteError(message);
      } finally {
        setIsDeletingProject(false);
      }
    })();
  }, [project, typedDeleteConfirm, deleteConfirmCode, navigate, handleSessionExpiredNavigation]);

  const templateSelectRows: GetTemplateResponse[] = useMemo((): GetTemplateResponse[] => {
    if (project === null) {
      return templates;
    }
    const hasCurrent: boolean = templates.some((row: GetTemplateResponse) => row.template_id === project.template_id);
    if (hasCurrent) {
      return templates;
    }
    const fallback: GetTemplateResponse = {
      template_id: project.template_id,
      user_id: project.user_id,
      name: `Template ${project.template_id}`,
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
    return [...templates, fallback];
  }, [project, templates]);

  const isSaveNameDisabled: boolean =
    project === null || isSavingName || draftName.trim().length === 0 || draftName.trim() === project.name;

  const isApplyTemplateDisabled: boolean =
    project === null || isSavingTemplate || draftTemplateId === project.template_id || templateSelectRows.length === 0;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#fbfbfa] dark:bg-[#191919]">
      <WorkspaceHeader
        principal={principal}
        isSessionAdmin={isSessionAdmin}
        isSigningOut={isSigningOut}
        theme={theme}
        onGoHome={handleGoHome}
        onToggleTheme={handleToggleTheme}
        onSignOut={handleSignOutClick}
      />
      <nav
        className="flex min-w-0 shrink-0 items-center gap-3 border-b border-neutral-200/70 px-6 py-2.5 dark:border-white/[0.06]"
        aria-label="Project settings navigation"
      >
        {project !== null ? (
          <Link
            to={`/projects/${project.id}`}
            className="shrink-0 text-[15px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
          >
            ‹ Back to project
          </Link>
        ) : (
          <span className="text-[15px] text-neutral-400">…</span>
        )}
      </nav>
      <main className="mx-auto w-full max-w-[min(40rem,calc(100vw-2rem))] flex-1 px-6 py-8 sm:py-10">
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Project settings
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Name, template, and deleting this project.
        </p>
        {isLoading ? <p className="mt-10 text-[15px] text-neutral-500 dark:text-neutral-400">Loading…</p> : null}
        {loadError !== null ? (
          <p
            className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}
        {!isLoading && loadError === null && project !== null ? (
          <div className="mt-10 flex flex-col gap-10">
            <section aria-labelledby="project-settings-name-heading">
              <h2 id="project-settings-name-heading" className={SETTINGS_SECTION_TITLE_CLASS}>
                Project name
              </h2>
              <label
                className="mt-3 block text-[14px] font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="project-settings-name-input"
              >
                Name
              </label>
              <input
                id="project-settings-name-input"
                name="project-name"
                type="text"
                className={`${AUTH_FIELD_CLASS} mt-2`}
                value={draftName}
                onChange={handleDraftNameChange}
                disabled={isSavingName}
                autoComplete="off"
              />
              {saveNameError !== null ? (
                <p className="mt-2 text-[13px] text-red-700 dark:text-red-300" role="alert">
                  {saveNameError}
                </p>
              ) : null}
              <button
                type="button"
                className={`${SETTINGS_PRIMARY_BUTTON_CLASS} mt-4`}
                disabled={isSaveNameDisabled}
                onClick={handleSaveProjectName}
              >
                {isSavingName ? "Saving…" : "Save name"}
              </button>
            </section>
            <section aria-labelledby="project-settings-template-heading">
              <h2 id="project-settings-template-heading" className={SETTINGS_SECTION_TITLE_CLASS}>
                Template
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Slides for this project use layouts from the template you choose. Changing template removes all existing
                parts.
              </p>
              {templateSelectRows.length === 0 ? (
                <p className="mt-3 text-[14px] text-amber-800 dark:text-amber-200/90" role="status">
                  No templates were found. Upload a template from the app home flow first.
                </p>
              ) : (
                <>
                  <label
                    className="mt-3 block text-[14px] font-medium text-neutral-700 dark:text-neutral-300"
                    htmlFor="project-settings-template-select"
                  >
                    Template
                  </label>
                  <select
                    id="project-settings-template-select"
                    name="project-template"
                    className={`${AUTH_FIELD_CLASS} mt-2 appearance-auto`}
                    value={draftTemplateId}
                    onChange={handleDraftTemplateChange}
                    disabled={isSavingTemplate}
                  >
                    {templateSelectRows.map((row: GetTemplateResponse) => (
                      <option key={row.template_id} value={row.template_id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {saveTemplateError !== null ? (
                <p className="mt-2 text-[13px] text-red-700 dark:text-red-300" role="alert">
                  {saveTemplateError}
                </p>
              ) : null}
              <button
                type="button"
                className={`${SETTINGS_PRIMARY_BUTTON_CLASS} mt-4`}
                disabled={isApplyTemplateDisabled}
                onClick={handleRequestTemplateChange}
              >
                Change template…
              </button>
            </section>
            <section
              className="border-t border-neutral-200/90 pt-8 dark:border-white/[0.08]"
              aria-labelledby="project-settings-danger-heading"
            >
              <h2 id="project-settings-danger-heading" className={SETTINGS_SECTION_TITLE_CLASS}>
                Danger zone
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Permanently delete this project and all of its parts. You will need to type a confirmation code.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3.5 text-[13px] font-medium text-red-700 outline-none transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/35 dark:bg-[#2c2c2e] dark:text-red-300 dark:hover:bg-red-500/10 dark:focus-visible:ring-red-400/40"
                disabled={isDeletingProject}
                onClick={handleOpenProjectDeleteDialog}
              >
                Delete project…
              </button>
            </section>
          </div>
        ) : null}
      </main>
      <TemplateChangeWarningDialog
        dialogRef={templateWarningDialogRef}
        onClose={handleTemplateWarningDialogClose}
        onCancel={handleCancelTemplateWarning}
        onContinue={handleConfirmTemplateChange}
      />
      {project !== null ? (
        <ProjectDeleteDialog
          dialogRef={projectDeleteDialogRef}
          projectName={project.name}
          confirmCode={deleteConfirmCode}
          typedConfirmCode={typedDeleteConfirm}
          onTypedConfirmChange={handleTypedDeleteConfirmChange}
          confirmInputId={deleteConfirmInputId}
          deleteError={projectDeleteError}
          isDeleting={isDeletingProject}
          onClose={handleProjectDeleteDialogClose}
          onCancel={handleCancelProjectDelete}
          onConfirm={handleConfirmProjectDelete}
        />
      ) : null}
    </div>
  );
};
