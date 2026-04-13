import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, verifySession } from "../api/auth";
import { listProjectsByUserId } from "../api/project";
import { listUsers } from "../api/user";
import { AccountMenu } from "../components/AccountMenu";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetProjectResponse } from "../types/project";
import type { GetUserResponse } from "../types/user";

const DATE_FORMATTER: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const resolveCreatedByUsername = (users: GetUserResponse[], ownerUserId: string): string => {
  const match: GetUserResponse | undefined = users.find((user: GetUserResponse) => user.id === ownerUserId);
  if (match === undefined) {
    return ownerUserId.length > 0 ? ownerUserId : "Unknown";
  }
  return match.username;
};

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

export type ProjectsPageProps = {
  onGoHome: () => void;
  onSessionExpired: () => void;
  onSignOut: () => void;
};

export const ProjectsPage = ({ onGoHome, onSessionExpired, onSignOut }: ProjectsPageProps) => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [projects, setProjects] = useState<GetProjectResponse[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<GetUserResponse[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const loadWorkspace = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const session = await verifySession();
      setPrincipal(session.principal);
      const users: GetUserResponse[] = await listUsers();
      setWorkspaceUsers(users);
      const resolvedId: string | null = findUserIdByPrincipal(session.principal, users);
      if (resolvedId === null) {
        setUserId(null);
        setProjects([]);
        setLoadError("We could not match your signed-in user to an account in this workspace.");
        return;
      }
      setUserId(resolvedId);
      const projectList: GetProjectResponse[] = await listProjectsByUserId(resolvedId);
      setProjects(projectList);
    } catch (error: unknown) {
      if (isSignInRequiredError(error)) {
        onSessionExpired();
        return;
      }
      const message: string = readableClientFetchFailureMessage(error, WORKSPACE_LOAD_NETWORK_FALLBACK);
      setLoadError(message);
      setUserId(null);
      setProjects([]);
      setWorkspaceUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleSignOutClick = useCallback((): void => {
    void (async (): Promise<void> => {
      setIsSigningOut(true);
      try {
        await signOut();
      } catch {
        // Session may already be invalid or the network failed; still return to the home shell.
      } finally {
        setIsSigningOut(false);
        onSignOut();
      }
    })();
  }, [onSignOut]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
            aria-label={`${APP_DISPLAY_NAME} home`}
            onClick={onGoHome}
          >
            {APP_DISPLAY_NAME}
          </button>
          <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Projects</span>
        </div>
        <div className="flex items-center gap-3">
          {principal !== null ? (
            <AccountMenu
              principal={principal}
              isSigningOut={isSigningOut}
              onUserSettings={() => {
                navigate("/settings");
              }}
              onSignOut={handleSignOutClick}
            />
          ) : null}
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Projects</h1>
          </div>
          <button
            type="button"
            className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#0071e3] px-5 text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
            onClick={() => {
              navigate("/projects/new");
            }}
            disabled={isLoading || userId === null}
          >
            New project
          </button>
        </div>

        {loadError !== null ? (
          <p
            className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="mt-10 text-center text-[15px] text-neutral-500 dark:text-neutral-400">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="mt-10 text-center text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            No projects yet. Use New project to get started.
          </p>
        ) : (
          <ul className="mt-10 flex flex-col gap-3" aria-label="Project list">
            {projects.map((project: GetProjectResponse) => {
              const createdByUsername: string = resolveCreatedByUsername(workspaceUsers, project.user_id);
              const createdAtLabel: string = DATE_FORMATTER.format(new Date(project.created_at));
              const updatedAtLabel: string = DATE_FORMATTER.format(new Date(project.updated_at));
              return (
                <li key={project.id}>
                  <article className="rounded-2xl border border-black/[0.06] bg-white px-5 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]">
                    <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{project.name}</h2>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                      <span>{`Created by ${createdByUsername}`}</span>
                      <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
                        ·
                      </span>
                      <span>{`Created at ${createdAtLabel}`}</span>
                      <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
                        ·
                      </span>
                      <span>{`Updated at ${updatedAtLabel}`}</span>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};
