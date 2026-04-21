import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteSongById,
  getLyricsBySongId,
  listBroadSongLibrary,
  patchLyricsInLibrary,
  patchSongMetadataInLibrary,
} from "../api/song";
import { ConfirmationCodeDeleteDialog } from "../components/ConfirmationCodeDeleteDialog";
import { LyricsSongPartsEditor } from "../components/LyricsSongPartsEditor";
import { ThemeToggle } from "../components/ThemeToggle";
import { generateDestructiveConfirmCode } from "../lib/destructive-confirm-code";
import type { LyricsSongLine } from "../lib/lyrics-part-contents";
import { ensureBlankLeadLyricsLine, normalizeEditorLyricsLines } from "../lib/lyrics-part-contents";
import { readLibrarySongMetaFromSession, writeLibrarySongMetaToSession } from "../lib/library-song-session";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { SongListItem } from "../types/song";

const TEXT_INPUT_CLASS: string =
  "mt-1 w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.14] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

const SONG_DELETE_DESCRIPTION: string =
  "This permanently deletes this song and its stored lyrics from the library. You cannot undo this action.";

export const SongEditPage = (): ReactElement => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const { songId: songIdParam } = useParams<{ songId: string }>();
  const titleInputId: string = useId();
  const artistInputId: string = useId();
  const deleteConfirmInputId: string = useId();
  const songDeleteDialogRef = useRef<HTMLDialogElement | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [songTitle, setSongTitle] = useState<string>("");
  const [songArtist, setSongArtist] = useState<string>("");
  const [draftLines, setDraftLines] = useState<LyricsSongLine[]>([]);
  const [baselineJson, setBaselineJson] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string>("");
  const [typedDeleteConfirm, setTypedDeleteConfirm] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const songId: string = songIdParam ?? "";

  const handleToggleTheme = useCallback((): void => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSessionExpiredNavigation = useCallback((): void => {
    setSessionExpiredRedirect();
    navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (songId.length === 0) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      try {
        let metaTitle: string | null = null;
        let metaArtist: string | null = null;
        const fromSession = readLibrarySongMetaFromSession(songId);
        if (fromSession !== null) {
          metaTitle = fromSession.title;
          metaArtist = fromSession.artist;
        } else {
          const library: SongListItem[] = await listBroadSongLibrary();
          if (cancelled) {
            return;
          }
          const match: SongListItem | undefined = library.find((row: SongListItem): boolean => row.id === songId);
          if (match === undefined) {
            setLoadError(
              "Could not resolve this song in the library. Open it from the song list on Projects, or add it again."
            );
            return;
          }
          metaTitle = match.title;
          metaArtist = match.artist;
          writeLibrarySongMetaToSession(songId, { title: match.title, artist: match.artist });
        }
        if (metaTitle === null) {
          setLoadError("Missing song title.");
          return;
        }
        setSongTitle(metaTitle);
        setSongArtist(metaArtist ?? "");
        const rawLines: LyricsSongLine[] = await getLyricsBySongId(songId);
        if (cancelled) {
          return;
        }
        const normalized: LyricsSongLine[] = normalizeEditorLyricsLines(rawLines).map(
          (line: LyricsSongLine): LyricsSongLine => ({ part: line.part, lyrics: line.lyrics })
        );
        const { lines: linesWithBlank } = ensureBlankLeadLyricsLine(normalized);
        setDraftLines(linesWithBlank);
        const linesNorm: LyricsSongLine[] = normalizeEditorLyricsLines(linesWithBlank);
        setBaselineJson(
          JSON.stringify({
            t: metaTitle.trim(),
            a: metaArtist !== null && metaArtist.trim().length > 0 ? metaArtist.trim() : null,
            l: linesNorm,
          })
        );
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        setLoadError(error instanceof Error ? error.message : WORKSPACE_LOAD_NETWORK_FALLBACK);
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
  }, [songId, navigate, handleSessionExpiredNavigation]);

  const normalizedDraftLines: LyricsSongLine[] = useMemo((): LyricsSongLine[] => {
    return normalizeEditorLyricsLines(draftLines);
  }, [draftLines]);

  const draftSnapshotJson: string = useMemo((): string => {
    return JSON.stringify({
      t: songTitle.trim(),
      a: songArtist.trim().length > 0 ? songArtist.trim() : null,
      l: normalizedDraftLines,
    });
  }, [songTitle, songArtist, normalizedDraftLines]);

  const isDirty: boolean = draftSnapshotJson !== baselineJson;

  const handleSave = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (songId.length === 0) {
        return;
      }
      const titleTrimmed: string = songTitle.trim();
      if (titleTrimmed.length === 0) {
        setSaveError("Title is required.");
        return;
      }
      setSaveError(null);
      setIsSaving(true);
      try {
        const artistTrimmed: string = songArtist.trim();
        await patchSongMetadataInLibrary(songId, {
          title: titleTrimmed,
          artist: artistTrimmed.length > 0 ? artistTrimmed : null,
        });
        await patchLyricsInLibrary(songId, normalizedDraftLines);
        writeLibrarySongMetaToSession(songId, {
          title: titleTrimmed,
          artist: artistTrimmed.length > 0 ? artistTrimmed : null,
        });
        setBaselineJson(
          JSON.stringify({
            t: titleTrimmed,
            a: artistTrimmed.length > 0 ? artistTrimmed : null,
            l: normalizedDraftLines,
          })
        );
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        setSaveError(error instanceof Error ? error.message : "Could not save the song.");
      } finally {
        setIsSaving(false);
      }
    },
    [songId, songTitle, songArtist, normalizedDraftLines, handleSessionExpiredNavigation]
  );

  const songDisplayNameForDelete: string = useMemo((): string => {
    const t: string = songTitle.trim();
    return t.length > 0 ? t : "Untitled song";
  }, [songTitle]);

  const handleOpenSongDeleteDialog = useCallback((): void => {
    setDeleteConfirmCode(generateDestructiveConfirmCode());
    setTypedDeleteConfirm("");
    setDeleteError(null);
    const dialogEl: HTMLDialogElement | null = songDeleteDialogRef.current;
    if (dialogEl !== null && typeof dialogEl.showModal === "function" && !dialogEl.open) {
      dialogEl.showModal();
    }
  }, []);

  const handleSongDeleteDialogClose = useCallback((): void => {
    setDeleteError(null);
    setTypedDeleteConfirm("");
  }, []);

  const handleTypedSongDeleteConfirmChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setTypedDeleteConfirm(event.target.value);
    setDeleteError(null);
  }, []);

  const handleCancelSongDelete = useCallback((): void => {
    songDeleteDialogRef.current?.close();
  }, []);

  const handleConfirmSongDelete = useCallback((): void => {
    if (songId.length === 0) {
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
        await deleteSongById(songId);
        songDeleteDialogRef.current?.close();
        navigate("/", { replace: true });
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          songDeleteDialogRef.current?.close();
          handleSessionExpiredNavigation();
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not delete the song. Try again after refreshing.";
        setDeleteError(message);
      } finally {
        setIsDeleting(false);
      }
    })();
  }, [songId, typedDeleteConfirm, deleteConfirmCode, navigate, handleSessionExpiredNavigation]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#fbfbfa] text-neutral-900 dark:bg-[#191919] dark:text-neutral-50">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
          >
            {APP_DISPLAY_NAME}
          </Link>
          <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Edit song</span>
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="text-[24px] font-semibold tracking-tight">Song library</h1>
        {loadError !== null ? (
          <p className="mt-6 text-[14px] text-red-700 dark:text-red-300" role="alert">
            {loadError}
          </p>
        ) : null}
        {isLoading ? (
          <p className="mt-8 text-[15px] text-neutral-500 dark:text-neutral-400">Loading…</p>
        ) : loadError === null ? (
          <form className="mt-6 flex flex-col gap-6" onSubmit={handleSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={titleInputId}
                  className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400"
                >
                  Title
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  value={songTitle}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                    setSongTitle(event.target.value);
                  }}
                  className={TEXT_INPUT_CLASS}
                  autoComplete="off"
                  disabled={isSaving || isDeleting}
                />
              </div>
              <div>
                <label
                  htmlFor={artistInputId}
                  className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400"
                >
                  Artist
                </label>
                <input
                  id={artistInputId}
                  type="text"
                  value={songArtist}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                    setSongArtist(event.target.value);
                  }}
                  className={TEXT_INPUT_CLASS}
                  autoComplete="off"
                  disabled={isSaving || isDeleting}
                />
              </div>
            </div>
            <section
              className="rounded-xl border border-black/[0.08] bg-neutral-50/80 p-3 dark:border-white/[0.1] dark:bg-white/[0.04]"
              aria-label="Lyrics parts"
            >
              <LyricsSongPartsEditor
                lines={draftLines}
                onChange={setDraftLines}
                fieldIdPrefix={`library-song-${songId}`}
                variant="stacked"
                omitOptionalLeadBlankRow
              />
            </section>
            {saveError !== null ? (
              <p className="text-[13px] text-red-700 dark:text-red-300" role="alert">
                {saveError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving || isDeleting || !isDirty}
                className="inline-flex items-center justify-center rounded-lg bg-[#0071e3] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff]"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleOpenSongDeleteDialog}
                disabled={isSaving || isDeleting}
                className="inline-flex items-center justify-center rounded-lg border border-red-500/40 px-4 py-2 text-[13px] font-medium text-red-700 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/15"
              >
                Delete song
              </button>
            </div>
          </form>
        ) : null}
      </main>
      <ConfirmationCodeDeleteDialog
        dialogRef={songDeleteDialogRef}
        title="Delete song?"
        entityName={songDisplayNameForDelete}
        description={SONG_DELETE_DESCRIPTION}
        confirmCode={deleteConfirmCode}
        typedConfirmCode={typedDeleteConfirm}
        onTypedConfirmChange={handleTypedSongDeleteConfirmChange}
        confirmInputId={deleteConfirmInputId}
        confirmInputName="song-delete-confirm-code"
        deleteError={deleteError}
        isDeleting={isDeleting}
        confirmButtonLabel="Delete song"
        onClose={handleSongDeleteDialogClose}
        onCancel={handleCancelSongDelete}
        onConfirm={handleConfirmSongDelete}
      />
    </div>
  );
};
