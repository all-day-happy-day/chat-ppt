import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetProjectResponse } from "../types/project";
import type { GetUserResponse } from "../types/user";

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

export const ProjectWorkspacePage = () => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [project, setProject] = useState<GetProjectResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isSessionAdmin, setIsSessionAdmin] = useState<boolean>(false);

  const handleToggleTheme = useCallback((): void => {
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
      setIsSessionAdmin(false);
      setPrincipal(null);
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
            setLoadError("We could not match your signed-in user to an account in this workspace.");
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
        setProject(match);
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
          <span className="shrink-0 text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Project</span>
        </div>
        <div className="flex items-center gap-3">
          {principal !== null ? (
            <AccountMenu
              principal={principal}
              isAdmin={isSessionAdmin}
              isSigningOut={isSigningOut}
              onUserSettings={() => {
                navigate("/settings");
              }}
              onManageUsers={() => {
                navigate("/users");
              }}
              onSignOut={handleSignOutClick}
            />
          ) : null}
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {isLoading ? (
          <p className="text-center text-[15px] text-neutral-500 dark:text-neutral-400">Loading project…</p>
        ) : null}

        {loadError !== null ? (
          <p
            className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {!isLoading && loadError === null && project !== null ? (
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {project.name}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              This is your project workspace. Use Projects above to return to the list.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
};
