import {
  type ChangeEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { signOut, verifySession } from "../api/auth";
import { listProjectsByUserId, patchProjectById } from "../api/project";
import { resolveLyricsLinesForConfigure, syncSongLibraryFromLyricsConfigureSave } from "../api/song";
import { listUsers } from "../api/user";
import { LyricsSongPartsEditor } from "../components/LyricsSongPartsEditor";
import { isSignInRequiredError } from "../lib/auth-errors";
import type { LyricsSongLine, LyricsSongRow } from "../lib/lyrics-part-contents";
import {
  ensureBlankLeadLyricsLine,
  mergeLyricsSongRowsIntoExistingContents,
  normalizeEditorLyricsLines,
  normalizeLyricsPartSequence,
  readLyricsSongRowsFromPart,
  readLyricsTemplateLayoutIdsFromPart,
  shiftLyricsPartSequenceForBlankLeadInsert,
} from "../lib/lyrics-part-contents";
import {
  LYRICS_PART_SONGS_SNAPSHOT_STATE_KEY,
  lyricSongHasTitleForConfigure,
  type LyricsSongConfigureOverlay,
  readLyricsPartSongsSnapshotFromLocation,
  readLyricsSongConfigureOverlay,
  withoutLyricsPartSongsSnapshotForLocation,
} from "../lib/lyrics-song-configure-location-state";
import {
  DUPLICATE_LYRIC_PART_NAME_USER_WARNING,
  DUPLICATE_LYRIC_PART_NAME_WARNING_MS,
  isDuplicateLyricPartNamePatchError,
} from "../lib/parse-api-error";
import {
  getProjectPartId,
  normalizePartsForPatchRequest,
  PART_KIND_FOR_CREATE,
  sortProjectPartsForDisplay,
} from "../lib/project-parts-for-patch";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetProjectResponse } from "../types/project";
import type { GetUserResponse } from "../types/user";

import { WORKSPACE_LOAD_NETWORK_FALLBACK } from "./project-workspace/constants";
import { PartNotifications } from "./project-workspace/PartNotifications";
import { readProjectPartType } from "./project-workspace/utils";
import { WorkspaceHeader } from "./project-workspace/WorkspaceHeader";

const PAGE_TITLE: string = "Song Parts";

const SONG_BY_ARTIST_CONNECTOR: string = " by ";

const UNTITLED_SONG_TITLE: string = "Untitled";

const BACK_TO_PROJECT_LABEL: string = "‹ Back to project";

const CANCEL_BUTTON_LABEL: string = "Cancel";

const SAVE_BUTTON_LABEL: string = "Save";

const SAVE_SAVING_LABEL: string = "Saving…";

const USER_RESOLVE_ERROR: string = "We could not match your signed-in user to an account in this workspace.";

const MISSING_SONG_TITLE_FOR_LYRICS_MESSAGE: string =
  "Add a song title for this song in the project workspace before configuring lyric parts.";

const LYRICS_AUTOFILL_LOADING_MESSAGE: string = "Fetching lyrics…";

const LYRICS_AUTOFILL_ERROR_FALLBACK: string = "Could not load lyrics automatically. You can still enter them by hand.";

const CONFIGURED_CHECKBOX_LABEL: string = "Configured";

const SONG_LIBRARY_SYNC_FAILED_AFTER_PROJECT_SAVE_PREFIX: string =
  "Your project was saved, but the song library was not updated: ";

const resolveConfigureTitleArtist = (
  row: LyricsSongRow,
  songIndex: number,
  state: unknown
): { title: string; artist: string } => {
  const overlay = readLyricsSongConfigureOverlay(state);
  if (overlay !== null && overlay.songIndex === songIndex && overlay.title.trim().length > 0) {
    return { title: overlay.title.trim(), artist: overlay.artist.trim() };
  }
  return { title: row.title.trim(), artist: row.artist.trim() };
};

const resolveConfigureMatchedSongId = (row: LyricsSongRow, songIndex: number, state: unknown): string | null => {
  const overlay = readLyricsSongConfigureOverlay(state);
  if (overlay !== null && overlay.songIndex === songIndex) {
    return overlay.matchedBackendSongId ?? row.matchedBackendSongId;
  }
  return row.matchedBackendSongId;
};

const mergeConfigureDraftIntoSongRows = (
  songRows: LyricsSongRow[],
  songIndexParsed: number,
  draftLines: LyricsSongLine[],
  draftSequence: number[],
  draftLyricsPartsConfigured: boolean,
  locationState: unknown
): LyricsSongRow[] => {
  const overlayForMerge: LyricsSongConfigureOverlay | null = readLyricsSongConfigureOverlay(locationState);
  const normalizedDraft: LyricsSongLine[] = normalizeEditorLyricsLines(draftLines);
  const seqNext: number[] = normalizeLyricsPartSequence(normalizedDraft.length, draftSequence);
  return songRows.map((row: LyricsSongRow, i: number): LyricsSongRow => {
    if (i !== songIndexParsed) {
      return row;
    }
    const titleNext: string =
      overlayForMerge !== null &&
      overlayForMerge.songIndex === songIndexParsed &&
      overlayForMerge.title.trim().length > 0
        ? overlayForMerge.title.trim()
        : row.title.trim();
    const artistNext: string =
      overlayForMerge !== null &&
      overlayForMerge.songIndex === songIndexParsed &&
      overlayForMerge.title.trim().length > 0
        ? overlayForMerge.artist.trim()
        : row.artist.trim();
    return {
      ...row,
      title: titleNext,
      artist: artistNext,
      lines: normalizedDraft,
      lyricsPartSequence: seqNext,
      lyricsPartsConfigured: draftLyricsPartsConfigured,
    };
  });
};

const lyricsLinesHaveAnyContent = (lines: LyricsSongLine[]): boolean => {
  return lines.some((line: LyricsSongLine): boolean => line.lyrics.trim().length > 0);
};

type ResolvedSongLyricsContext = {
  part: unknown;
  partId: string;
  songRows: LyricsSongRow[];
  lyricsLayoutId: string | null;
  titleLayoutId: string | null;
};

type SongLyricsPageMeta = {
  creditLine: string;
  songIndexOneBased: number;
  songTotal: number;
};

type ConfigureDraftBaselineSnapshot = {
  lines: LyricsSongLine[];
  sequence: number[];
  lyricsPartsConfigured: boolean;
};

const parseConfigureDraftBaseline = (raw: string): ConfigureDraftBaselineSnapshot | null => {
  if (raw.length === 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const o: Record<string, unknown> = parsed as Record<string, unknown>;
    const lRaw: unknown = o.l;
    const sRaw: unknown = o.s;
    const cRaw: unknown = o.c;
    if (!Array.isArray(lRaw) || !Array.isArray(sRaw) || typeof cRaw !== "boolean") {
      return null;
    }
    const lines: LyricsSongLine[] = normalizeEditorLyricsLines(lRaw as LyricsSongLine[]);
    const sequence: number[] = normalizeLyricsPartSequence(lines.length, sRaw);
    return { lines, sequence, lyricsPartsConfigured: cRaw };
  } catch {
    return null;
  }
};

export const ProjectSongLyricsConfigurePage = (): ReactElement => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const location = useLocation();
  const {
    projectId,
    partIndex: partIndexParam,
    songIndex: songIndexParam,
  } = useParams<{
    projectId: string;
    partIndex: string;
    songIndex: string;
  }>();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [principal, setPrincipal] = useState<string | null>(null);
  const [isSessionAdmin, setIsSessionAdmin] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [project, setProject] = useState<GetProjectResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lyricsDuplicatePartNameWarning, setLyricsDuplicatePartNameWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [draftLines, setDraftLines] = useState<LyricsSongLine[]>([]);
  const [draftSequence, setDraftSequence] = useState<number[]>([]);
  const [draftLyricsPartsConfigured, setDraftLyricsPartsConfigured] = useState<boolean>(false);
  const [baselineJson, setBaselineJson] = useState<string>("");
  const [lyricsAutofillPhase, setLyricsAutofillPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [lyricsAutofillError, setLyricsAutofillError] = useState<string | null>(null);
  const lyricsAutofillCompletedKeyRef = useRef<string>("");

  const suppressConfigureHydrationOnceRef = useRef<boolean>(false);

  const partIndexParsed: number | null = useMemo((): number | null => {
    if (partIndexParam === undefined) {
      return null;
    }
    const n: number = Number.parseInt(partIndexParam, 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }, [partIndexParam]);

  const songIndexParsed: number | null = useMemo((): number | null => {
    if (songIndexParam === undefined) {
      return null;
    }
    const n: number = Number.parseInt(songIndexParam, 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }, [songIndexParam]);

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

  const handleToggleTheme = useCallback((): void => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  useEffect(() => {
    if (projectId === undefined || projectId.length === 0) {
      navigate("/", { replace: true });
      return;
    }
    if (partIndexParsed === null || songIndexParsed === null) {
      setIsLoading(false);
      return;
    }
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      setProject(null);
      try {
        const session = await verifySession();
        if (cancelled) {
          return;
        }
        setPrincipal(session.principal);
        const users: GetUserResponse[] = await listUsers();
        if (cancelled) {
          return;
        }
        const resolvedId: string | null = findUserIdByPrincipal(session.principal, users);
        if (resolvedId === null) {
          if (!cancelled) {
            setLoadError(USER_RESOLVE_ERROR);
          }
          return;
        }
        const self: GetUserResponse | undefined = users.find((row: GetUserResponse): boolean => row.id === resolvedId);
        if (!cancelled) {
          setIsSessionAdmin(self?.role === "ADMIN");
        }
        const projectList: GetProjectResponse[] = await listProjectsByUserId(resolvedId);
        if (cancelled) {
          return;
        }
        const match: GetProjectResponse | undefined = projectList.find(
          (row: GetProjectResponse): boolean => row.id === projectId
        );
        if (match === undefined) {
          if (!cancelled) {
            navigate("/", { replace: true });
          }
          return;
        }
        if (!cancelled) {
          setProject(match);
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
  }, [projectId, partIndexParsed, songIndexParsed, navigate, handleSessionExpiredNavigation]);

  const routeValidationMessage: string | null = useMemo((): string | null => {
    if (partIndexParsed === null || songIndexParsed === null) {
      return "This link is not valid. Open the song again from the project workspace.";
    }
    return null;
  }, [partIndexParsed, songIndexParsed]);

  const resolvedContext: ResolvedSongLyricsContext | null = useMemo((): ResolvedSongLyricsContext | null => {
    if (project === null || partIndexParsed === null || songIndexParsed === null) {
      return null;
    }
    const sorted: unknown[] = sortProjectPartsForDisplay(project.parts);
    if (partIndexParsed >= sorted.length) {
      return null;
    }
    const part: unknown = sorted[partIndexParsed];
    if (readProjectPartType(part) !== PART_KIND_FOR_CREATE.LYRICS) {
      return null;
    }
    const partId: string | null = getProjectPartId(part);
    if (partId === null) {
      return null;
    }
    const serverSongRows: LyricsSongRow[] = readLyricsSongRowsFromPart(part);
    const snapshotSongRows: LyricsSongRow[] | null = readLyricsPartSongsSnapshotFromLocation(location.state);
    const songRows: LyricsSongRow[] =
      snapshotSongRows !== null && songIndexParsed < snapshotSongRows.length ? snapshotSongRows : serverSongRows;
    if (songIndexParsed >= songRows.length) {
      return null;
    }
    const { lyricsLayoutId, titleLayoutId } = readLyricsTemplateLayoutIdsFromPart(part);
    return { part, partId, songRows, lyricsLayoutId, titleLayoutId };
  }, [project, partIndexParsed, songIndexParsed, location.state]);

  const configureServerHydrationKey: string | null = useMemo((): string | null => {
    if (project === null || partIndexParsed === null || songIndexParsed === null) {
      return null;
    }
    const sorted: unknown[] = sortProjectPartsForDisplay(project.parts);
    const part: unknown | undefined = sorted[partIndexParsed];
    if (part === undefined) {
      return null;
    }
    if (readProjectPartType(part) !== PART_KIND_FOR_CREATE.LYRICS) {
      return null;
    }
    const partId: string | null = getProjectPartId(part);
    const serverSongRows: LyricsSongRow[] = readLyricsSongRowsFromPart(part);
    const snapshotSongRows: LyricsSongRow[] | null = readLyricsPartSongsSnapshotFromLocation(location.state);
    const songs: LyricsSongRow[] =
      snapshotSongRows !== null && songIndexParsed < snapshotSongRows.length ? snapshotSongRows : serverSongRows;
    const songRow: LyricsSongRow | undefined = songs[songIndexParsed];
    if (songRow === undefined) {
      return null;
    }
    const linesNorm: LyricsSongLine[] = normalizeEditorLyricsLines(songRow.lines);
    const seqNorm: number[] = normalizeLyricsPartSequence(linesNorm.length, songRow.lyricsPartSequence);
    return `${project.id}:${partId ?? ""}:${String(songIndexParsed)}:${JSON.stringify({
      l: linesNorm,
      s: seqNorm,
      c: songRow.lyricsPartsConfigured,
    })}`;
  }, [project, partIndexParsed, songIndexParsed, location.state]);

  const configureGateFingerprint: string = useMemo((): string => {
    const o = readLyricsSongConfigureOverlay(location.state);
    if (o === null) {
      return "no-overlay";
    }
    return `${String(o.songIndex)}:${o.title}:${o.artist}:${String(o.matchedBackendSongId ?? "")}`;
  }, [location.state]);

  const contextErrorMessage: string | null = useMemo((): string | null => {
    if (routeValidationMessage !== null) {
      return routeValidationMessage;
    }
    if (isLoading) {
      return null;
    }
    if (project === null) {
      return loadError;
    }
    if (resolvedContext === null) {
      return "This song or lyrics part could not be found. It may have been removed or reordered.";
    }
    if (songIndexParsed === null) {
      return null;
    }
    const rowForGate: LyricsSongRow | undefined = resolvedContext.songRows[songIndexParsed];
    if (rowForGate === undefined) {
      return "This song or lyrics part could not be found. It may have been removed or reordered.";
    }
    if (!lyricSongHasTitleForConfigure(rowForGate, songIndexParsed, location.state)) {
      return MISSING_SONG_TITLE_FOR_LYRICS_MESSAGE;
    }
    return null;
  }, [routeValidationMessage, isLoading, project, loadError, resolvedContext, songIndexParsed, location.state]);

  useLayoutEffect(() => {
    if (suppressConfigureHydrationOnceRef.current) {
      suppressConfigureHydrationOnceRef.current = false;
      return;
    }
    if (configureServerHydrationKey === null || resolvedContext === null || songIndexParsed === null) {
      return;
    }
    const songRow: LyricsSongRow | undefined = resolvedContext.songRows[songIndexParsed];
    if (songRow === undefined) {
      return;
    }
    if (!lyricSongHasTitleForConfigure(songRow, songIndexParsed, location.state)) {
      return;
    }
    const normalized: LyricsSongLine[] = normalizeEditorLyricsLines(songRow.lines);
    const { lines: linesWithBlank, insertedAtStart } = ensureBlankLeadLyricsLine(normalized);
    const baseSeq: number[] = normalizeLyricsPartSequence(normalized.length, songRow.lyricsPartSequence);
    const initialSeq: number[] = shiftLyricsPartSequenceForBlankLeadInsert(normalized.length, baseSeq, insertedAtStart);
    const configuredBaseline: boolean = Boolean(songRow.lyricsPartsConfigured);
    setDraftLines(
      linesWithBlank.map((line: LyricsSongLine): LyricsSongLine => ({ part: line.part, lyrics: line.lyrics }))
    );
    setDraftSequence(initialSeq);
    setDraftLyricsPartsConfigured(configuredBaseline);
    setBaselineJson(JSON.stringify({ l: linesWithBlank, s: initialSeq, c: configuredBaseline }));
  }, [configureServerHydrationKey, configureGateFingerprint, resolvedContext, songIndexParsed, location.state]);

  const lyricsAutofillKey: string | null = useMemo((): string | null => {
    if (projectId === undefined || projectId.length === 0 || resolvedContext === null || songIndexParsed === null) {
      return null;
    }
    const row: LyricsSongRow | undefined = resolvedContext.songRows[songIndexParsed];
    if (row === undefined) {
      return null;
    }
    if (!lyricSongHasTitleForConfigure(row, songIndexParsed, location.state)) {
      return null;
    }
    const { title, artist } = resolveConfigureTitleArtist(row, songIndexParsed, location.state);
    if (title.length === 0) {
      return null;
    }
    const matched: string | null = resolveConfigureMatchedSongId(row, songIndexParsed, location.state);
    const matchedKey: string = matched ?? "";
    return `${projectId}:${resolvedContext.partId}:${String(songIndexParsed)}:${title}:${artist}:${matchedKey}`;
  }, [projectId, resolvedContext, songIndexParsed, location.state]);

  useEffect(() => {
    setLyricsAutofillPhase("idle");
    setLyricsAutofillError(null);
  }, [lyricsAutofillKey]);

  useEffect(() => {
    if (lyricsAutofillKey === null || contextErrorMessage !== null) {
      return;
    }
    if (resolvedContext === null || songIndexParsed === null) {
      return;
    }
    const row: LyricsSongRow | undefined = resolvedContext.songRows[songIndexParsed];
    if (row === undefined) {
      return;
    }
    const initialLines: LyricsSongLine[] = normalizeEditorLyricsLines(row.lines);
    const isLyricsEmpty: boolean = !lyricsLinesHaveAnyContent(initialLines);
    if (!isLyricsEmpty) {
      lyricsAutofillCompletedKeyRef.current = lyricsAutofillKey;
      return;
    }
    if (lyricsAutofillCompletedKeyRef.current === lyricsAutofillKey) {
      return;
    }
    const controller: AbortController = new AbortController();
    const { title, artist } = resolveConfigureTitleArtist(row, songIndexParsed, location.state);
    const matchedBackendSongId: string | null = resolveConfigureMatchedSongId(row, songIndexParsed, location.state);
    void (async (): Promise<void> => {
      setLyricsAutofillPhase("loading");
      setLyricsAutofillError(null);
      try {
        const fetched: LyricsSongLine[] = await resolveLyricsLinesForConfigure(
          { title, artist, matchedBackendSongId },
          controller.signal
        );
        if (controller.signal.aborted) {
          return;
        }
        const normalized: LyricsSongLine[] = normalizeEditorLyricsLines(fetched);
        const { lines: linesWithBlank, insertedAtStart } = ensureBlankLeadLyricsLine(normalized);
        const baseSeq: number[] = normalizeLyricsPartSequence(normalized.length, undefined);
        const nextSeq: number[] = shiftLyricsPartSequenceForBlankLeadInsert(
          normalized.length,
          baseSeq,
          insertedAtStart
        );
        setDraftLines(
          linesWithBlank.map((line: LyricsSongLine): LyricsSongLine => ({ part: line.part, lyrics: line.lyrics }))
        );
        setDraftSequence(nextSeq);
        const configuredAfterAutofill: boolean = Boolean(row.lyricsPartsConfigured);
        setDraftLyricsPartsConfigured(configuredAfterAutofill);
        setBaselineJson(JSON.stringify({ l: linesWithBlank, s: nextSeq, c: configuredAfterAutofill }));
        lyricsAutofillCompletedKeyRef.current = lyricsAutofillKey;
        setLyricsAutofillPhase("done");
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        lyricsAutofillCompletedKeyRef.current = lyricsAutofillKey;
        const message: string = readableClientFetchFailureMessage(error, LYRICS_AUTOFILL_ERROR_FALLBACK);
        setLyricsAutofillError(message);
        setLyricsAutofillPhase("error");
      }
    })();
    return (): void => {
      controller.abort();
    };
  }, [lyricsAutofillKey, contextErrorMessage, resolvedContext, songIndexParsed, location.state]);

  useEffect(() => {
    if (lyricsDuplicatePartNameWarning === null) {
      return;
    }
    const timeoutId: number = window.setTimeout((): void => {
      setLyricsDuplicatePartNameWarning(null);
    }, DUPLICATE_LYRIC_PART_NAME_WARNING_MS);
    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [lyricsDuplicatePartNameWarning]);

  const songPageMeta: SongLyricsPageMeta | null = useMemo((): SongLyricsPageMeta | null => {
    if (resolvedContext === null || songIndexParsed === null) {
      return null;
    }
    const row: LyricsSongRow | undefined = resolvedContext.songRows[songIndexParsed];
    if (row === undefined) {
      return null;
    }
    const overlay = readLyricsSongConfigureOverlay(location.state);
    const titleTrimmed: string =
      overlay !== null && overlay.songIndex === songIndexParsed && overlay.title.trim().length > 0
        ? overlay.title.trim()
        : row.title.trim();
    const titleForCredit: string = titleTrimmed.length > 0 ? titleTrimmed : UNTITLED_SONG_TITLE;
    const artistTrimmed: string =
      overlay !== null && overlay.songIndex === songIndexParsed && overlay.title.trim().length > 0
        ? overlay.artist.trim()
        : row.artist.trim();
    const artistForCredit: string | null = artistTrimmed.length > 0 ? artistTrimmed : null;
    const creditLine: string =
      artistForCredit !== null ? `${titleForCredit}${SONG_BY_ARTIST_CONNECTOR}${artistForCredit}` : titleForCredit;
    return {
      creditLine,
      songIndexOneBased: songIndexParsed + 1,
      songTotal: resolvedContext.songRows.length,
    };
  }, [resolvedContext, songIndexParsed, location.state]);

  const normalizedDraftLines: LyricsSongLine[] = useMemo((): LyricsSongLine[] => {
    return normalizeEditorLyricsLines(draftLines);
  }, [draftLines]);

  const normalizedDraftSequence: number[] = useMemo((): number[] => {
    return normalizeLyricsPartSequence(normalizedDraftLines.length, draftSequence);
  }, [normalizedDraftLines, draftSequence]);

  const draftSnapshotJson: string = useMemo((): string => {
    return JSON.stringify({
      l: normalizedDraftLines,
      s: normalizedDraftSequence,
      c: draftLyricsPartsConfigured,
    });
  }, [normalizedDraftLines, normalizedDraftSequence, draftLyricsPartsConfigured]);

  const isDirty: boolean = draftSnapshotJson !== baselineJson;

  const workspaceHref: string =
    projectId !== undefined && projectId.length > 0 ? `/projects/${projectId}` : "/projects";

  const workspaceNavigationState: Record<string, unknown> | null = useMemo((): Record<string, unknown> | null => {
    if (partIndexParsed === null || resolvedContext === null || songIndexParsed === null) {
      return null;
    }
    const mergedRows: LyricsSongRow[] = mergeConfigureDraftIntoSongRows(
      resolvedContext.songRows,
      songIndexParsed,
      draftLines,
      draftSequence,
      draftLyricsPartsConfigured,
      location.state
    );
    return {
      restoreLyricsPartEditPanel: true,
      lyricsPartEditPartSortedIndex: partIndexParsed,
      [LYRICS_PART_SONGS_SNAPSHOT_STATE_KEY]: mergedRows,
    };
  }, [
    partIndexParsed,
    resolvedContext,
    songIndexParsed,
    draftLines,
    draftSequence,
    draftLyricsPartsConfigured,
    location.state,
  ]);

  const handleCancel = useCallback((): void => {
    if (workspaceNavigationState !== null) {
      navigate(workspaceHref, { state: workspaceNavigationState });
      return;
    }
    navigate(workspaceHref);
  }, [navigate, workspaceHref, workspaceNavigationState]);

  const handleSave = useCallback((): void => {
    if (isSaving) {
      return;
    }
    if (project === null || resolvedContext === null || songIndexParsed === null) {
      return;
    }
    const lyricsPartsConfiguredForPatch: boolean = draftLyricsPartsConfigured;
    const nextSongRows: LyricsSongRow[] = mergeConfigureDraftIntoSongRows(
      resolvedContext.songRows,
      songIndexParsed,
      draftLines,
      draftSequence,
      lyricsPartsConfiguredForPatch,
      location.state
    );
    const contentsPayload = mergeLyricsSongRowsIntoExistingContents(resolvedContext.part, nextSongRows);
    const sorted: unknown[] = sortProjectPartsForDisplay(project.parts);
    const nextParts: unknown[] = sorted.map((p: unknown): unknown => {
      if (getProjectPartId(p) !== resolvedContext.partId) {
        return p;
      }
      if (typeof p !== "object" || p === null || Array.isArray(p)) {
        return p;
      }
      const rec: Record<string, unknown> = p as Record<string, unknown>;
      const preservedLayouts: { lyricsLayoutId: string | null; titleLayoutId: string | null } =
        readLyricsTemplateLayoutIdsFromPart(p);
      const lyricsLayoutForPatch: string | null =
        resolvedContext.lyricsLayoutId !== null && resolvedContext.lyricsLayoutId.length > 0
          ? resolvedContext.lyricsLayoutId
          : preservedLayouts.lyricsLayoutId;
      const titleLayoutForPatch: string | null =
        resolvedContext.titleLayoutId !== null && resolvedContext.titleLayoutId.length > 0
          ? resolvedContext.titleLayoutId
          : preservedLayouts.titleLayoutId;
      return {
        ...rec,
        type: "LYRICS",
        contents: contentsPayload,
        lyrics_layout_id: lyricsLayoutForPatch,
        title_layout_id: titleLayoutForPatch,
      };
    });
    const normalizedNext: unknown[] = normalizePartsForPatchRequest(nextParts);
    setSaveError(null);
    setLyricsDuplicatePartNameWarning(null);
    void (async (): Promise<void> => {
      setIsSaving(true);
      const draftLinesSnapshot: LyricsSongLine[] = normalizeEditorLyricsLines(draftLines).map(
        (line: LyricsSongLine): LyricsSongLine => ({ part: line.part, lyrics: line.lyrics })
      );
      const draftSequenceSnapshot: number[] = normalizeLyricsPartSequence(draftLinesSnapshot.length, draftSequence);
      try {
        const updated: GetProjectResponse = await patchProjectById(project.id, {
          parts: normalizedNext,
        });
        const savedRow: LyricsSongRow = nextSongRows[songIndexParsed];
        const explicitMatchedSongId: string | null = resolveConfigureMatchedSongId(
          resolvedContext.songRows[songIndexParsed],
          songIndexParsed,
          location.state
        );
        let duplicateSongLibraryPartNameHandled: boolean = false;
        try {
          await syncSongLibraryFromLyricsConfigureSave({
            explicitMatchedSongId,
            title: savedRow.title,
            artist: savedRow.artist,
            lyricsLines: normalizeEditorLyricsLines(savedRow.lines),
          });
        } catch (repoError: unknown) {
          if (isSignInRequiredError(repoError)) {
            handleSessionExpiredNavigation();
            return;
          }
          if (isDuplicateLyricPartNamePatchError(repoError)) {
            duplicateSongLibraryPartNameHandled = true;
            const baselineSnap: ConfigureDraftBaselineSnapshot | null = parseConfigureDraftBaseline(baselineJson);
            const revertedLines: LyricsSongLine[] =
              baselineSnap !== null
                ? baselineSnap.lines.map(
                    (line: LyricsSongLine): LyricsSongLine => ({ part: line.part, lyrics: line.lyrics })
                  )
                : draftLinesSnapshot;
            const revertedSeq: number[] = baselineSnap !== null ? baselineSnap.sequence : draftSequenceSnapshot;
            const revertedConfigured: boolean =
              baselineSnap !== null ? baselineSnap.lyricsPartsConfigured : lyricsPartsConfiguredForPatch;
            setDraftLines(revertedLines);
            setDraftSequence(revertedSeq);
            setDraftLyricsPartsConfigured(revertedConfigured);
            setSaveError(null);
            setLyricsDuplicatePartNameWarning(DUPLICATE_LYRIC_PART_NAME_USER_WARNING);
            const normalizedRevertedLines: LyricsSongLine[] = normalizeEditorLyricsLines(revertedLines);
            const normalizedRevertedSeq: number[] = normalizeLyricsPartSequence(
              normalizedRevertedLines.length,
              revertedSeq
            );
            const sortedUpdated: unknown[] = sortProjectPartsForDisplay(updated.parts);
            const updatedPartObj: unknown | undefined = sortedUpdated.find(
              (p: unknown): boolean => getProjectPartId(p) === resolvedContext.partId
            );
            if (updatedPartObj !== undefined) {
              const songRowsAfterSave: LyricsSongRow[] = readLyricsSongRowsFromPart(updatedPartObj);
              const revertedSongRows: LyricsSongRow[] = songRowsAfterSave.map(
                (row: LyricsSongRow, i: number): LyricsSongRow => {
                  if (i !== songIndexParsed) {
                    return row;
                  }
                  return {
                    ...row,
                    lines: normalizedRevertedLines,
                    lyricsPartSequence: normalizedRevertedSeq,
                    lyricsPartsConfigured: revertedConfigured,
                  };
                }
              );
              const rollbackContents = mergeLyricsSongRowsIntoExistingContents(updatedPartObj, revertedSongRows);
              const rollbackNextParts: unknown[] = sortedUpdated.map((p: unknown): unknown => {
                if (getProjectPartId(p) !== resolvedContext.partId) {
                  return p;
                }
                if (typeof p !== "object" || p === null || Array.isArray(p)) {
                  return p;
                }
                const rec: Record<string, unknown> = p as Record<string, unknown>;
                const preservedLayouts: { lyricsLayoutId: string | null; titleLayoutId: string | null } =
                  readLyricsTemplateLayoutIdsFromPart(p);
                const lyricsLayoutForRollback: string | null =
                  resolvedContext.lyricsLayoutId !== null && resolvedContext.lyricsLayoutId.length > 0
                    ? resolvedContext.lyricsLayoutId
                    : preservedLayouts.lyricsLayoutId;
                const titleLayoutForRollback: string | null =
                  resolvedContext.titleLayoutId !== null && resolvedContext.titleLayoutId.length > 0
                    ? resolvedContext.titleLayoutId
                    : preservedLayouts.titleLayoutId;
                return {
                  ...rec,
                  type: "LYRICS",
                  contents: rollbackContents,
                  lyrics_layout_id: lyricsLayoutForRollback,
                  title_layout_id: titleLayoutForRollback,
                };
              });
              try {
                const rolledBack: GetProjectResponse = await patchProjectById(project.id, {
                  parts: normalizePartsForPatchRequest(rollbackNextParts),
                });
                setBaselineJson(
                  JSON.stringify({ l: normalizedRevertedLines, s: normalizedRevertedSeq, c: revertedConfigured })
                );
                suppressConfigureHydrationOnceRef.current = true;
                setProject(rolledBack);
              } catch (rollbackError: unknown) {
                if (isSignInRequiredError(rollbackError)) {
                  handleSessionExpiredNavigation();
                  return;
                }
                const rbMessage: string =
                  rollbackError instanceof Error
                    ? rollbackError.message
                    : "Could not roll back the project after a song library conflict.";
                setSaveError(rbMessage);
                suppressConfigureHydrationOnceRef.current = true;
                setProject(updated);
              }
            } else {
              suppressConfigureHydrationOnceRef.current = true;
              setProject(updated);
            }
            navigate(
              { pathname: location.pathname, search: location.search },
              { replace: true, state: withoutLyricsPartSongsSnapshotForLocation(location.state) }
            );
          } else {
            const repoMessage: string = readableClientFetchFailureMessage(
              repoError,
              "Could not update the song library."
            );
            setSaveError(`${SONG_LIBRARY_SYNC_FAILED_AFTER_PROJECT_SAVE_PREFIX}${repoMessage}`);
          }
        }
        if (!duplicateSongLibraryPartNameHandled) {
          const linesBaseline: LyricsSongLine[] = normalizeEditorLyricsLines(draftLines);
          const seqBaseline: number[] = normalizeLyricsPartSequence(linesBaseline.length, draftSequence);
          setBaselineJson(JSON.stringify({ l: linesBaseline, s: seqBaseline, c: lyricsPartsConfiguredForPatch }));
          suppressConfigureHydrationOnceRef.current = true;
          setProject(updated);
          navigate(
            { pathname: location.pathname, search: location.search },
            { replace: true, state: withoutLyricsPartSongsSnapshotForLocation(location.state) }
          );
        }
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        if (isDuplicateLyricPartNamePatchError(error)) {
          const fromBaseline: ConfigureDraftBaselineSnapshot | null = parseConfigureDraftBaseline(baselineJson);
          if (fromBaseline !== null) {
            setDraftLines(
              fromBaseline.lines.map(
                (line: LyricsSongLine): LyricsSongLine => ({ part: line.part, lyrics: line.lyrics })
              )
            );
            setDraftSequence(fromBaseline.sequence);
            setDraftLyricsPartsConfigured(fromBaseline.lyricsPartsConfigured);
          } else {
            setDraftLines(draftLinesSnapshot);
            setDraftSequence(draftSequenceSnapshot);
          }
          setSaveError(null);
          setLyricsDuplicatePartNameWarning(DUPLICATE_LYRIC_PART_NAME_USER_WARNING);
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not save lyric parts. Try again after refreshing.";
        setSaveError(message);
      } finally {
        setIsSaving(false);
      }
    })();
  }, [
    project,
    resolvedContext,
    songIndexParsed,
    draftLines,
    draftSequence,
    draftLyricsPartsConfigured,
    baselineJson,
    isSaving,
    handleSessionExpiredNavigation,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  const isSaveDisabled: boolean = !isDirty || resolvedContext === null;

  const configurePageHeading: ReactElement = (
    <div className="flex flex-col gap-2">
      <Link
        to={workspaceHref}
        state={workspaceNavigationState ?? undefined}
        className="w-fit text-[14px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
      >
        {BACK_TO_PROJECT_LABEL}
      </Link>
      <h1 className="text-[20px] font-semibold tracking-tight">{PAGE_TITLE}</h1>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfbfa] text-neutral-900 dark:bg-[#191919] dark:text-neutral-50">
      <WorkspaceHeader
        principal={principal}
        isSessionAdmin={isSessionAdmin}
        isSigningOut={isSigningOut}
        theme={theme}
        onGoHome={handleGoHome}
        onToggleTheme={handleToggleTheme}
        onSignOut={handleSignOutClick}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-6">
        {isLoading ? (
          <>
            {configurePageHeading}
            <p className="text-[13px] text-neutral-600 dark:text-neutral-400" role="status">
              Loading…
            </p>
          </>
        ) : loadError !== null && project === null ? (
          <>
            {configurePageHeading}
            <p className="text-[13px] text-red-700 dark:text-red-300" role="alert">
              {loadError}
            </p>
          </>
        ) : contextErrorMessage !== null ? (
          <>
            {configurePageHeading}
            <p className="text-[13px] text-red-700 dark:text-red-300" role="alert">
              {contextErrorMessage}
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Link
                to={workspaceHref}
                state={workspaceNavigationState ?? undefined}
                className="w-fit text-[14px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
              >
                {BACK_TO_PROJECT_LABEL}
              </Link>
              <div className="sticky top-0 z-20 -mx-6 mb-3 border-b border-black/[0.08] bg-[#fbfbfa]/95 px-6 py-2.5 backdrop-blur-sm dark:border-white/[0.1] dark:bg-[#191919]/95">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <h1 className="min-w-0 flex-1 text-[20px] font-semibold tracking-tight">{PAGE_TITLE}</h1>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className="rounded-md border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      {CANCEL_BUTTON_LABEL}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[#0071e3]/40 bg-[#0071e3] px-2.5 py-1 text-[11px] font-medium text-white outline-none transition hover:bg-[#0066cf] focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#0a84ff]/50 dark:bg-[#0a84ff] dark:hover:bg-[#0990ff] dark:focus-visible:ring-[#0a84ff]"
                      aria-busy={isSaving}
                      onClick={(): void => {
                        handleSave();
                      }}
                      disabled={isSaveDisabled}
                    >
                      {isSaving ? SAVE_SAVING_LABEL : SAVE_BUTTON_LABEL}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {songPageMeta !== null && songIndexParsed !== null ? (
              <section
                className="rounded-xl border border-black/[0.08] bg-neutral-50/80 p-3 dark:border-white/[0.1] dark:bg-white/[0.04]"
                aria-label="Song and artist"
              >
                <p className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {songPageMeta.creditLine}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] text-neutral-600 dark:text-neutral-400">
                    Song {String(songPageMeta.songIndexOneBased)} of {String(songPageMeta.songTotal)}
                  </p>
                  <label
                    htmlFor={`song-lyrics-configure-configured-${String(songIndexParsed)}`}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-md py-0.5 outline-none focus-within:ring-2 focus-within:ring-[#0071e3] focus-within:ring-offset-2 focus-within:ring-offset-[#fbfbfa] dark:focus-within:ring-[#0a84ff] dark:focus-within:ring-offset-[#191919]"
                  >
                    <input
                      id={`song-lyrics-configure-configured-${String(songIndexParsed)}`}
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 rounded border border-black/[0.2] bg-white text-[#0071e3] accent-[#0071e3] outline-none dark:border-white/[0.25] dark:bg-[#2c2c2e] dark:accent-[#0a84ff]"
                      checked={draftLyricsPartsConfigured}
                      disabled={isSaving}
                      onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                        setDraftLyricsPartsConfigured(event.target.checked);
                      }}
                    />
                    <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">
                      {CONFIGURED_CHECKBOX_LABEL}
                    </span>
                  </label>
                </div>
              </section>
            ) : null}
            {saveError !== null ? (
              <p className="text-[12px] text-red-700 dark:text-red-300" role="alert">
                {saveError}
              </p>
            ) : null}
            {lyricsAutofillPhase === "loading" ? (
              <p className="text-[12px] text-neutral-600 dark:text-neutral-400" role="status">
                {LYRICS_AUTOFILL_LOADING_MESSAGE}
              </p>
            ) : null}
            {lyricsAutofillError !== null ? (
              <p className="text-[12px] text-red-700 dark:text-red-300" role="alert">
                {lyricsAutofillError}
              </p>
            ) : null}
            <LyricsSongPartsEditor
              lines={draftLines}
              onChange={setDraftLines}
              partSequence={draftSequence}
              onPartSequenceChange={setDraftSequence}
              fieldIdPrefix={`song-${String(songIndexParsed ?? 0)}`}
              variant="split"
            />
          </>
        )}
      </div>
      <PartNotifications
        partActionError={null}
        partPlainValueNotice={null}
        lyricsDuplicatePartNameWarning={lyricsDuplicatePartNameWarning}
        onDismissError={() => {}}
        onDismissNotice={() => {}}
        onDismissLyricsDuplicatePartNameWarning={() => {
          setLyricsDuplicatePartNameWarning(null);
        }}
      />
    </div>
  );
};
