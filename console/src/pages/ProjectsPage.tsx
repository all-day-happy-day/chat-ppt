import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, verifySession } from "../api/auth";
import { listBroadSongLibrary, songIdHasLyricsWithContentInLibrary } from "../api/song";
import { listProjectsByUserId } from "../api/project";
import { listTemplatesByUserId } from "../api/template";
import { listUsers } from "../api/user";
import { AccountMenu } from "../components/AccountMenu";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { writeLibrarySongMetaToSession } from "../lib/library-song-session";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetProjectResponse } from "../types/project";
import type { GetTemplateResponse } from "../types/template";
import type { SongListItem } from "../types/song";
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
  const [isSessionAdmin, setIsSessionAdmin] = useState<boolean>(false);
  const [templates, setTemplates] = useState<GetTemplateResponse[]>([]);
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [lyricsPresenceBySongId, setLyricsPresenceBySongId] = useState<Record<string, boolean>>({});
  const [libraryLoadError, setLibraryLoadError] = useState<string | null>(null);
  const [isLibraryLoading, setIsLibraryLoading] = useState<boolean>(false);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const loadWorkspace = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    setIsSessionAdmin(false);
    try {
      const session = await verifySession();
      setPrincipal(session.principal);
      const users: GetUserResponse[] = await listUsers();
      setWorkspaceUsers(users);
      const resolvedId: string | null = findUserIdByPrincipal(session.principal, users);
      if (resolvedId === null) {
        setUserId(null);
        setProjects([]);
        setTemplates([]);
        setSongs([]);
        setLyricsPresenceBySongId({});
        setLibraryLoadError(null);
        setLoadError("We could not match your signed-in user to an account in this workspace.");
        return;
      }
      const self: GetUserResponse | undefined = users.find((row: GetUserResponse) => row.id === resolvedId);
      setIsSessionAdmin(self?.role === "ADMIN");
      setUserId(resolvedId);
      const projectList: GetProjectResponse[] = await listProjectsByUserId(resolvedId);
      setProjects(projectList);
      setLibraryLoadError(null);
      setIsLibraryLoading(true);
      try {
        const templateList: GetTemplateResponse[] = await listTemplatesByUserId(resolvedId);
        const songList: SongListItem[] = await listBroadSongLibrary();
        setTemplates(templateList);
        setSongs(songList);
        const presence: Record<string, boolean> = {};
        for (const row of songList) {
          const hasLyrics: boolean = await songIdHasLyricsWithContentInLibrary(row.id);
          presence[row.id] = hasLyrics;
        }
        setLyricsPresenceBySongId(presence);
      } catch (libraryError: unknown) {
        setTemplates([]);
        setSongs([]);
        setLyricsPresenceBySongId({});
        if (isSignInRequiredError(libraryError)) {
          onSessionExpired();
          return;
        }
        setLibraryLoadError(
          readableClientFetchFailureMessage(libraryError, "Could not load templates or songs for the library lists.")
        );
      } finally {
        setIsLibraryLoading(false);
      }
    } catch (error: unknown) {
      if (isSignInRequiredError(error)) {
        onSessionExpired();
        return;
      }
      const message: string = readableClientFetchFailureMessage(error, WORKSPACE_LOAD_NETWORK_FALLBACK);
      setLoadError(message);
      setUserId(null);
      setProjects([]);
      setTemplates([]);
      setSongs([]);
      setLyricsPresenceBySongId({});
      setLibraryLoadError(null);
      setWorkspaceUsers([]);
      setIsSessionAdmin(false);
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Projects</h1>
          </div>
          <button
            type="button"
            className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#0071e3] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
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
                  <Link
                    to={`/projects/${project.id}`}
                    className="block rounded-2xl border border-black/[0.06] bg-white px-5 py-4 shadow-sm outline-none transition hover:border-black/[0.1] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:hover:border-white/[0.12] dark:focus-visible:ring-[#0a84ff]"
                  >
                    <article>
                      <h2 className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">
                        {project.name}
                      </h2>
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
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {!isLoading && loadError === null && libraryLoadError !== null ? (
          <p
            className="mt-16 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
            role="alert"
          >
            {libraryLoadError}
          </p>
        ) : null}
        {!isLoading && loadError === null && libraryLoadError === null ? (
          <div className="mt-16 flex flex-col gap-14 border-t border-black/[0.06] pt-14 dark:border-white/[0.08]">
            <section aria-labelledby="template-list-heading">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2
                  id="template-list-heading"
                  className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
                >
                  Templates
                </h2>
                <button
                  type="button"
                  className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-black/[0.1] bg-white px-3.5 text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5"
                  onClick={() => {
                    navigate("/templates/new");
                  }}
                  disabled={userId === null}
                >
                  Add template
                </button>
              </div>
              {isLibraryLoading ? (
                <p className="mt-6 text-[14px] text-neutral-500 dark:text-neutral-400">Loading templates…</p>
              ) : templates.length === 0 ? (
                <p className="mt-6 text-[14px] text-neutral-500 dark:text-neutral-400">
                  No templates yet. Upload a .pptx to use in projects.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                  <table
                    className="w-full min-w-[36rem] border-collapse text-left text-[14px]"
                    aria-label="Template list"
                  >
                    <thead>
                      <tr className="border-b border-black/[0.06] bg-neutral-50/80 dark:border-white/[0.08] dark:bg-white/[0.04]">
                        <th className="px-4 py-2.5 font-semibold text-neutral-800 dark:text-neutral-100">Title</th>
                        <th className="px-4 py-2.5 font-semibold text-neutral-800 dark:text-neutral-100">Created</th>
                        <th className="px-4 py-2.5 font-semibold text-neutral-800 dark:text-neutral-100">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((template: GetTemplateResponse) => {
                        const createdAtLabel: string = DATE_FORMATTER.format(new Date(template.created_at));
                        const updatedAtLabel: string = DATE_FORMATTER.format(new Date(template.updated_at));
                        return (
                          <tr
                            key={template.template_id}
                            className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.06]"
                          >
                            <td className="px-4 py-2.5">
                              <Link
                                to={`/templates/${template.template_id}/edit`}
                                className="font-medium text-neutral-900 outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
                              >
                                {template.name}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{createdAtLabel}</td>
                            <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{updatedAtLabel}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section aria-labelledby="song-list-heading">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2
                  id="song-list-heading"
                  className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
                >
                  Songs
                </h2>
                <button
                  type="button"
                  className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-black/[0.1] bg-white px-3.5 text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5"
                  onClick={() => {
                    navigate("/songs/new");
                  }}
                  disabled={userId === null}
                >
                  Add song
                </button>
              </div>
              {isLibraryLoading ? (
                <p className="mt-6 text-[14px] text-neutral-500 dark:text-neutral-400">Loading songs…</p>
              ) : songs.length === 0 ? (
                <p className="mt-6 text-[14px] text-neutral-500 dark:text-neutral-400">
                  No songs in the library yet. Add one to fetch and store lyrics.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                  <table className="w-full min-w-[28rem] border-collapse text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-black/[0.06] bg-neutral-50/80 dark:border-white/[0.08] dark:bg-white/[0.04]">
                        <th className="px-4 py-2.5 font-semibold text-neutral-800 dark:text-neutral-100">Title</th>
                        <th className="px-4 py-2.5 font-semibold text-neutral-800 dark:text-neutral-100">Artist</th>
                        <th className="px-4 py-2.5 font-semibold text-neutral-800 dark:text-neutral-100">Lyrics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {songs.map((song: SongListItem) => {
                        const hasLyrics: boolean = lyricsPresenceBySongId[song.id] === true;
                        return (
                          <tr
                            key={song.id}
                            className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.06]"
                          >
                            <td className="px-4 py-2.5">
                              <Link
                                to={`/songs/${song.id}/edit`}
                                className="font-medium text-neutral-900 outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
                                onClick={(): void => {
                                  writeLibrarySongMetaToSession(song.id, {
                                    title: song.title,
                                    artist: song.artist,
                                  });
                                }}
                              >
                                {song.title}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{song.artist ?? "—"}</td>
                            <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                              {hasLyrics ? "In library" : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
};
