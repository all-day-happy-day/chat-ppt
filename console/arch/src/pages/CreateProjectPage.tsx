import { type ChangeEvent, type FormEvent,useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { verifySession } from "../api/auth";
import { createProject } from "../api/project";
import { listTemplatesByUserId, readTemplateFromUpload } from "../api/template";
import { listUsers } from "../api/user";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import { AUTH_FIELD_CLASS, AUTH_SELECT_FIELD_CLASS } from "../lib/auth-screen-classes";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetTemplateResponse } from "../types/template";

const USER_RESOLVE_ERROR: string = "We could not match your signed-in user to an account in this workspace.";

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

const NEW_TEMPLATE_SELECT_VALUE: string = "__new_template__";

const TEMPLATE_SELECT_PLACEHOLDER: string = "Select template";

const CREATE_PROJECT_TEMPLATE_LISTBOX_ID: string = "create-project-template-listbox";

const CREATE_PROJECT_TEMPLATE_MENU_OPTION_CLASS: string =
  "flex w-full flex-col gap-0.5 rounded-lg px-3.5 py-2.5 text-left text-[15px] text-neutral-900 outline-none transition hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 dark:focus-visible:ring-[#0a84ff]";

const CREATE_PROJECT_TEMPLATE_MENU_OPTION_SELECTED_CLASS: string = "bg-neutral-100 dark:bg-white/10";

const PPTX_ACCEPT_ATTRIBUTE: string = ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";

const formatTemplateCreatedForList = (iso: string): string => {
  const parsed: Date = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
};

const mergeTemplateIntoList = (previous: GetTemplateResponse[], next: GetTemplateResponse): GetTemplateResponse[] => {
  const withoutDuplicate: GetTemplateResponse[] = previous.filter(
    (item: GetTemplateResponse) => item.template_id !== next.template_id
  );
  return [...withoutDuplicate, next].sort((a: GetTemplateResponse, b: GetTemplateResponse) => {
    const aTime: number = new Date(a.created_at).getTime();
    const bTime: number = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
};

export const CreateProjectPage = () => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<GetTemplateResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isNewTemplatePanelOpen, setIsNewTemplatePanelOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [newTemplateFileInputKey, setNewTemplateFileInputKey] = useState<number>(0);
  const [newTemplatePanelError, setNewTemplatePanelError] = useState<string | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState<boolean>(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState<boolean>(false);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);

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

  const closeNewTemplatePanel = useCallback((): void => {
    setIsNewTemplatePanelOpen(false);
    setNewTemplateName("");
    setNewTemplateFile(null);
    setNewTemplatePanelError(null);
    setNewTemplateFileInputKey((key: number) => key + 1);
  }, []);

  useEffect(() => {
    if (!isTemplateMenuOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      const root: HTMLDivElement | null = templateMenuRef.current;
      if (root === null || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        setIsTemplateMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isTemplateMenuOpen]);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    setIsTemplateMenuOpen(false);
  }, [isSubmitting]);

  useEffect(() => {
    if (!isTemplateMenuOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsTemplateMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTemplateMenuOpen]);

  useEffect(() => {
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      setResolvedUserId(null);
      setTemplates([]);
      try {
        const session = await verifySession();
        const users = await listUsers();
        const userId: string | null = findUserIdByPrincipal(session.principal, users);
        if (userId === null) {
          if (!cancelled) {
            setLoadError(USER_RESOLVE_ERROR);
          }
          return;
        }
        if (!cancelled) {
          setResolvedUserId(userId);
        }
        try {
          const templateList: GetTemplateResponse[] = await listTemplatesByUserId(userId);
          if (!cancelled) {
            setTemplates(templateList);
          }
        } catch (templateError: unknown) {
          if (cancelled) {
            return;
          }
          if (isSignInRequiredError(templateError)) {
            handleSessionExpiredNavigation();
            return;
          }
          if (!cancelled) {
            setTemplates([]);
          }
        }
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
  }, [handleSessionExpiredNavigation]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setFormError(null);
      if (resolvedUserId === null) {
        setFormError("Your account could not be loaded. Try refreshing the page.");
        return;
      }
      const trimmedName: string = name.trim();
      if (trimmedName.length === 0) {
        setFormError("Enter a name for the project.");
        return;
      }
      if (templateId.length === 0) {
        setFormError("Choose a PowerPoint template.");
        return;
      }
      setIsSubmitting(true);
      try {
        const created = await createProject({
          name: trimmedName,
          user_id: resolvedUserId,
          template_id: templateId,
        });
        navigate(`/projects/${created.id}`, { replace: true });
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string = error instanceof Error ? error.message : "Something went wrong.";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [resolvedUserId, name, templateId, navigate, handleSessionExpiredNavigation]
  );

  const handleTemplateOptionPick = useCallback((value: string): void => {
    setIsTemplateMenuOpen(false);
    if (value === NEW_TEMPLATE_SELECT_VALUE) {
      setIsNewTemplatePanelOpen(true);
      setNewTemplatePanelError(null);
      return;
    }
    setTemplateId(value);
    setFormError(null);
  }, []);

  const handleTemplateTriggerClick = useCallback((): void => {
    if (isSubmitting) {
      return;
    }
    setIsTemplateMenuOpen((open: boolean) => !open);
  }, [isSubmitting]);

  const handleNewTemplateFileChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile: File | undefined = event.target.files?.[0];
    setNewTemplateFile(nextFile ?? null);
    setNewTemplatePanelError(null);
  }, []);

  const handleAddTemplateSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setNewTemplatePanelError(null);
      if (resolvedUserId === null) {
        setNewTemplatePanelError("Your account could not be loaded. Try refreshing the page.");
        return;
      }
      const trimmedTemplateName: string = newTemplateName.trim();
      if (trimmedTemplateName.length === 0) {
        setNewTemplatePanelError("Enter a name for the template.");
        return;
      }
      if (newTemplateFile === null) {
        setNewTemplatePanelError("Choose a .pptx file.");
        return;
      }
      setIsUploadingTemplate(true);
      try {
        const uploaded: GetTemplateResponse = await readTemplateFromUpload(
          resolvedUserId,
          newTemplateFile,
          trimmedTemplateName
        );
        setTemplates((prev: GetTemplateResponse[]) => mergeTemplateIntoList(prev, uploaded));
        setTemplateId(uploaded.template_id);
        closeNewTemplatePanel();
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string = error instanceof Error ? error.message : "Something went wrong.";
        setNewTemplatePanelError(message);
      } finally {
        setIsUploadingTemplate(false);
      }
    },
    [resolvedUserId, newTemplateName, newTemplateFile, closeNewTemplatePanel, handleSessionExpiredNavigation]
  );

  const canShowForm: boolean = !isLoading && loadError === null && resolvedUserId !== null;

  const isCreateDisabled: boolean = isSubmitting || templateId.length === 0;

  const selectedTemplateDisplay: string = useMemo((): string => {
    if (templateId.length === 0) {
      return TEMPLATE_SELECT_PLACEHOLDER;
    }
    const match: GetTemplateResponse | undefined = templates.find(
      (item: GetTemplateResponse) => item.template_id === templateId
    );
    if (match === undefined) {
      return TEMPLATE_SELECT_PLACEHOLDER;
    }
    return match.name;
  }, [templateId, templates]);

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
          <span className="shrink-0 text-[15px] font-medium text-neutral-500 dark:text-neutral-400">New project</span>
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
        <div
          className={`mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 lg:flex-row lg:items-stretch ${isNewTemplatePanelOpen ? "lg:justify-between" : "lg:justify-center"}`}
        >
          <div className="flex w-full max-w-md flex-col justify-center">
            <h1 className="text-center text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              New project
            </h1>
            <p className="mt-2 text-center text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Choose a template for this project. Add a new one from the list when you need it.
            </p>

            {isLoading ? (
              <p className="mt-10 text-center text-[15px] text-neutral-500 dark:text-neutral-400">Loading…</p>
            ) : null}

            {loadError !== null ? (
              <p
                className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-center text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
                role="alert"
              >
                {loadError}
              </p>
            ) : null}

            {canShowForm ? (
              <div className="mt-8 w-full rounded-3xl border border-black/[0.06] bg-white px-8 py-9 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
                <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                      htmlFor="create-project-name"
                    >
                      Name
                    </label>
                    <input
                      id="create-project-name"
                      name="name"
                      type="text"
                      autoComplete="off"
                      className={AUTH_FIELD_CLASS}
                      placeholder="Project name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                      }}
                      disabled={isSubmitting}
                      aria-invalid={formError !== null}
                    />
                  </div>
                  <div ref={templateMenuRef} className="flex flex-col gap-1.5">
                    <label
                      className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                      htmlFor="create-project-template-trigger"
                    >
                      Template
                    </label>
                    <div className="relative">
                      <button
                        id="create-project-template-trigger"
                        type="button"
                        className={`${AUTH_SELECT_FIELD_CLASS} flex min-h-0 w-full items-center justify-between gap-2 text-left`}
                        aria-haspopup="listbox"
                        aria-expanded={isTemplateMenuOpen}
                        aria-controls={CREATE_PROJECT_TEMPLATE_LISTBOX_ID}
                        aria-invalid={formError !== null}
                        disabled={isSubmitting}
                        onClick={handleTemplateTriggerClick}
                      >
                        <span className="min-w-0 flex-1 truncate">{selectedTemplateDisplay}</span>
                      </button>
                      {isTemplateMenuOpen ? (
                        <ul
                          id={CREATE_PROJECT_TEMPLATE_LISTBOX_ID}
                          role="listbox"
                          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 list-none overflow-y-auto rounded-xl border border-neutral-300 bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-[#2c2c2e]"
                        >
                          <li role="none">
                            <button
                              type="button"
                              role="option"
                              aria-selected={templateId.length === 0}
                              className={`${CREATE_PROJECT_TEMPLATE_MENU_OPTION_CLASS} ${templateId.length === 0 ? CREATE_PROJECT_TEMPLATE_MENU_OPTION_SELECTED_CLASS : ""}`}
                              onClick={() => {
                                handleTemplateOptionPick("");
                              }}
                            >
                              {TEMPLATE_SELECT_PLACEHOLDER}
                            </button>
                          </li>
                          {templates.map((template: GetTemplateResponse) => {
                            const createdLabel: string = formatTemplateCreatedForList(template.created_at);
                            const isSelected: boolean = template.template_id === templateId;
                            return (
                              <li key={template.template_id} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  className={`${CREATE_PROJECT_TEMPLATE_MENU_OPTION_CLASS} ${isSelected ? CREATE_PROJECT_TEMPLATE_MENU_OPTION_SELECTED_CLASS : ""}`}
                                  onClick={() => {
                                    handleTemplateOptionPick(template.template_id);
                                  }}
                                >
                                  <span className="font-medium">{template.name}</span>
                                  <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
                                    {createdLabel}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                          <li role="none" className="mt-1 border-t border-neutral-200 pt-1 dark:border-white/10">
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              className={CREATE_PROJECT_TEMPLATE_MENU_OPTION_CLASS}
                              onClick={() => {
                                handleTemplateOptionPick(NEW_TEMPLATE_SELECT_VALUE);
                              }}
                            >
                              + New template
                            </button>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  </div>
                  {formError !== null ? (
                    <p
                      className="rounded-xl bg-red-500/10 px-4 py-3 text-left text-[13px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
                      role="alert"
                    >
                      {formError}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className="flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-transparent px-3.5 text-[13px] font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
                      onClick={handleBackToProjects}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex h-9 items-center justify-center rounded-lg bg-[#0071e3] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
                      disabled={isCreateDisabled}
                    >
                      {isSubmitting ? "Creating…" : "Create project"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>

          {isNewTemplatePanelOpen ? (
            <aside
              className="flex w-full max-w-md shrink-0 flex-col justify-center rounded-3xl border border-black/[0.06] bg-white px-8 py-9 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:shadow-[0_2px_24px_rgba(0,0,0,0.45)]"
              aria-label="Add new template"
            >
              <h2 className="text-[20px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                New template
              </h2>
              <p className="mt-1 text-[14px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Name it and upload a .pptx. It appears in the list when done.
              </p>
              <form className="mt-6 flex flex-col gap-4" onSubmit={handleAddTemplateSubmit} noValidate>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                    htmlFor="new-template-name"
                  >
                    Template name
                  </label>
                  <input
                    id="new-template-name"
                    name="template_name"
                    type="text"
                    autoComplete="off"
                    className={AUTH_FIELD_CLASS}
                    placeholder="e.g. Quarterly review"
                    value={newTemplateName}
                    onChange={(e) => {
                      setNewTemplateName(e.target.value);
                    }}
                    disabled={isUploadingTemplate}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                    htmlFor="new-template-file"
                  >
                    Template file
                  </label>
                  <input
                    key={newTemplateFileInputKey}
                    id="new-template-file"
                    name="template_file"
                    type="file"
                    accept={PPTX_ACCEPT_ATTRIBUTE}
                    className="w-full text-[15px] text-neutral-800 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-[14px] file:font-medium file:text-neutral-900 hover:file:bg-neutral-200 dark:text-neutral-200 dark:file:bg-white/10 dark:file:text-neutral-50 dark:hover:file:bg-white/15"
                    onChange={handleNewTemplateFileChange}
                    disabled={isUploadingTemplate}
                  />
                  {newTemplateFile !== null ? (
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      Selected: {newTemplateFile.name}
                    </p>
                  ) : null}
                </div>
                {newTemplatePanelError !== null ? (
                  <p
                    className="rounded-xl bg-red-500/10 px-4 py-3 text-left text-[13px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
                    role="alert"
                  >
                    {newTemplatePanelError}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-transparent px-3.5 text-[13px] font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
                    onClick={closeNewTemplatePanel}
                    disabled={isUploadingTemplate}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex h-9 items-center justify-center rounded-lg bg-[#0071e3] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
                    disabled={isUploadingTemplate}
                  >
                    {isUploadingTemplate ? "Uploading…" : "Add template"}
                  </button>
                </div>
              </form>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
};
