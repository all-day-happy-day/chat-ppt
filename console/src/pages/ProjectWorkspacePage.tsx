import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { signOut, verifySession } from "../api/auth";
import { listProjectsByUserId, patchProjectById } from "../api/project";
import { listTemplateLayoutsByTemplateId, listTemplatesByUserId } from "../api/template";
import { listUsers } from "../api/user";
import { AccountMenu } from "../components/AccountMenu";
import { LyricsPartEditForm } from "../components/LyricsPartEditForm";
import {
  PartEditPanel,
  PART_EDIT_LAYOUT_PALETTE_MENU_ID,
  type ValuePlaceholderEditorRow,
} from "../components/PartEditPanel";
import {
  LYRICS_EDIT_LYRICS_LAYOUT_PALETTE_MENU_ID,
  LYRICS_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID,
} from "../components/TemplateLayoutGalleryPicker";
import { TemplateLayoutThumbnail } from "../components/TemplateLayoutThumbnail";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import {
  appendNewPartForPatch,
  applyPlainValueLayoutReconcileToNormalizedParts,
  buildValuePartContentsPayloadFromFieldRows,
  buildValuePartPlaceholderEditRows,
  computeSlideBoundsPxForLayoutIds,
  extractLayoutIdsForCanvasPreview,
  findTemplateLayoutEntryByLayoutId,
  getPartTypeLabel,
  getPrimaryLayoutIdFromPart,
  getPrimaryTemplateLayoutFieldLabel,
  getProjectPartId,
  getProjectPartStableKey,
  listTemplateLayoutChoices,
  normalizePartsForPatchRequest,
  PART_KIND_FOR_CREATE,
  removePartByIdForPatch,
  replacePartKindAtSortedIndex,
  replacePartPrimaryTemplateLayoutId,
  sortProjectPartsForDisplay,
  type PartKindForCreate,
  type TemplateLayoutChoice,
} from "../lib/project-parts-for-patch";
import type { LyricsSongRow } from "../lib/lyrics-part-contents";
import { mergeLyricsSongRowsIntoExistingContents, readLyricsSongRowsFromPart } from "../lib/lyrics-part-contents";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetLayoutResponse } from "../types/template-layout";
import type { GetTemplateResponse } from "../types/template";
import type { GetProjectResponse } from "../types/project";
import type { GetUserResponse } from "../types/user";

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

const INFO_DATE_FORMATTER: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const pickDefaultLayoutId = (layouts: GetLayoutResponse[]): string | null => {
  for (const layout of layouts) {
    const firstShape = layout.shapes[0];
    if (firstShape !== undefined && firstShape.layout_id.length > 0) {
      return firstShape.layout_id;
    }
  }
  return null;
};

const resolveOwnerUsername = (users: GetUserResponse[], ownerUserId: string): string => {
  const match: GetUserResponse | undefined = users.find((user: GetUserResponse) => user.id === ownerUserId);
  if (match === undefined) {
    return ownerUserId.length > 0 ? ownerUserId : "Unknown";
  }
  return match.username;
};

const formatInstant = (iso: string): string => {
  const parsed: Date = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return INFO_DATE_FORMATTER.format(parsed);
};

const shortenId = (value: string): string => {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

const ADD_PART_KIND_MENU_ID: string = "project-add-part-kind-menu";

const PART_KIND_CHANGE_MENU_ID: string = "project-part-kind-change-menu";

const CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS: string = "min-h-32";

const CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS: string = "min-w-48";

const CANVAS_SECTION_HEADER_ROW_MIN_HEIGHT_CLASS: string = "min-h-[44px]";

const ADD_PART_MENU_MAX_WIDTH_PX: number = 272;

const ADD_PART_MENU_VIEWPORT_GUTTER_PX: number = 8;

const ADD_PART_MENU_FALLBACK_HEIGHT_PX: number = 200;

const ADD_PART_MENU_MIN_SCROLL_HEIGHT_PX: number = 120;

const PROJECT_TITLE_NAV_PIN_TOLERANCE_PX: number = 2;

const CANVAS_WORKSPACE_MIN_HEIGHT_PX: number = 160;

const MAIN_SCROLL_DOCK_EPSILON_PX: number = 1;

/** Approximate line height when normalizing `WheelEvent.deltaMode === DOM_DELTA_LINE`. */
const WHEEL_SCROLL_LINE_HEIGHT_PX: number = 16;

/** Fallback slide size when template layout geometry is missing or not yet loaded. */
const CANVAS_PREVIEW_FALLBACK_WIDTH_PX: number = 960;

const CANVAS_PREVIEW_FALLBACK_HEIGHT_PX: number = 540;

const CANVAS_PREVIEW_LYRICS_PART_LABEL: string = "Lyrics part";

/** Tailwind `sm:` breakpoint (must match `tailwind` default). */
const SM_BREAKPOINT_MIN_WIDTH_PX: number = 640;

/** Floating part notice / error toast duration (no on-screen countdown). */
const PART_TOAST_AUTO_DISMISS_MS: number = 3000;

type AddPartMenuAnchor = {
  topPx: number;
  leftPx: number;
  widthPx: number;
  maxHeightPx: number;
};

const ADD_PART_KIND_OPTION_CLASS: string =
  "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-[13px] outline-none transition hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:hover:bg-white/10 dark:focus-visible:bg-white/10 dark:focus-visible:ring-[#0a84ff]";

type AddPartKindOption = {
  kind: PartKindForCreate;
  label: string;
};

const ADD_PART_KIND_OPTIONS: AddPartKindOption[] = [
  {
    kind: PART_KIND_FOR_CREATE.PLAIN,
    label: "Plain",
  },
  {
    kind: PART_KIND_FOR_CREATE.VALUE,
    label: "Value",
  },
  {
    kind: PART_KIND_FOR_CREATE.LYRICS,
    label: "Lyrics",
  },
  {
    kind: PART_KIND_FOR_CREATE.BIBLE,
    label: "Bible",
  },
];

type PartKindChangeConfirmMode = "loseFilledData" | "plainValueCrossover";

type PendingPartKindChangeConfirm = {
  mode: PartKindChangeConfirmMode;
  sortedIndex: number;
  kind: PartKindForCreate;
  resolvedLayoutId: string;
};

const readProjectPartType = (part: unknown): string => {
  if (typeof part !== "object" || part === null || Array.isArray(part)) {
    return "";
  }
  const typeValue: unknown = (part as { type?: unknown }).type;
  return typeof typeValue === "string" ? typeValue : "";
};

const isPlainValuePartKindCrossover = (currentType: string, targetKind: PartKindForCreate): boolean => {
  return (
    (currentType === PART_KIND_FOR_CREATE.PLAIN && targetKind === PART_KIND_FOR_CREATE.VALUE) ||
    (currentType === PART_KIND_FOR_CREATE.VALUE && targetKind === PART_KIND_FOR_CREATE.PLAIN)
  );
};

const needsDestructivePartKindConfirm = (currentType: string, targetKind: PartKindForCreate): boolean => {
  if (currentType === targetKind) {
    return false;
  }
  if (isPlainValuePartKindCrossover(currentType, targetKind)) {
    return false;
  }
  return currentType === "LYRICS" || currentType === "BIBLE" || currentType === "VALUE";
};

const PART_KIND_LOSE_FILLED_DATA_MESSAGE: string =
  "Changing the part type can discard text and values you already entered. Continue?";

const PART_KIND_PLAIN_VALUE_CROSSOVER_MESSAGE: string =
  "Switching between Plain and Value clears the slide layout selection until you pick a layout again in Edit. Continue?";

const NOTION_ICON_CLASS: string = "inline-flex shrink-0 text-neutral-400 dark:text-neutral-500 [&>svg]:h-4 [&>svg]:w-4";

const NotionPersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NotionDocumentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NotionCalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const PartDeleteIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const NotionHistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 12a9 9 0 1 0 2.64-6.36"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3 4v5h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type NotionPropertyRowProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

type PartEditValueFieldRowState = {
  shapeKey: string;
  placeholderName: string;
  displayLabel: string;
  value: string;
};

const NotionPropertyRow = ({ icon, label, children }: NotionPropertyRowProps) => {
  return (
    <div className="group -mx-1 flex flex-col gap-0.5 rounded-md px-1 py-2 transition-colors hover:bg-black/[0.035] sm:flex-row sm:items-start sm:gap-3 dark:hover:bg-white/[0.05]">
      <div className="flex min-h-[1.375rem] w-full shrink-0 items-center gap-2 sm:w-44">
        <span className={NOTION_ICON_CLASS} aria-hidden>
          {icon}
        </span>
        <span className="select-none text-[14px] text-neutral-500 dark:text-neutral-400">{label}</span>
      </div>
      <div className="min-w-0 flex-1 pl-7 text-[14px] leading-snug text-neutral-800 sm:pl-0 dark:text-neutral-100">
        {children}
      </div>
    </div>
  );
};

export const ProjectWorkspacePage = () => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [project, setProject] = useState<GetProjectResponse | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<GetUserResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isSessionAdmin, setIsSessionAdmin] = useState<boolean>(false);
  const [templateDisplayName, setTemplateDisplayName] = useState<string | null>(null);
  const [defaultLayoutId, setDefaultLayoutId] = useState<string | null>(null);
  const [templateLayouts, setTemplateLayouts] = useState<GetLayoutResponse[]>([]);
  const [workspaceMetaError, setWorkspaceMetaError] = useState<string | null>(null);
  const [selectedPartIndex, setSelectedPartIndex] = useState<number>(0);
  const [partActionError, setPartActionError] = useState<string | null>(null);
  const [partPlainValueNotice, setPartPlainValueNotice] = useState<string | null>(null);
  const [partTypeMenuOpenIndex, setPartTypeMenuOpenIndex] = useState<number | null>(null);
  const [partTypeMenuAnchor, setPartTypeMenuAnchor] = useState<AddPartMenuAnchor | null>(null);
  const partTypeMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const partKindChangeConfirmDialogRef = useRef<HTMLDialogElement | null>(null);
  const pendingPartKindChangeConfirmRef = useRef<PendingPartKindChangeConfirm | null>(null);
  const [pendingPartKindChangeConfirm, setPendingPartKindChangeConfirm] = useState<PendingPartKindChangeConfirm | null>(
    null
  );
  const [isPatchingParts, setIsPatchingParts] = useState<boolean>(false);
  const [isPartEditPanelOpen, setIsPartEditPanelOpen] = useState<boolean>(false);
  const [partEditSelectedLayoutId, setPartEditSelectedLayoutId] = useState<string | null>(null);
  const [isAddPartMenuOpen, setIsAddPartMenuOpen] = useState<boolean>(false);
  const [addPartMenuAnchor, setAddPartMenuAnchor] = useState<AddPartMenuAnchor | null>(null);
  const addPartTileRef = useRef<HTMLButtonElement | null>(null);
  const partsListThumbViewportRef = useRef<HTMLDivElement | null>(null);
  const partsListMeasureRef = useRef<HTMLDivElement | null>(null);
  const partsScrollSpacerRef = useRef<HTMLDivElement | null>(null);
  const partsListScrollerRef = useRef<HTMLDivElement | null>(null);
  /** Scrollable workspace: title + metadata + notices move together; dock reacts to scroll. */
  const workspaceMainLayoutRef = useRef<HTMLElement | null>(null);
  const projectNavRef = useRef<HTMLElement | null>(null);
  const projectInformationRef = useRef<HTMLDivElement | null>(null);
  const projectTitleHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const workspacePageRootRef = useRef<HTMLDivElement | null>(null);
  const projectPartsAsideRef = useRef<HTMLElement | null>(null);
  const partEditPanelRef = useRef<HTMLElement | null>(null);
  /** When true, do not auto-fill the layout picker from the part (e.g. after switching parts until the user picks a layout). */
  const [partEditLayoutHydrationSuppressed, setPartEditLayoutHydrationSuppressed] = useState<boolean>(false);
  /** Part ids (Plain/Value) whose canvas and list thumbnails stay empty until the user picks a layout again. */
  const [plainValueLayoutPreviewSuppressedPartIds, setPlainValueLayoutPreviewSuppressedPartIds] = useState<string[]>(
    []
  );
  const addPlainValueLayoutPreviewSuppressedPartId = useCallback((partId: string): void => {
    setPlainValueLayoutPreviewSuppressedPartIds((prev: string[]): string[] =>
      prev.includes(partId) ? prev : [...prev, partId]
    );
  }, []);
  const removePlainValueLayoutPreviewSuppressedPartId = useCallback((partId: string): void => {
    setPlainValueLayoutPreviewSuppressedPartIds((prev: string[]): string[] =>
      prev.filter((id: string): boolean => id !== partId)
    );
  }, []);
  const [partEditLyricsLyricsLayoutId, setPartEditLyricsLyricsLayoutId] = useState<string | null>(null);
  const [partEditLyricsTitleLayoutId, setPartEditLyricsTitleLayoutId] = useState<string | null>(null);
  const [partEditLyricsSongs, setPartEditLyricsSongs] = useState<LyricsSongRow[]>([{ title: "", artist: "" }]);
  const [partEditValueFieldRows, setPartEditValueFieldRows] = useState<PartEditValueFieldRowState[]>([]);
  const [canvasValueHighlightShapeKey, setCanvasValueHighlightShapeKey] = useState<string | null>(null);
  const [canvasPlaceholderHoverLabel, setCanvasPlaceholderHoverLabel] = useState<string | null>(null);
  const valuePlaceholderBlurClearTimeoutRef = useRef<number | null>(null);
  const canvasPreviewSizerRef = useRef<HTMLDivElement | null>(null);
  const canvasPreviewFrameRef = useRef<HTMLDivElement | null>(null);
  const navTitleScrollRafRef = useRef<number | null>(null);
  const [isProjectTitlePinnedToNav, setIsProjectTitlePinnedToNav] = useState<boolean>(false);
  const [canvasWorkspaceTopPx, setCanvasWorkspaceTopPx] = useState<number>(0);
  const [workspaceMainPaddingBottomPx, setWorkspaceMainPaddingBottomPx] = useState<number>(0);

  useEffect(() => {
    if (partActionError === null && partPlainValueNotice === null) {
      return;
    }
    const timeoutId: number = window.setTimeout((): void => {
      setPartActionError(null);
      setPartPlainValueNotice(null);
    }, PART_TOAST_AUTO_DISMISS_MS);
    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [partActionError, partPlainValueNotice]);

  const updateCanvasWorkspaceDock = useCallback((): void => {
    const navEl: HTMLElement | null = projectNavRef.current;
    const mainEl: HTMLElement | null = workspaceMainLayoutRef.current;
    if (navEl === null || mainEl === null) {
      return;
    }
    const navRect: DOMRect = navEl.getBoundingClientRect();
    const mainRect: DOMRect = mainEl.getBoundingClientRect();
    const nameBarBottomPx: number = navRect.bottom;
    const viewportH: number = window.innerHeight;
    let topPx: number = nameBarBottomPx;
    const infoEl: HTMLDivElement | null = projectInformationRef.current;
    if (infoEl !== null) {
      const infoRect: DOMRect = infoEl.getBoundingClientRect();
      const informationIntersectsVisibleMain: boolean =
        infoRect.bottom > nameBarBottomPx + MAIN_SCROLL_DOCK_EPSILON_PX &&
        infoRect.top < mainRect.bottom - MAIN_SCROLL_DOCK_EPSILON_PX &&
        infoRect.bottom > mainRect.top + MAIN_SCROLL_DOCK_EPSILON_PX;
      if (informationIntersectsVisibleMain) {
        topPx = Math.max(nameBarBottomPx, infoRect.bottom);
      }
    }
    const maxTopPx: number = viewportH - CANVAS_WORKSPACE_MIN_HEIGHT_PX;
    topPx = Math.min(Math.max(topPx, nameBarBottomPx), maxTopPx);
    const overlayHeightPx: number = Math.max(0, viewportH - topPx);
    setCanvasWorkspaceTopPx(topPx);
    setWorkspaceMainPaddingBottomPx(overlayHeightPx);
  }, []);

  const updateProjectTitleInNav = useCallback((): void => {
    const layoutEl: HTMLElement | null = workspaceMainLayoutRef.current;
    const titleEl: HTMLHeadingElement | null = projectTitleHeadingRef.current;
    if (layoutEl === null || titleEl === null) {
      setIsProjectTitlePinnedToNav(false);
      return;
    }
    const mainRect: DOMRect = layoutEl.getBoundingClientRect();
    const titleRect: DOMRect = titleEl.getBoundingClientRect();
    const fullyAboveMain: boolean = titleRect.bottom < mainRect.top + PROJECT_TITLE_NAV_PIN_TOLERANCE_PX;
    setIsProjectTitlePinnedToNav(fullyAboveMain);
  }, []);

  const scheduleProjectTitleInNav = useCallback((): void => {
    if (navTitleScrollRafRef.current !== null) {
      return;
    }
    navTitleScrollRafRef.current = window.requestAnimationFrame((): void => {
      navTitleScrollRafRef.current = null;
      updateProjectTitleInNav();
    });
  }, [updateProjectTitleInNav]);

  const handleMainScrollForDock = useCallback((): void => {
    updateCanvasWorkspaceDock();
    scheduleProjectTitleInNav();
  }, [updateCanvasWorkspaceDock, scheduleProjectTitleInNav]);

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
      setWorkspaceUsers([]);
      setIsSessionAdmin(false);
      setPrincipal(null);
      setTemplateDisplayName(null);
      setDefaultLayoutId(null);
      setTemplateLayouts([]);
      setWorkspaceMetaError(null);
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
        setWorkspaceUsers(users);
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
        let resolvedTemplateName: string | null = null;
        let resolvedDefaultLayoutId: string | null = null;
        let resolvedTemplateLayouts: GetLayoutResponse[] = [];
        try {
          const templates: GetTemplateResponse[] = await listTemplatesByUserId(resolvedId);
          if (cancelled) {
            return;
          }
          const templateMatch: GetTemplateResponse | undefined = templates.find(
            (row: GetTemplateResponse) => row.template_id === match.template_id
          );
          resolvedTemplateName = templateMatch?.name ?? null;
          const layouts: GetLayoutResponse[] = await listTemplateLayoutsByTemplateId(match.template_id);
          if (cancelled) {
            return;
          }
          resolvedTemplateLayouts = layouts;
          resolvedDefaultLayoutId = pickDefaultLayoutId(layouts);
          if (!cancelled) {
            setWorkspaceMetaError(null);
          }
        } catch (error: unknown) {
          if (cancelled) {
            return;
          }
          if (isSignInRequiredError(error)) {
            handleSessionExpiredNavigation();
            return;
          }
          const message: string = readableClientFetchFailureMessage(
            error,
            "Could not load template details for this project."
          );
          setWorkspaceMetaError(message);
        }
        if (cancelled) {
          return;
        }
        setTemplateDisplayName(resolvedTemplateName);
        setDefaultLayoutId(resolvedDefaultLayoutId);
        setTemplateLayouts(resolvedTemplateLayouts);
        setPartPlainValueNotice(null);
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

  useEffect(() => {
    if (project === null || isLoading) {
      setIsProjectTitlePinnedToNav(false);
      setCanvasWorkspaceTopPx(0);
      setWorkspaceMainPaddingBottomPx(0);
      return;
    }
    const layoutEl: HTMLElement | null = workspaceMainLayoutRef.current;
    const titleEl: HTMLHeadingElement | null = projectTitleHeadingRef.current;
    const navEl: HTMLElement | null = projectNavRef.current;
    const infoEl: HTMLDivElement | null = projectInformationRef.current;
    if (layoutEl === null || titleEl === null) {
      return;
    }
    updateProjectTitleInNav();
    updateCanvasWorkspaceDock();
    layoutEl.addEventListener("scroll", handleMainScrollForDock, { passive: true });
    window.addEventListener("resize", handleMainScrollForDock);
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleMainScrollForDock();
      });
      resizeObserver.observe(layoutEl);
      resizeObserver.observe(titleEl);
      if (navEl !== null) {
        resizeObserver.observe(navEl);
      }
      if (infoEl !== null) {
        resizeObserver.observe(infoEl);
      }
    }
    return () => {
      layoutEl.removeEventListener("scroll", handleMainScrollForDock);
      window.removeEventListener("resize", handleMainScrollForDock);
      resizeObserver?.disconnect();
      if (navTitleScrollRafRef.current !== null) {
        window.cancelAnimationFrame(navTitleScrollRafRef.current);
        navTitleScrollRafRef.current = null;
      }
    };
  }, [
    project,
    isLoading,
    updateProjectTitleInNav,
    updateCanvasWorkspaceDock,
    scheduleProjectTitleInNav,
    handleMainScrollForDock,
  ]);

  useLayoutEffect(() => {
    if (project === null || isLoading) {
      return;
    }
    updateCanvasWorkspaceDock();
  }, [project, isLoading, updateCanvasWorkspaceDock]);

  useEffect(() => {
    const rootEl: HTMLDivElement | null = workspacePageRootRef.current;
    if (rootEl === null) {
      return;
    }
    const handleWorkspaceRootWheelCapture = (event: WheelEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const targetNode: Node = event.target;
      const partsAsideEl: HTMLElement | null = projectPartsAsideRef.current;
      if (partsAsideEl !== null && partsAsideEl.contains(targetNode)) {
        return;
      }
      const addPartMenuEl: HTMLElement | null = document.getElementById(ADD_PART_KIND_MENU_ID);
      if (addPartMenuEl !== null && addPartMenuEl.contains(targetNode)) {
        return;
      }
      const partKindChangeMenuEl: HTMLElement | null = document.getElementById(PART_KIND_CHANGE_MENU_ID);
      if (partKindChangeMenuEl !== null && partKindChangeMenuEl.contains(targetNode)) {
        return;
      }
      const partEditEl: HTMLElement | null = partEditPanelRef.current;
      if (partEditEl !== null && partEditEl.contains(targetNode)) {
        return;
      }
      const layoutPaletteEl: HTMLElement | null = document.getElementById(PART_EDIT_LAYOUT_PALETTE_MENU_ID);
      const lyricsLyricsPaletteEl: HTMLElement | null = document.getElementById(
        LYRICS_EDIT_LYRICS_LAYOUT_PALETTE_MENU_ID
      );
      const lyricsTitlePaletteEl: HTMLElement | null = document.getElementById(
        LYRICS_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID
      );
      if (layoutPaletteEl !== null && layoutPaletteEl.contains(targetNode)) {
        return;
      }
      if (lyricsLyricsPaletteEl !== null && lyricsLyricsPaletteEl.contains(targetNode)) {
        return;
      }
      if (lyricsTitlePaletteEl !== null && lyricsTitlePaletteEl.contains(targetNode)) {
        return;
      }
      if (targetNode instanceof Element && targetNode.closest("[data-lyrics-song-suggestions]") !== null) {
        return;
      }
      const mainEl: HTMLElement | null = workspaceMainLayoutRef.current;
      if (mainEl === null) {
        return;
      }
      const maxScrollPx: number = mainEl.scrollHeight - mainEl.clientHeight;
      if (maxScrollPx <= 1) {
        return;
      }
      const lineMultiplier: number = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_SCROLL_LINE_HEIGHT_PX : 1;
      const pageMultiplier: number = event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? mainEl.clientHeight : 1;
      const deltaPx: number = event.deltaY * lineMultiplier * pageMultiplier;
      const atTop: boolean = mainEl.scrollTop <= 0;
      const atBottom: boolean = mainEl.scrollTop >= maxScrollPx - 1;
      if (atTop && deltaPx < 0) {
        return;
      }
      if (atBottom && deltaPx > 0) {
        return;
      }
      mainEl.scrollTop += deltaPx;
      event.preventDefault();
    };
    rootEl.addEventListener("wheel", handleWorkspaceRootWheelCapture, { passive: false, capture: true });
    return () => {
      rootEl.removeEventListener("wheel", handleWorkspaceRootWheelCapture, true);
    };
  }, []);

  const updateAddPartMenuAnchor = useCallback((): void => {
    const tile: HTMLButtonElement | null = addPartTileRef.current;
    if (tile === null) {
      return;
    }
    const rect: DOMRect = tile.getBoundingClientRect();
    const gutter: number = ADD_PART_MENU_VIEWPORT_GUTTER_PX;
    const widthPx: number = Math.min(ADD_PART_MENU_MAX_WIDTH_PX, window.innerWidth - gutter * 2);
    let leftPx: number = rect.left;
    const maxLeft: number = window.innerWidth - gutter - widthPx;
    if (leftPx > maxLeft) {
      leftPx = maxLeft;
    }
    if (leftPx < gutter) {
      leftPx = gutter;
    }
    const menuEl: HTMLElement | null = document.getElementById(ADD_PART_KIND_MENU_ID);
    const measuredHeight: number =
      menuEl !== null ? menuEl.getBoundingClientRect().height : ADD_PART_MENU_FALLBACK_HEIGHT_PX;
    const effectiveHeight: number = measuredHeight > 0 ? measuredHeight : ADD_PART_MENU_FALLBACK_HEIGHT_PX;
    const viewportBottom: number = window.innerHeight - gutter;
    let topPx: number = rect.bottom + gutter;
    if (topPx + effectiveHeight > viewportBottom) {
      const topIfAbove: number = rect.top - effectiveHeight - gutter;
      if (topIfAbove >= gutter) {
        topPx = topIfAbove;
      } else {
        topPx = gutter;
      }
    }
    const maxHeightPx: number = Math.max(ADD_PART_MENU_MIN_SCROLL_HEIGHT_PX, Math.floor(viewportBottom - topPx));
    setAddPartMenuAnchor({ topPx, leftPx, widthPx, maxHeightPx });
  }, []);

  const updatePartTypeMenuAnchor = useCallback((): void => {
    const trigger: HTMLButtonElement | null = partTypeMenuTriggerRef.current;
    if (trigger === null) {
      return;
    }
    const rect: DOMRect = trigger.getBoundingClientRect();
    const gutter: number = ADD_PART_MENU_VIEWPORT_GUTTER_PX;
    const widthPx: number = Math.min(ADD_PART_MENU_MAX_WIDTH_PX, window.innerWidth - gutter * 2);
    let leftPx: number = rect.left;
    const maxLeft: number = window.innerWidth - gutter - widthPx;
    if (leftPx > maxLeft) {
      leftPx = maxLeft;
    }
    if (leftPx < gutter) {
      leftPx = gutter;
    }
    const menuEl: HTMLElement | null = document.getElementById(PART_KIND_CHANGE_MENU_ID);
    const measuredHeight: number =
      menuEl !== null ? menuEl.getBoundingClientRect().height : ADD_PART_MENU_FALLBACK_HEIGHT_PX;
    const effectiveHeight: number = measuredHeight > 0 ? measuredHeight : ADD_PART_MENU_FALLBACK_HEIGHT_PX;
    const viewportBottom: number = window.innerHeight - gutter;
    let topPx: number = rect.bottom + gutter;
    if (topPx + effectiveHeight > viewportBottom) {
      const topIfAbove: number = rect.top - effectiveHeight - gutter;
      if (topIfAbove >= gutter) {
        topPx = topIfAbove;
      } else {
        topPx = gutter;
      }
    }
    const maxHeightPx: number = Math.max(ADD_PART_MENU_MIN_SCROLL_HEIGHT_PX, Math.floor(viewportBottom - topPx));
    setPartTypeMenuAnchor({ topPx, leftPx, widthPx, maxHeightPx });
  }, []);

  useLayoutEffect(() => {
    if (partTypeMenuOpenIndex === null) {
      setPartTypeMenuAnchor(null);
      return;
    }
    updatePartTypeMenuAnchor();
    const rafId: number = window.requestAnimationFrame(() => {
      updatePartTypeMenuAnchor();
    });
    const handleWindowScroll = (): void => {
      updatePartTypeMenuAnchor();
    };
    window.addEventListener("scroll", handleWindowScroll, true);
    window.addEventListener("resize", handleWindowScroll);
    const scroller: HTMLDivElement | null = partsListScrollerRef.current;
    if (scroller !== null) {
      scroller.addEventListener("scroll", handleWindowScroll, { passive: true });
    }
    const mainScroller: HTMLElement | null = workspaceMainLayoutRef.current;
    if (mainScroller !== null) {
      mainScroller.addEventListener("scroll", handleWindowScroll, { passive: true });
    }
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updatePartTypeMenuAnchor();
      });
      const triggerNode: HTMLButtonElement | null = partTypeMenuTriggerRef.current;
      if (triggerNode !== null) {
        resizeObserver.observe(triggerNode);
      }
      if (scroller !== null) {
        resizeObserver.observe(scroller);
      }
      if (mainScroller !== null) {
        resizeObserver.observe(mainScroller);
      }
      const menuNode: HTMLElement | null = document.getElementById(PART_KIND_CHANGE_MENU_ID);
      if (menuNode !== null) {
        resizeObserver.observe(menuNode);
      }
    }
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleWindowScroll, true);
      window.removeEventListener("resize", handleWindowScroll);
      if (scroller !== null) {
        scroller.removeEventListener("scroll", handleWindowScroll);
      }
      if (mainScroller !== null) {
        mainScroller.removeEventListener("scroll", handleWindowScroll);
      }
      resizeObserver?.disconnect();
    };
  }, [partTypeMenuOpenIndex, updatePartTypeMenuAnchor]);

  useEffect(() => {
    if (partTypeMenuOpenIndex === null) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const trigger: HTMLButtonElement | null = partTypeMenuTriggerRef.current;
      const menuEl: HTMLElement | null = document.getElementById(PART_KIND_CHANGE_MENU_ID);
      if (trigger !== null && trigger.contains(event.target)) {
        return;
      }
      if (menuEl !== null && menuEl.contains(event.target)) {
        return;
      }
      setPartTypeMenuOpenIndex(null);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [partTypeMenuOpenIndex]);

  useEffect(() => {
    if (partTypeMenuOpenIndex === null) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setPartTypeMenuOpenIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [partTypeMenuOpenIndex]);

  useLayoutEffect(() => {
    if (!isAddPartMenuOpen) {
      setAddPartMenuAnchor(null);
      return;
    }
    updateAddPartMenuAnchor();
    const rafId: number = window.requestAnimationFrame(() => {
      updateAddPartMenuAnchor();
    });
    const handleWindowScroll = (): void => {
      updateAddPartMenuAnchor();
    };
    window.addEventListener("scroll", handleWindowScroll, true);
    window.addEventListener("resize", handleWindowScroll);
    const scroller: HTMLDivElement | null = partsListScrollerRef.current;
    if (scroller !== null) {
      scroller.addEventListener("scroll", handleWindowScroll, { passive: true });
    }
    const mainScroller: HTMLElement | null = workspaceMainLayoutRef.current;
    if (mainScroller !== null) {
      mainScroller.addEventListener("scroll", handleWindowScroll, { passive: true });
    }
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateAddPartMenuAnchor();
      });
      const tileNode: HTMLButtonElement | null = addPartTileRef.current;
      if (tileNode !== null) {
        resizeObserver.observe(tileNode);
      }
      if (scroller !== null) {
        resizeObserver.observe(scroller);
      }
      if (mainScroller !== null) {
        resizeObserver.observe(mainScroller);
      }
      const menuNode: HTMLElement | null = document.getElementById(ADD_PART_KIND_MENU_ID);
      if (menuNode !== null) {
        resizeObserver.observe(menuNode);
      }
    }
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleWindowScroll, true);
      window.removeEventListener("resize", handleWindowScroll);
      if (scroller !== null) {
        scroller.removeEventListener("scroll", handleWindowScroll);
      }
      if (mainScroller !== null) {
        mainScroller.removeEventListener("scroll", handleWindowScroll);
      }
      resizeObserver?.disconnect();
    };
  }, [isAddPartMenuOpen, updateAddPartMenuAnchor]);

  useEffect(() => {
    if (!isAddPartMenuOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const tile: HTMLButtonElement | null = addPartTileRef.current;
      const menuEl: HTMLElement | null = document.getElementById(ADD_PART_KIND_MENU_ID);
      if (tile !== null && tile.contains(event.target)) {
        return;
      }
      if (menuEl !== null && menuEl.contains(event.target)) {
        return;
      }
      setIsAddPartMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isAddPartMenuOpen]);

  useEffect(() => {
    if (!isAddPartMenuOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsAddPartMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAddPartMenuOpen]);

  useEffect(() => {
    if (project === null) {
      return;
    }
    const count: number = project.parts.length;
    setSelectedPartIndex((prev: number) => {
      if (count === 0) {
        return 0;
      }
      return prev >= count ? count - 1 : prev;
    });
  }, [project]);

  const sortedParts: unknown[] = useMemo((): unknown[] => {
    if (project === null) {
      return [];
    }
    return sortProjectPartsForDisplay(project.parts);
  }, [project]);

  const templateLayoutChoices: TemplateLayoutChoice[] = useMemo((): TemplateLayoutChoice[] => {
    return listTemplateLayoutChoices(templateLayouts);
  }, [templateLayouts]);

  const syncPartsListRailLayout = useCallback((): void => {
    const measureEl: HTMLDivElement | null = partsListMeasureRef.current;
    const railEl: HTMLDivElement | null = partsListScrollerRef.current;
    const spacerEl: HTMLDivElement | null = partsScrollSpacerRef.current;
    if (measureEl === null || railEl === null || spacerEl === null) {
      return;
    }
    spacerEl.style.height = `${measureEl.scrollHeight}px`;
    const maxScrollPx: number = Math.max(0, railEl.scrollHeight - railEl.clientHeight);
    if (railEl.scrollTop > maxScrollPx) {
      railEl.scrollTop = maxScrollPx;
    }
    if (typeof window !== "undefined" && window.innerWidth >= SM_BREAKPOINT_MIN_WIDTH_PX) {
      measureEl.style.transform = `translateY(-${railEl.scrollTop}px)`;
    } else {
      measureEl.style.transform = "";
    }
  }, []);

  const handlePartsListRailScroll = useCallback((): void => {
    const measureEl: HTMLDivElement | null = partsListMeasureRef.current;
    const railEl: HTMLDivElement | null = partsListScrollerRef.current;
    if (measureEl === null || railEl === null) {
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth >= SM_BREAKPOINT_MIN_WIDTH_PX) {
      measureEl.style.transform = `translateY(-${railEl.scrollTop}px)`;
    }
  }, []);

  useLayoutEffect(() => {
    const measureEl: HTMLDivElement | null = partsListMeasureRef.current;
    if (measureEl === null) {
      return;
    }
    syncPartsListRailLayout();
    const resizeObserver: ResizeObserver = new ResizeObserver(() => {
      syncPartsListRailLayout();
    });
    resizeObserver.observe(measureEl);
    window.addEventListener("resize", syncPartsListRailLayout);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncPartsListRailLayout);
    };
  }, [sortedParts.length, syncPartsListRailLayout, project]);

  useEffect(() => {
    const mq: MediaQueryList = window.matchMedia(`(min-width: ${String(SM_BREAKPOINT_MIN_WIDTH_PX)}px)`);
    const handleMqChange = (): void => {
      if (!mq.matches) {
        const railEl: HTMLDivElement | null = partsListScrollerRef.current;
        if (railEl !== null) {
          railEl.scrollTop = 0;
        }
        const measureEl: HTMLDivElement | null = partsListMeasureRef.current;
        if (measureEl !== null) {
          measureEl.style.transform = "";
        }
        return;
      }
      syncPartsListRailLayout();
    };
    mq.addEventListener("change", handleMqChange);
    return () => {
      mq.removeEventListener("change", handleMqChange);
    };
  }, [syncPartsListRailLayout]);

  useEffect(() => {
    const viewportEl: HTMLDivElement | null = partsListThumbViewportRef.current;
    if (viewportEl === null) {
      return;
    }
    const handleThumbViewportWheel = (event: WheelEvent): void => {
      if (typeof window === "undefined" || window.innerWidth < SM_BREAKPOINT_MIN_WIDTH_PX) {
        return;
      }
      const railEl: HTMLDivElement | null = partsListScrollerRef.current;
      if (railEl === null) {
        return;
      }
      if (railEl.scrollHeight <= railEl.clientHeight + 1) {
        return;
      }
      railEl.scrollTop += event.deltaY;
      event.preventDefault();
    };
    viewportEl.addEventListener("wheel", handleThumbViewportWheel, { passive: false });
    return () => {
      viewportEl.removeEventListener("wheel", handleThumbViewportWheel);
    };
  }, [sortedParts.length]);

  const ownerUsername: string = useMemo((): string => {
    if (project === null) {
      return "—";
    }
    return resolveOwnerUsername(workspaceUsers, project.user_id);
  }, [project, workspaceUsers]);

  const handleAddPartOfKind = useCallback(
    (kind: PartKindForCreate): void => {
      if (project === null || defaultLayoutId === null) {
        return;
      }
      setIsAddPartMenuOpen(false);
      void (async (): Promise<void> => {
        setPartActionError(null);
        setPartPlainValueNotice(null);
        setIsPatchingParts(true);
        try {
          const partsPayload: unknown[] = appendNewPartForPatch(project.parts, kind, defaultLayoutId);
          const updated: GetProjectResponse = await patchProjectById(project.id, {
            parts: partsPayload,
          });
          setProject(updated);
          setSelectedPartIndex(partsPayload.length - 1);
        } catch (error: unknown) {
          if (isSignInRequiredError(error)) {
            handleSessionExpiredNavigation();
            return;
          }
          const message: string =
            error instanceof Error ? error.message : "Could not add a part. Try again after refreshing.";
          setPartActionError(message);
        } finally {
          setIsPatchingParts(false);
        }
      })();
    },
    [project, defaultLayoutId, handleSessionExpiredNavigation]
  );

  const handleDeletePartAtIndex = useCallback(
    (index: number): void => {
      if (project === null) {
        return;
      }
      const ordered: unknown[] = sortProjectPartsForDisplay(project.parts);
      const part: unknown | undefined = ordered[index];
      const idToRemove: string | null = part !== undefined ? getProjectPartId(part) : null;
      if (idToRemove === null) {
        return;
      }
      void (async (): Promise<void> => {
        setPartActionError(null);
        setPartPlainValueNotice(null);
        setIsPatchingParts(true);
        try {
          const partsPayload: unknown[] = removePartByIdForPatch(project.parts, idToRemove);
          const updated: GetProjectResponse = await patchProjectById(project.id, {
            parts: partsPayload,
          });
          setProject(updated);
          const nextLen: number = partsPayload.length;
          setSelectedPartIndex((prev: number): number => {
            if (nextLen === 0) {
              return 0;
            }
            if (index < prev) {
              return prev - 1;
            }
            if (index === prev) {
              return Math.max(0, Math.min(prev, nextLen - 1));
            }
            return prev;
          });
        } catch (error: unknown) {
          if (isSignInRequiredError(error)) {
            handleSessionExpiredNavigation();
            return;
          }
          const message: string =
            error instanceof Error ? error.message : "Could not delete the part. Try again after refreshing.";
          setPartActionError(message);
        } finally {
          setIsPatchingParts(false);
        }
      })();
    },
    [project, handleSessionExpiredNavigation]
  );

  const selectedPart: unknown | undefined = sortedParts[selectedPartIndex];
  const selectedPartLabel: string = selectedPart !== undefined ? getPartTypeLabel(selectedPart) : "";

  const selectedPartIsPlainOrValue: boolean = useMemo((): boolean => {
    if (selectedPart === undefined) {
      return false;
    }
    const t: string = readProjectPartType(selectedPart);
    return t === PART_KIND_FOR_CREATE.PLAIN || t === PART_KIND_FOR_CREATE.VALUE;
  }, [selectedPart]);

  const selectedPartIsLyrics: boolean = useMemo((): boolean => {
    if (selectedPart === undefined) {
      return false;
    }
    return readProjectPartType(selectedPart) === PART_KIND_FOR_CREATE.LYRICS;
  }, [selectedPart]);

  const selectedPartIsValue: boolean = useMemo((): boolean => {
    if (selectedPart === undefined) {
      return false;
    }
    return readProjectPartType(selectedPart) === PART_KIND_FOR_CREATE.VALUE;
  }, [selectedPart]);

  const selectedPartId: string | null = useMemo((): string | null => {
    if (selectedPart === undefined) {
      return null;
    }
    return getProjectPartId(selectedPart);
  }, [selectedPart]);

  const plainValueLayoutPreviewSuppressed: boolean = useMemo((): boolean => {
    if (selectedPartId === null || !selectedPartIsPlainOrValue) {
      return false;
    }
    return plainValueLayoutPreviewSuppressedPartIds.includes(selectedPartId);
  }, [selectedPartId, selectedPartIsPlainOrValue, plainValueLayoutPreviewSuppressedPartIds]);

  const selectedPartLayoutEntry: GetLayoutResponse | null = useMemo((): GetLayoutResponse | null => {
    if (selectedPart === undefined) {
      return null;
    }
    if (selectedPartIsLyrics) {
      return null;
    }
    if (plainValueLayoutPreviewSuppressed) {
      return null;
    }
    const layoutId: string | null = getPrimaryLayoutIdFromPart(selectedPart);
    if (layoutId === null) {
      return null;
    }
    return findTemplateLayoutEntryByLayoutId(templateLayouts, layoutId);
  }, [selectedPart, selectedPartIsLyrics, templateLayouts, plainValueLayoutPreviewSuppressed]);

  const canvasPreviewHoverResetSignature: string = useMemo((): string => {
    if (selectedPartLayoutEntry === null) {
      return `${String(selectedPartIndex)}:none`;
    }
    const firstShape = selectedPartLayoutEntry.shapes[0];
    const layoutId: string = firstShape !== undefined ? firstShape.layout_id : "noshapes";
    return `${String(selectedPartIndex)}:${layoutId}`;
  }, [selectedPartIndex, selectedPartLayoutEntry]);

  useEffect((): void => {
    setCanvasPlaceholderHoverLabel(null);
  }, [canvasPreviewHoverResetSignature]);

  const canvasHeaderCenterDefaultText: string = useMemo((): string => {
    if (sortedParts.length === 0) {
      return "Add a part to begin. Use the + tile at the end of the list and pick Plain, Value, Lyrics, or Bible.";
    }
    return `Part ${String(selectedPartIndex + 1)} of ${String(sortedParts.length)} · ${selectedPartLabel}`;
  }, [sortedParts.length, selectedPartIndex, selectedPartLabel]);

  const handleClosePartEditPanel = useCallback((): void => {
    setIsPartEditPanelOpen(false);
  }, []);

  const applyLyricsPartToEditState = useCallback(
    (part: unknown): void => {
      if (readProjectPartType(part) !== PART_KIND_FOR_CREATE.LYRICS) {
        return;
      }
      let lyricsLayoutIdFromPart: string | null = null;
      let titleLayoutIdFromPart: string | null = null;
      if (typeof part === "object" && part !== null && !Array.isArray(part)) {
        const rec: Record<string, unknown> = part as Record<string, unknown>;
        const lyricsRaw: unknown = rec.lyrics_layout_id;
        const titleRaw: unknown = rec.title_layout_id;
        lyricsLayoutIdFromPart = typeof lyricsRaw === "string" && lyricsRaw.length > 0 ? lyricsRaw : null;
        titleLayoutIdFromPart = typeof titleRaw === "string" && titleRaw.length > 0 ? titleRaw : null;
      }
      const choiceIds: Set<string> = new Set(
        templateLayoutChoices.map((choice: TemplateLayoutChoice) => choice.layoutId)
      );
      let nextLyricsLayoutId: string | null = lyricsLayoutIdFromPart;
      if (nextLyricsLayoutId !== null && !choiceIds.has(nextLyricsLayoutId)) {
        nextLyricsLayoutId = null;
      }
      let nextTitleLayoutId: string | null = titleLayoutIdFromPart;
      if (nextTitleLayoutId !== null && !choiceIds.has(nextTitleLayoutId)) {
        nextTitleLayoutId = null;
      }
      const firstChoice: TemplateLayoutChoice | undefined = templateLayoutChoices[0];
      if (nextLyricsLayoutId === null && firstChoice !== undefined) {
        nextLyricsLayoutId = firstChoice.layoutId;
      }
      setPartEditLyricsLyricsLayoutId(nextLyricsLayoutId);
      setPartEditLyricsTitleLayoutId(nextTitleLayoutId);
      setPartEditLyricsSongs(readLyricsSongRowsFromPart(part));
    },
    [templateLayoutChoices]
  );

  const handleEditSelectedPartFromCanvas = useCallback((): void => {
    if (selectedPart === undefined) {
      return;
    }
    setPartActionError(null);
    setPartPlainValueNotice(null);
    const partTypeForEdit: string = readProjectPartType(selectedPart);
    if (partTypeForEdit === PART_KIND_FOR_CREATE.LYRICS) {
      applyLyricsPartToEditState(selectedPart);
      setIsPartEditPanelOpen(true);
      return;
    }
    if (plainValueLayoutPreviewSuppressed) {
      setPartEditLayoutHydrationSuppressed(true);
      setPartEditSelectedLayoutId(null);
      setIsPartEditPanelOpen(true);
      return;
    }
    setPartEditLayoutHydrationSuppressed(false);
    if (selectedPartId !== null) {
      removePlainValueLayoutPreviewSuppressedPartId(selectedPartId);
    }
    const currentLayoutId: string | null = getPrimaryLayoutIdFromPart(selectedPart);
    const choiceIds: Set<string> = new Set(
      templateLayoutChoices.map((choice: TemplateLayoutChoice) => choice.layoutId)
    );
    let initialLayoutId: string | null = currentLayoutId;
    if (initialLayoutId !== null && !choiceIds.has(initialLayoutId)) {
      initialLayoutId = null;
    }
    const firstChoice: TemplateLayoutChoice | undefined = templateLayoutChoices[0];
    if (initialLayoutId === null && firstChoice !== undefined) {
      initialLayoutId = firstChoice.layoutId;
    }
    setPartEditSelectedLayoutId(initialLayoutId);
    setIsPartEditPanelOpen(true);
  }, [
    selectedPart,
    templateLayoutChoices,
    plainValueLayoutPreviewSuppressed,
    selectedPartId,
    removePlainValueLayoutPreviewSuppressedPartId,
    applyLyricsPartToEditState,
  ]);

  useEffect(() => {
    if (!isPartEditPanelOpen || selectedPart === undefined) {
      return;
    }
    if (readProjectPartType(selectedPart) !== PART_KIND_FOR_CREATE.LYRICS) {
      return;
    }
    applyLyricsPartToEditState(selectedPart);
  }, [isPartEditPanelOpen, selectedPart, applyLyricsPartToEditState]);

  useEffect(() => {
    if (!isPartEditPanelOpen || selectedPart === undefined) {
      return;
    }
    if (readProjectPartType(selectedPart) !== PART_KIND_FOR_CREATE.VALUE) {
      setPartEditValueFieldRows([]);
      return;
    }
    if (partEditLayoutHydrationSuppressed) {
      setPartEditValueFieldRows([]);
      return;
    }
    if (partEditSelectedLayoutId === null || partEditSelectedLayoutId.length === 0) {
      setPartEditValueFieldRows([]);
      return;
    }
    const entry: GetLayoutResponse | null = findTemplateLayoutEntryByLayoutId(
      templateLayouts,
      partEditSelectedLayoutId
    );
    if (entry === null) {
      setPartEditValueFieldRows([]);
      return;
    }
    const rows: {
      shapeKey: string;
      placeholderName: string;
      displayLabel: string;
      value: string;
    }[] = buildValuePartPlaceholderEditRows(entry, selectedPart);
    setPartEditValueFieldRows(
      rows.map(
        (r: {
          shapeKey: string;
          placeholderName: string;
          displayLabel: string;
          value: string;
        }): PartEditValueFieldRowState => ({
          shapeKey: r.shapeKey,
          placeholderName: r.placeholderName,
          displayLabel: r.displayLabel,
          value: r.value,
        })
      )
    );
  }, [isPartEditPanelOpen, selectedPart, partEditSelectedLayoutId, templateLayouts, partEditLayoutHydrationSuppressed]);

  useEffect(() => {
    if (!isPartEditPanelOpen) {
      setCanvasValueHighlightShapeKey(null);
      if (valuePlaceholderBlurClearTimeoutRef.current !== null) {
        window.clearTimeout(valuePlaceholderBlurClearTimeoutRef.current);
        valuePlaceholderBlurClearTimeoutRef.current = null;
      }
    }
  }, [isPartEditPanelOpen]);

  useEffect(() => {
    return (): void => {
      if (valuePlaceholderBlurClearTimeoutRef.current !== null) {
        window.clearTimeout(valuePlaceholderBlurClearTimeoutRef.current);
      }
    };
  }, []);

  const handlePartEditValuePlaceholderChange = useCallback((shapeKey: string, nextValue: string): void => {
    setPartEditValueFieldRows((prev: PartEditValueFieldRowState[]): PartEditValueFieldRowState[] =>
      prev.map(
        (row: PartEditValueFieldRowState): PartEditValueFieldRowState =>
          row.shapeKey === shapeKey ? { ...row, value: nextValue } : row
      )
    );
  }, []);

  const handleFocusValuePlaceholderField = useCallback((shapeKey: string): void => {
    if (valuePlaceholderBlurClearTimeoutRef.current !== null) {
      window.clearTimeout(valuePlaceholderBlurClearTimeoutRef.current);
      valuePlaceholderBlurClearTimeoutRef.current = null;
    }
    setCanvasValueHighlightShapeKey(shapeKey);
  }, []);

  const handleBlurValuePlaceholderField = useCallback((): void => {
    valuePlaceholderBlurClearTimeoutRef.current = window.setTimeout((): void => {
      valuePlaceholderBlurClearTimeoutRef.current = null;
      setCanvasValueHighlightShapeKey(null);
    }, 80);
  }, []);

  const handleSavePartPrimaryLayout = useCallback((): void => {
    if (project === null || selectedPart === undefined || partEditSelectedLayoutId === null) {
      return;
    }
    const partId: string | null = getProjectPartId(selectedPart);
    if (partId === null) {
      return;
    }
    const selectedType: string = readProjectPartType(selectedPart);
    const currentLayoutId: string | null = getPrimaryLayoutIdFromPart(selectedPart);
    const layoutEntry: GetLayoutResponse | null = findTemplateLayoutEntryByLayoutId(
      templateLayouts,
      partEditSelectedLayoutId
    );
    const beforeNormalized: unknown[] = normalizePartsForPatchRequest(project.parts);
    const layoutChanged: boolean = currentLayoutId !== partEditSelectedLayoutId;
    const reconciled: { parts: unknown[]; notice: string | null } = layoutChanged
      ? applyPlainValueLayoutReconcileToNormalizedParts(
          replacePartPrimaryTemplateLayoutId(project.parts, partId, partEditSelectedLayoutId),
          partId,
          layoutEntry
        )
      : applyPlainValueLayoutReconcileToNormalizedParts(beforeNormalized, partId, layoutEntry);
    let patchedParts: unknown[] = reconciled.parts;
    if (selectedType === PART_KIND_FOR_CREATE.VALUE && layoutEntry !== null) {
      const fieldRowsForSave: { placeholderName: string; value: string }[] =
        partEditValueFieldRows.length > 0
          ? partEditValueFieldRows.map((r: PartEditValueFieldRowState): { placeholderName: string; value: string } => ({
              placeholderName: r.placeholderName,
              value: r.value,
            }))
          : buildValuePartPlaceholderEditRows(layoutEntry, selectedPart).map(
              (r: { placeholderName: string; value: string }): { placeholderName: string; value: string } => ({
                placeholderName: r.placeholderName,
                value: r.value,
              })
            );
      const contentsPayload: { type: "VALUE"; contents: { placeholder_name: string; value: string | null }[] } =
        buildValuePartContentsPayloadFromFieldRows(layoutEntry, fieldRowsForSave);
      patchedParts = reconciled.parts.map((p: unknown): unknown => {
        if (getProjectPartId(p) !== partId) {
          return p;
        }
        if (typeof p !== "object" || p === null || Array.isArray(p)) {
          return p;
        }
        const rec: Record<string, unknown> = p as Record<string, unknown>;
        if (rec.type !== "VALUE") {
          return p;
        }
        return {
          ...rec,
          contents: contentsPayload,
        };
      });
    }
    const normalizedNext: unknown[] = normalizePartsForPatchRequest(patchedParts);
    setPartActionError(null);
    setPartPlainValueNotice(null);
    if (JSON.stringify(beforeNormalized) === JSON.stringify(normalizedNext)) {
      if (reconciled.notice !== null) {
        setPartPlainValueNotice(reconciled.notice);
      }
      return;
    }
    void (async (): Promise<void> => {
      setIsPatchingParts(true);
      try {
        const updated: GetProjectResponse = await patchProjectById(project.id, {
          parts: normalizedNext,
        });
        setProject(updated);
        removePlainValueLayoutPreviewSuppressedPartId(partId);
        if (reconciled.notice !== null) {
          setPartPlainValueNotice(reconciled.notice);
        }
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not update the part layout. Try again after refreshing.";
        setPartActionError(message);
      } finally {
        setIsPatchingParts(false);
      }
    })();
  }, [
    project,
    selectedPart,
    partEditSelectedLayoutId,
    templateLayouts,
    partEditValueFieldRows,
    handleSessionExpiredNavigation,
    removePlainValueLayoutPreviewSuppressedPartId,
  ]);

  const handleSaveLyricsPart = useCallback((): void => {
    if (project === null || selectedPart === undefined) {
      return;
    }
    const partId: string | null = getProjectPartId(selectedPart);
    if (partId === null) {
      return;
    }
    if (partEditLyricsLyricsLayoutId === null || partEditLyricsLyricsLayoutId.length === 0) {
      return;
    }
    const contentsPayload = mergeLyricsSongRowsIntoExistingContents(selectedPart, partEditLyricsSongs);
    const sorted: unknown[] = sortProjectPartsForDisplay(project.parts);
    const nextParts: unknown[] = sorted.map((part: unknown): unknown => {
      if (getProjectPartId(part) !== partId) {
        return part;
      }
      if (typeof part !== "object" || part === null || Array.isArray(part)) {
        return part;
      }
      const rec: Record<string, unknown> = part as Record<string, unknown>;
      return {
        ...rec,
        type: "LYRICS",
        contents: contentsPayload,
        lyrics_layout_id: partEditLyricsLyricsLayoutId,
        title_layout_id: partEditLyricsTitleLayoutId,
      };
    });
    const beforeNormalized: unknown[] = normalizePartsForPatchRequest(project.parts);
    const normalizedNext: unknown[] = normalizePartsForPatchRequest(nextParts);
    setPartActionError(null);
    setPartPlainValueNotice(null);
    if (JSON.stringify(beforeNormalized) === JSON.stringify(normalizedNext)) {
      return;
    }
    void (async (): Promise<void> => {
      setIsPatchingParts(true);
      try {
        const updated: GetProjectResponse = await patchProjectById(project.id, {
          parts: normalizedNext,
        });
        setProject(updated);
      } catch (error: unknown) {
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string =
          error instanceof Error ? error.message : "Could not update the lyrics part. Try again after refreshing.";
        setPartActionError(message);
      } finally {
        setIsPatchingParts(false);
      }
    })();
  }, [
    project,
    selectedPart,
    partEditLyricsLyricsLayoutId,
    partEditLyricsTitleLayoutId,
    partEditLyricsSongs,
    handleSessionExpiredNavigation,
  ]);

  const partEditHeading: string =
    selectedPart !== undefined ? `Part ${String(selectedPartIndex + 1)} · ${getPartTypeLabel(selectedPart)}` : "";

  const partEditLayoutFieldLabel: string =
    selectedPart !== undefined ? getPrimaryTemplateLayoutFieldLabel(selectedPart) : "Slide layout";

  const partEditEmptyStateMessage: string | null =
    templateLayoutChoices.length === 0
      ? "No template layouts were loaded. Refresh the page or check that the template includes at least one layout with shapes."
      : null;

  const valuePlaceholderRowsForPartEdit: ValuePlaceholderEditorRow[] | null = useMemo(():
    | ValuePlaceholderEditorRow[]
    | null => {
    if (!selectedPartIsValue || selectedPartId === null || partEditValueFieldRows.length === 0) {
      return null;
    }
    return partEditValueFieldRows.map(
      (row: PartEditValueFieldRowState): ValuePlaceholderEditorRow => ({
        shapeKey: row.shapeKey,
        placeholderName: row.placeholderName,
        fieldLabel: row.displayLabel,
        value: row.value,
        inputId: `value-ph-${selectedPartId}-${row.shapeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      })
    );
  }, [selectedPartIsValue, selectedPartId, partEditValueFieldRows]);

  const partEditPrimarySaveButtonLabel: string =
    selectedPartIsValue && partEditValueFieldRows.length > 0 ? "Save" : "Save layout";

  const isPartLyricsSaveDisabled: boolean =
    partEditLyricsLyricsLayoutId === null ||
    partEditLyricsLyricsLayoutId.length === 0 ||
    partEditLyricsSongs.some((row: LyricsSongRow): boolean => row.title.trim().length === 0) ||
    partEditEmptyStateMessage !== null;

  const isPartPrimaryLayoutSaveDisabled: boolean = selectedPart === undefined || partEditSelectedLayoutId === null;

  useLayoutEffect(() => {
    if (!isPartEditPanelOpen || selectedPart === undefined) {
      return;
    }
    const partTypeForHydration: string = readProjectPartType(selectedPart);
    if (partTypeForHydration === PART_KIND_FOR_CREATE.LYRICS || partTypeForHydration === PART_KIND_FOR_CREATE.BIBLE) {
      return;
    }
    const partIdForPreview: string | null = getProjectPartId(selectedPart);
    const isPreviewSuppressedForPart: boolean =
      partIdForPreview !== null && plainValueLayoutPreviewSuppressedPartIds.includes(partIdForPreview);
    if (isPreviewSuppressedForPart) {
      setPartEditLayoutHydrationSuppressed(true);
      setPartEditSelectedLayoutId(null);
      return;
    }
    setPartEditLayoutHydrationSuppressed(false);
    const currentLayoutId: string | null = getPrimaryLayoutIdFromPart(selectedPart);
    const choiceIds: Set<string> = new Set(
      templateLayoutChoices.map((choice: TemplateLayoutChoice) => choice.layoutId)
    );
    if (currentLayoutId !== null && choiceIds.has(currentLayoutId)) {
      setPartEditSelectedLayoutId(currentLayoutId);
      return;
    }
    const firstChoice: TemplateLayoutChoice | undefined = templateLayoutChoices[0];
    setPartEditSelectedLayoutId(firstChoice !== undefined ? firstChoice.layoutId : currentLayoutId);
  }, [
    isPartEditPanelOpen,
    selectedPartIndex,
    selectedPart,
    templateLayoutChoices,
    plainValueLayoutPreviewSuppressedPartIds,
  ]);

  useEffect(() => {
    setPartPlainValueNotice(null);
    setPartTypeMenuOpenIndex(null);
    setPartEditLyricsLyricsLayoutId(null);
    setPartEditLyricsTitleLayoutId(null);
    setPartEditLyricsSongs([{ title: "", artist: "" }]);
    setCanvasValueHighlightShapeKey(null);
    if (valuePlaceholderBlurClearTimeoutRef.current !== null) {
      window.clearTimeout(valuePlaceholderBlurClearTimeoutRef.current);
      valuePlaceholderBlurClearTimeoutRef.current = null;
    }
    partKindChangeConfirmDialogRef.current?.close();
    setPendingPartKindChangeConfirm(null);
    pendingPartKindChangeConfirmRef.current = null;
  }, [selectedPartIndex]);

  const applyPartKindChange = useCallback(
    (
      sortedIndex: number,
      kind: PartKindForCreate,
      resolvedLayoutId: string,
      onAfterSuccessfulPatch?: () => void
    ): void => {
      if (project === null) {
        return;
      }
      const beforeNormalized: unknown[] = normalizePartsForPatchRequest(project.parts);
      const { parts: nextParts, infoNotice }: { parts: unknown[]; infoNotice: string | null } =
        replacePartKindAtSortedIndex(project.parts, sortedIndex, kind, resolvedLayoutId);
      setPartActionError(null);
      setPartPlainValueNotice(null);
      if (JSON.stringify(beforeNormalized) === JSON.stringify(nextParts)) {
        if (infoNotice !== null) {
          setPartPlainValueNotice(infoNotice);
        }
        return;
      }
      void (async (): Promise<void> => {
        setIsPatchingParts(true);
        try {
          const updated: GetProjectResponse = await patchProjectById(project.id, {
            parts: nextParts,
          });
          setProject(updated);
          if (infoNotice !== null) {
            setPartPlainValueNotice(infoNotice);
          }
          onAfterSuccessfulPatch?.();
        } catch (error: unknown) {
          if (isSignInRequiredError(error)) {
            handleSessionExpiredNavigation();
            return;
          }
          const message: string =
            error instanceof Error ? error.message : "Could not update the part type. Try again after refreshing.";
          setPartActionError(message);
        } finally {
          setIsPatchingParts(false);
        }
      })();
    },
    [project, handleSessionExpiredNavigation]
  );

  const handleApplyPartKindChange = useCallback(
    (kind: PartKindForCreate): void => {
      if (project === null) {
        return;
      }
      const openIndex: number | null = partTypeMenuOpenIndex;
      if (openIndex === null) {
        return;
      }
      const part: unknown | undefined = sortedParts[openIndex];
      if (part === undefined) {
        setPartTypeMenuOpenIndex(null);
        return;
      }
      const currentType: string = readProjectPartType(part);
      if (currentType === kind) {
        setPartTypeMenuOpenIndex(null);
        return;
      }
      const layoutId: string | null = getPrimaryLayoutIdFromPart(part);
      const resolvedLayoutId: string | null = layoutId ?? defaultLayoutId;
      if (resolvedLayoutId === null || resolvedLayoutId.length === 0) {
        setPartTypeMenuOpenIndex(null);
        setPartActionError("Pick a layout in Edit first.");
        return;
      }
      setPartTypeMenuOpenIndex(null);
      if (isPlainValuePartKindCrossover(currentType, kind)) {
        const nextPending: PendingPartKindChangeConfirm = {
          mode: "plainValueCrossover",
          sortedIndex: openIndex,
          kind,
          resolvedLayoutId,
        };
        pendingPartKindChangeConfirmRef.current = nextPending;
        setPendingPartKindChangeConfirm(nextPending);
        return;
      }
      if (needsDestructivePartKindConfirm(currentType, kind)) {
        const nextPending: PendingPartKindChangeConfirm = {
          mode: "loseFilledData",
          sortedIndex: openIndex,
          kind,
          resolvedLayoutId,
        };
        pendingPartKindChangeConfirmRef.current = nextPending;
        setPendingPartKindChangeConfirm(nextPending);
        return;
      }
      applyPartKindChange(openIndex, kind, resolvedLayoutId);
    },
    [project, partTypeMenuOpenIndex, sortedParts, defaultLayoutId, applyPartKindChange]
  );

  useEffect(() => {
    pendingPartKindChangeConfirmRef.current = pendingPartKindChangeConfirm;
  }, [pendingPartKindChangeConfirm]);

  useEffect(() => {
    if (pendingPartKindChangeConfirm === null) {
      return;
    }
    const dialogEl: HTMLDialogElement | null = partKindChangeConfirmDialogRef.current;
    if (dialogEl !== null && typeof dialogEl.showModal === "function" && !dialogEl.open) {
      dialogEl.showModal();
    }
  }, [pendingPartKindChangeConfirm]);

  useEffect(() => {
    return () => {
      partKindChangeConfirmDialogRef.current?.close();
    };
  }, []);

  const handlePartKindConfirmDialogClose = useCallback((): void => {
    setPendingPartKindChangeConfirm(null);
    pendingPartKindChangeConfirmRef.current = null;
  }, []);

  const handleConfirmPendingPartKindChange = useCallback((): void => {
    const pending: PendingPartKindChangeConfirm | null = pendingPartKindChangeConfirmRef.current;
    if (pending === null) {
      return;
    }
    partKindChangeConfirmDialogRef.current?.close();
    const partAtIndex: unknown | undefined = sortedParts[pending.sortedIndex];
    const crossoverPartId: string | null = partAtIndex !== undefined ? getProjectPartId(partAtIndex) : null;
    const afterPlainValueCrossover: (() => void) | undefined =
      pending.mode === "plainValueCrossover"
        ? (): void => {
            setPartEditSelectedLayoutId(null);
            setPartEditLayoutHydrationSuppressed(true);
            if (crossoverPartId !== null) {
              addPlainValueLayoutPreviewSuppressedPartId(crossoverPartId);
            }
          }
        : undefined;
    applyPartKindChange(pending.sortedIndex, pending.kind, pending.resolvedLayoutId, afterPlainValueCrossover);
  }, [applyPartKindChange, sortedParts, addPlainValueLayoutPreviewSuppressedPartId]);

  const handleCancelPendingPartKindChange = useCallback((): void => {
    partKindChangeConfirmDialogRef.current?.close();
  }, []);

  const handleClearPartLayoutSelection = useCallback((): void => {
    setPartEditSelectedLayoutId(null);
    setPartEditLayoutHydrationSuppressed(true);
    if (selectedPartId !== null) {
      addPlainValueLayoutPreviewSuppressedPartId(selectedPartId);
    }
  }, [selectedPartId, addPlainValueLayoutPreviewSuppressedPartId]);

  const handleSelectPartEditLayoutId = useCallback(
    (layoutId: string): void => {
      setPartEditLayoutHydrationSuppressed(false);
      setPartEditSelectedLayoutId(layoutId);
      if (project === null || selectedPart === undefined) {
        return;
      }
      const currentType: string = readProjectPartType(selectedPart);
      if (currentType !== "PLAIN" && currentType !== "VALUE") {
        return;
      }
      const partId: string | null = getProjectPartId(selectedPart);
      if (partId === null) {
        return;
      }
      removePlainValueLayoutPreviewSuppressedPartId(partId);
      const layoutIdBeforePick: string | null = getPrimaryLayoutIdFromPart(selectedPart);
      const layoutEntry: GetLayoutResponse | null = findTemplateLayoutEntryByLayoutId(templateLayouts, layoutId);
      const beforeNormalized: unknown[] = normalizePartsForPatchRequest(project.parts);
      const afterReplace: unknown[] = replacePartPrimaryTemplateLayoutId(project.parts, partId, layoutId);
      const reconciled: { parts: unknown[]; notice: string | null } =
        layoutEntry === null
          ? { parts: afterReplace, notice: null }
          : applyPlainValueLayoutReconcileToNormalizedParts(afterReplace, partId, layoutEntry);
      setPartActionError(null);
      setPartPlainValueNotice(null);
      if (JSON.stringify(beforeNormalized) === JSON.stringify(reconciled.parts)) {
        if (reconciled.notice !== null) {
          setPartPlainValueNotice(reconciled.notice);
        }
        return;
      }
      void (async (): Promise<void> => {
        setIsPatchingParts(true);
        try {
          const updated: GetProjectResponse = await patchProjectById(project.id, {
            parts: reconciled.parts,
          });
          setProject(updated);
          if (reconciled.notice !== null) {
            setPartPlainValueNotice(reconciled.notice);
          }
        } catch (error: unknown) {
          if (isSignInRequiredError(error)) {
            handleSessionExpiredNavigation();
            return;
          }
          setPartEditSelectedLayoutId(layoutIdBeforePick);
          const message: string =
            error instanceof Error ? error.message : "Could not update the part layout. Try again after refreshing.";
          setPartActionError(message);
        } finally {
          setIsPatchingParts(false);
        }
      })();
    },
    [
      project,
      selectedPart,
      templateLayouts,
      handleSessionExpiredNavigation,
      removePlainValueLayoutPreviewSuppressedPartId,
    ]
  );

  useEffect(() => {
    if (isPartEditPanelOpen) {
      return;
    }
    setPartEditLayoutHydrationSuppressed(false);
  }, [isPartEditPanelOpen]);

  useEffect(() => {
    if (!isPartEditPanelOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsPartEditPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPartEditPanelOpen]);

  useEffect(() => {
    if (isPartEditPanelOpen && selectedPart === undefined) {
      setIsPartEditPanelOpen(false);
    }
  }, [isPartEditPanelOpen, selectedPart]);

  useEffect(() => {
    if (project === null) {
      setIsPartEditPanelOpen(false);
    }
  }, [project]);

  const canvasPreviewSlidePx: { widthPx: number; heightPx: number } = useMemo((): {
    widthPx: number;
    heightPx: number;
  } => {
    const fallback: { widthPx: number; heightPx: number } = {
      widthPx: CANVAS_PREVIEW_FALLBACK_WIDTH_PX,
      heightPx: CANVAS_PREVIEW_FALLBACK_HEIGHT_PX,
    };
    if (selectedPart === undefined) {
      return fallback;
    }
    if (readProjectPartType(selectedPart) === PART_KIND_FOR_CREATE.LYRICS) {
      return fallback;
    }
    const layoutIds: string[] = extractLayoutIdsForCanvasPreview(selectedPart);
    const bounds: { widthPx: number; heightPx: number } | null = computeSlideBoundsPxForLayoutIds(
      templateLayouts,
      layoutIds
    );
    if (bounds === null) {
      return fallback;
    }
    return bounds;
  }, [templateLayouts, selectedPart]);

  useLayoutEffect(() => {
    if (project === null || isLoading || loadError !== null) {
      return;
    }
    const sizerEl: HTMLDivElement | null = canvasPreviewSizerRef.current;
    const frameEl: HTMLDivElement | null = canvasPreviewFrameRef.current;
    if (sizerEl === null || frameEl === null) {
      return;
    }
    const slideW: number = Math.max(1, canvasPreviewSlidePx.widthPx);
    const slideH: number = Math.max(1, canvasPreviewSlidePx.heightPx);
    const applyCanvasPreviewFit = (): void => {
      const rect: DOMRect = sizerEl.getBoundingClientRect();
      const availW: number = rect.width;
      const availH: number = rect.height;
      const maxWidthForHeight: number = (availH * slideW) / slideH;
      const fitW: number = Math.min(availW, maxWidthForHeight);
      const fitH: number = (fitW * slideH) / slideW;
      frameEl.style.width = `${fitW}px`;
      frameEl.style.height = `${fitH}px`;
    };
    applyCanvasPreviewFit();
    const resizeObserver: ResizeObserver = new ResizeObserver(() => {
      applyCanvasPreviewFit();
    });
    resizeObserver.observe(sizerEl);
    return () => {
      resizeObserver.disconnect();
    };
  }, [
    project,
    isLoading,
    loadError,
    sortedParts.length,
    selectedPartIndex,
    canvasPreviewSlidePx.widthPx,
    canvasPreviewSlidePx.heightPx,
  ]);

  return (
    <div ref={workspacePageRootRef} className="relative flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
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

      <nav
        ref={projectNavRef}
        className="flex min-w-0 shrink-0 items-center gap-2 border-b border-neutral-200/70 bg-[#fbfbfa] px-6 py-2.5 dark:border-white/[0.06] dark:bg-[#191919] sm:gap-3"
        aria-label="Back to projects"
      >
        <button
          type="button"
          className="shrink-0 text-[15px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
          onClick={handleBackToProjects}
        >
          ‹ Projects
        </button>
        {project !== null && isProjectTitlePinnedToNav ? (
          <>
            <span className="shrink-0 text-[15px] text-neutral-300 dark:text-neutral-600" aria-hidden>
              /
            </span>
            <span
              className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
              title={project.name}
            >
              {project.name}
            </span>
          </>
        ) : null}
      </nav>

      <main
        ref={workspaceMainLayoutRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-[#fbfbfa] dark:bg-[#191919]"
        style={
          !isLoading && loadError === null && project !== null && workspaceMainPaddingBottomPx > 0
            ? { paddingBottom: `${workspaceMainPaddingBottomPx}px` }
            : undefined
        }
      >
        {isLoading ? (
          <p className="px-6 py-10 text-center text-[15px] text-neutral-500 dark:text-neutral-400">Loading project…</p>
        ) : null}

        {loadError !== null ? (
          <p
            className="mx-6 mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {!isLoading && loadError === null && project !== null ? (
          <>
            <section
              className="shrink-0 border-b border-neutral-200/90 px-4 pb-2 pt-8 dark:border-white/[0.08] sm:px-8 sm:pb-4 sm:pt-10"
              aria-label="Project details"
            >
              <div className="mx-auto w-full max-w-[900px]">
                <h1
                  ref={projectTitleHeadingRef}
                  id="project-workspace-title"
                  className="text-[32px] font-bold leading-[1.2] tracking-tight text-neutral-900 sm:text-[40px] dark:text-neutral-50"
                >
                  {project.name}
                </h1>
                {workspaceMetaError !== null ? (
                  <p className="mt-2 text-[14px] text-amber-700 dark:text-amber-400/90" role="status">
                    {workspaceMetaError}
                  </p>
                ) : null}
                <div
                  ref={projectInformationRef}
                  className="mt-10 overflow-x-hidden overflow-y-hidden border-t border-neutral-200/90 dark:border-white/[0.08]"
                >
                  <div className="divide-y divide-neutral-200/90 dark:divide-white/[0.08]">
                    <NotionPropertyRow icon={<NotionPersonIcon />} label="Owner">
                      <span className="block truncate" title={ownerUsername}>
                        {ownerUsername}
                      </span>
                    </NotionPropertyRow>
                    <NotionPropertyRow icon={<NotionDocumentIcon />} label="Template">
                      <p
                        className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[14px] leading-snug text-neutral-800 dark:text-neutral-200"
                        title={project.template_id}
                      >
                        <span className="min-w-0 font-medium">
                          {templateDisplayName ?? shortenId(project.template_id)}
                        </span>
                        <span className="shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden>
                          ·
                        </span>
                        <span className="min-w-0 truncate font-mono text-[13px] text-neutral-500 dark:text-neutral-400">
                          {project.template_id}
                        </span>
                      </p>
                    </NotionPropertyRow>
                    <NotionPropertyRow icon={<NotionCalendarIcon />} label="Created">
                      {formatInstant(project.created_at)}
                    </NotionPropertyRow>
                    <NotionPropertyRow icon={<NotionHistoryIcon />} label="Last edited">
                      {formatInstant(project.updated_at)}
                    </NotionPropertyRow>
                  </div>
                </div>
              </div>
            </section>

            <div className="shrink-0" aria-label="Project notices">
              {defaultLayoutId === null && workspaceMetaError === null ? (
                <p
                  className="mx-auto mb-4 w-full max-w-none px-4 text-center text-[13px] text-neutral-500 sm:px-6 dark:text-neutral-400"
                  role="status"
                >
                  No layout id could be read from the template, so new parts cannot be added until the template exposes
                  at least one layout with shapes.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </main>

      {!isLoading && loadError === null && project !== null ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex w-full flex-col gap-0 bg-[#fbfbfa] px-3 py-4 dark:bg-[#191919] sm:px-5 sm:py-6"
          style={{ top: `${canvasWorkspaceTopPx}px` }}
          aria-label="Project parts and canvas"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-0 sm:flex-row sm:items-stretch sm:gap-3">
            <aside
              ref={projectPartsAsideRef}
              className="relative z-30 min-h-0 w-full shrink-0 overflow-hidden pb-3 sm:flex sm:h-full sm:max-h-full sm:w-auto sm:flex-row sm:items-stretch sm:gap-2 sm:self-stretch sm:pb-0"
              aria-label="Project parts"
            >
              <div
                ref={partsListThumbViewportRef}
                className="flex min-h-0 min-w-0 w-full flex-1 flex-row gap-2 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] sm:h-full sm:max-h-full sm:min-h-0 sm:w-48 sm:max-w-[12rem] sm:flex-col sm:overflow-hidden sm:overflow-x-hidden"
              >
                <div
                  ref={partsListMeasureRef}
                  className="flex w-max min-w-0 shrink-0 flex-row gap-2 sm:w-full sm:flex-col sm:gap-2"
                >
                  {sortedParts.map((part: unknown, index: number) => {
                    const isSelected: boolean = index === selectedPartIndex;
                    const primaryLayoutId: string | null = getPrimaryLayoutIdFromPart(part);
                    const partTypeForThumb: string = readProjectPartType(part);
                    const isPlainOrValuePart: boolean =
                      partTypeForThumb === PART_KIND_FOR_CREATE.PLAIN ||
                      partTypeForThumb === PART_KIND_FOR_CREATE.VALUE;
                    const isLyricsPartForThumb: boolean = partTypeForThumb === PART_KIND_FOR_CREATE.LYRICS;
                    const partIdForThumb: string | null = getProjectPartId(part);
                    const suppressThumb: boolean =
                      partIdForThumb !== null &&
                      plainValueLayoutPreviewSuppressedPartIds.includes(partIdForThumb) &&
                      isPlainOrValuePart;
                    const effectivePrimaryLayoutId: string | null =
                      isLyricsPartForThumb || suppressThumb ? null : primaryLayoutId;
                    const thumbLayoutEntry: GetLayoutResponse | null =
                      effectivePrimaryLayoutId !== null
                        ? findTemplateLayoutEntryByLayoutId(templateLayouts, effectivePrimaryLayoutId)
                        : null;
                    const partTypeLabel: string = getPartTypeLabel(part);
                    return (
                      <div
                        key={getProjectPartStableKey(part, index)}
                        className={`relative shrink-0 rounded-lg sm:w-full ${
                          isSelected ? "ring-2 ring-[#0071e3]/35 dark:ring-[#0a84ff]/40" : ""
                        }`}
                      >
                        <div
                          className={`flex w-full flex-col rounded-lg border text-left transition ${
                            isSelected
                              ? "border-[#0071e3] bg-white shadow-sm dark:border-[#0a84ff] dark:bg-[#2c2c2e]"
                              : "border-black/[0.08] bg-white/90 hover:border-black/[0.14] dark:border-white/[0.1] dark:bg-[#1c1c1e]/90 dark:hover:border-white/[0.16]"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex w-full flex-col gap-1 rounded-t-lg p-2 pb-1 text-left outline-none transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                            onClick={() => {
                              setSelectedPartIndex(index);
                            }}
                          >
                            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-neutral-200/90 dark:bg-neutral-800/90">
                              {isLyricsPartForThumb ? (
                                <div className="flex h-full w-full items-center justify-center px-1" role="status">
                                  <span className="text-center text-[10px] font-medium leading-tight text-neutral-500 dark:text-neutral-400">
                                    {CANVAS_PREVIEW_LYRICS_PART_LABEL}
                                  </span>
                                </div>
                              ) : thumbLayoutEntry !== null ? (
                                <TemplateLayoutThumbnail
                                  key={`part-thumb-${getProjectPartId(part) ?? `idx-${String(index)}`}-${effectivePrimaryLayoutId ?? "nolayout"}`}
                                  entry={thumbLayoutEntry}
                                  className="block h-full w-full"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                                  {index + 1}
                                </div>
                              )}
                              <span
                                className="pointer-events-none absolute left-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white"
                                aria-hidden
                              >
                                {index + 1}
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            ref={partTypeMenuOpenIndex === index ? partTypeMenuTriggerRef : undefined}
                            className="w-full truncate rounded-b-lg px-2 pb-2 pt-0 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500 outline-none transition hover:bg-black/[0.02] hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-white/[0.03] dark:hover:text-neutral-200 dark:focus-visible:ring-[#0a84ff]"
                            aria-haspopup="menu"
                            aria-expanded={partTypeMenuOpenIndex === index}
                            aria-controls={PART_KIND_CHANGE_MENU_ID}
                            disabled={isPatchingParts}
                            onClick={(event: MouseEvent<HTMLButtonElement>): void => {
                              event.stopPropagation();
                              setIsAddPartMenuOpen(false);
                              setSelectedPartIndex(index);
                              setPartTypeMenuOpenIndex((open: number | null): number | null =>
                                open === index ? null : index
                              );
                            }}
                          >
                            {partTypeLabel}
                          </button>
                        </div>
                        <button
                          type="button"
                          className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-black/[0.06] bg-white/95 text-neutral-500 shadow-sm outline-none transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:opacity-40 dark:border-white/[0.1] dark:bg-[#2c2c2e]/95 dark:text-neutral-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/15 dark:hover:text-red-400 dark:focus-visible:ring-[#0a84ff]"
                          aria-label={`Delete part ${String(index + 1)}`}
                          disabled={isPatchingParts}
                          onClick={(event: MouseEvent<HTMLButtonElement>): void => {
                            event.stopPropagation();
                            handleDeletePartAtIndex(index);
                          }}
                        >
                          <PartDeleteIcon />
                        </button>
                      </div>
                    );
                  })}
                  <div className="relative z-40 shrink-0 sm:w-full">
                    <button
                      ref={addPartTileRef}
                      type="button"
                      className="flex w-full flex-col gap-1 rounded-lg border border-dashed border-neutral-300 bg-white/70 p-2 text-left outline-none transition hover:border-neutral-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-[#1c1c1e]/70 dark:hover:border-neutral-500 dark:hover:bg-[#2c2c2e]"
                      aria-expanded={isAddPartMenuOpen}
                      aria-controls={ADD_PART_KIND_MENU_ID}
                      aria-haspopup="menu"
                      aria-label="Add part"
                      title={defaultLayoutId === null ? "No layout is available from this template yet." : undefined}
                      disabled={defaultLayoutId === null || isPatchingParts}
                      onClick={() => {
                        setPartTypeMenuOpenIndex(null);
                        setIsAddPartMenuOpen((open: boolean) => !open);
                      }}
                    >
                      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-neutral-100/90 dark:bg-neutral-800/60">
                        {isPatchingParts ? (
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">…</span>
                        ) : (
                          <span className="text-[26px] font-light leading-none text-[#0071e3] dark:text-[#0a84ff]">
                            +
                          </span>
                        )}
                      </div>
                      <span className="pointer-events-none block min-h-[14px]" aria-hidden />
                    </button>
                    {isAddPartMenuOpen && addPartMenuAnchor !== null
                      ? createPortal(
                          <div
                            id={ADD_PART_KIND_MENU_ID}
                            role="menu"
                            aria-label="Part type"
                            className="fixed z-[500] rounded-xl border border-black/[0.1] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                            style={{
                              top: addPartMenuAnchor.topPx,
                              left: addPartMenuAnchor.leftPx,
                              width: addPartMenuAnchor.widthPx,
                              maxHeight: `${addPartMenuAnchor.maxHeightPx}px`,
                              overflowY: "auto",
                            }}
                          >
                            {ADD_PART_KIND_OPTIONS.map((row: AddPartKindOption) => (
                              <button
                                key={row.kind}
                                type="button"
                                role="menuitem"
                                className={ADD_PART_KIND_OPTION_CLASS}
                                onClick={() => {
                                  handleAddPartOfKind(row.kind);
                                }}
                              >
                                <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.label}</span>
                              </button>
                            ))}
                          </div>,
                          document.body
                        )
                      : null}
                  </div>
                </div>
              </div>
              <div
                ref={partsListScrollerRef}
                className="hidden min-h-0 w-3 shrink-0 touch-pan-y overflow-y-auto overflow-x-hidden sm:block"
                aria-label="Scroll project parts"
                onScroll={handlePartsListRailScroll}
              >
                <div ref={partsScrollSpacerRef} className="pointer-events-none w-px shrink-0" />
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden sm:flex-row sm:gap-3">
              <section
                className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]"
                aria-label="Selected part preview"
              >
                <div
                  className={`relative flex items-center border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08] ${CANVAS_SECTION_HEADER_ROW_MIN_HEIGHT_CLASS}`}
                >
                  <div className="relative z-10 shrink-0">
                    <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Canvas</h2>
                  </div>
                  {sortedParts.length > 0 && selectedPart !== undefined ? (
                    <div className="relative z-10 ml-auto shrink-0">
                      <button
                        type="button"
                        className="rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5"
                        disabled={isPatchingParts}
                        title="Change slide template layout and more."
                        aria-label={`Edit part ${String(selectedPartIndex + 1)} · ${selectedPartLabel}`}
                        onClick={handleEditSelectedPartFromCanvas}
                      >
                        Edit
                      </button>
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 sm:px-24">
                    <div className="min-w-0 max-w-[min(28rem,calc(100%-7rem))] text-center">
                      {canvasPlaceholderHoverLabel !== null && canvasPlaceholderHoverLabel.length > 0 ? (
                        <p
                          className="truncate font-[ui-rounded,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[11px] font-medium uppercase leading-snug tracking-[0.26em] text-neutral-600 dark:text-neutral-300"
                          aria-live="polite"
                        >
                          {canvasPlaceholderHoverLabel}
                        </p>
                      ) : (
                        <p className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">
                          {canvasHeaderCenterDefaultText}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4 sm:px-6 sm:py-6">
                  {sortedParts.length === 0 ? (
                    <p className="mx-auto max-w-prose flex flex-1 items-center justify-center text-center text-[14px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                      No parts yet. Tap the + tile at the end of the part list, then choose Plain, Value, Lyrics, or
                      Bible (uses your template&apos;s default layout id).
                    </p>
                  ) : selectedPart !== undefined ? (
                    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3">
                      <div
                        ref={canvasPreviewSizerRef}
                        className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden"
                      >
                        <div
                          ref={canvasPreviewFrameRef}
                          className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/[0.08] bg-neutral-100 dark:border-white/[0.1] dark:bg-neutral-900/80"
                        >
                          {selectedPartIsLyrics ? (
                            <div
                              className={`flex ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS} ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS} flex-col items-center justify-center px-4`}
                              role="status"
                            >
                              <span className="text-center text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
                                {CANVAS_PREVIEW_LYRICS_PART_LABEL}
                              </span>
                            </div>
                          ) : selectedPartLayoutEntry !== null ? (
                            <TemplateLayoutThumbnail
                              key={`canvas-preview-${String(selectedPartIndex)}-${getProjectPartId(selectedPart) ?? "noid"}-${getPrimaryLayoutIdFromPart(selectedPart) ?? "nolayout"}-${plainValueLayoutPreviewSuppressed ? "pv-sup" : "pv-show"}`}
                              entry={selectedPartLayoutEntry}
                              className="max-h-full max-w-full"
                              highlightedShapeKey={
                                selectedPartIsValue && !plainValueLayoutPreviewSuppressed
                                  ? canvasValueHighlightShapeKey
                                  : null
                              }
                              onPlaceholderHoverLabelChange={setCanvasPlaceholderHoverLabel}
                            />
                          ) : (
                            <div
                              className={`flex ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS} ${CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS} items-center justify-center`}
                              aria-hidden
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
              {isPartEditPanelOpen && selectedPartIsLyrics ? (
                <LyricsPartEditForm
                  ref={partEditPanelRef}
                  isOpen={isPartEditPanelOpen}
                  onClose={handleClosePartEditPanel}
                  partHeading={partEditHeading}
                  layoutChoices={templateLayoutChoices}
                  lyricsLayoutId={partEditLyricsLyricsLayoutId}
                  titleLayoutId={partEditLyricsTitleLayoutId}
                  onChangeLyricsLayoutId={setPartEditLyricsLyricsLayoutId}
                  onChangeTitleLayoutId={setPartEditLyricsTitleLayoutId}
                  songs={partEditLyricsSongs}
                  onSongsChange={setPartEditLyricsSongs}
                  emptyStateMessage={partEditEmptyStateMessage}
                  isSaveDisabled={isPartLyricsSaveDisabled || isPatchingParts}
                  isSaving={isPatchingParts}
                  onSave={handleSaveLyricsPart}
                />
              ) : (
                <PartEditPanel
                  ref={partEditPanelRef}
                  isOpen={isPartEditPanelOpen}
                  onClose={handleClosePartEditPanel}
                  partHeading={partEditHeading}
                  layoutFieldLabel={partEditLayoutFieldLabel}
                  layoutChoices={templateLayoutChoices}
                  selectedLayoutId={partEditSelectedLayoutId}
                  onSelectLayoutId={handleSelectPartEditLayoutId}
                  isSaveDisabled={
                    isPartPrimaryLayoutSaveDisabled || partEditEmptyStateMessage !== null || isPatchingParts
                  }
                  isSaving={isPatchingParts}
                  onSave={handleSavePartPrimaryLayout}
                  emptyStateMessage={partEditEmptyStateMessage}
                  showClearLayoutSelectionControl={isPartEditPanelOpen && selectedPartIsPlainOrValue}
                  onClearLayoutSelection={handleClearPartLayoutSelection}
                  valuePlaceholderRows={valuePlaceholderRowsForPartEdit}
                  onChangeValuePlaceholderText={handlePartEditValuePlaceholderChange}
                  onFocusValuePlaceholderField={handleFocusValuePlaceholderField}
                  onBlurValuePlaceholderField={handleBlurValuePlaceholderField}
                  saveButtonLabel={partEditPrimarySaveButtonLabel}
                />
              )}
              {partTypeMenuOpenIndex !== null && partTypeMenuAnchor !== null
                ? createPortal(
                    <div
                      id={PART_KIND_CHANGE_MENU_ID}
                      role="menu"
                      aria-label="Part type"
                      className="fixed z-[500] rounded-xl border border-black/[0.1] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                      style={{
                        top: partTypeMenuAnchor.topPx,
                        left: partTypeMenuAnchor.leftPx,
                        width: partTypeMenuAnchor.widthPx,
                        maxHeight: `${partTypeMenuAnchor.maxHeightPx}px`,
                        overflowY: "auto",
                      }}
                    >
                      {ADD_PART_KIND_OPTIONS.map((row: AddPartKindOption) => (
                        <button
                          key={row.kind}
                          type="button"
                          role="menuitem"
                          className={ADD_PART_KIND_OPTION_CLASS}
                          onClick={() => {
                            handleApplyPartKindChange(row.kind);
                          }}
                        >
                          <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.label}</span>
                        </button>
                      ))}
                    </div>,
                    document.body
                  )
                : null}
            </div>
          </div>
        </div>
      ) : null}
      {partActionError !== null || partPlainValueNotice !== null ? (
        <div
          className="pointer-events-none fixed left-1/2 top-6 z-[850] flex w-[min(100vw-2rem,28rem)] -translate-x-1/2 flex-col gap-2 px-4 sm:top-8"
          aria-live="polite"
          aria-label="Part notifications"
        >
          {partActionError !== null ? (
            <div
              className="pointer-events-auto flex items-start gap-2 rounded-2xl border border-red-200/80 bg-white/95 py-2.5 pl-4 pr-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm dark:border-red-500/35 dark:bg-[#2c2c2e]/95 dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              role="alert"
            >
              <p className="min-w-0 flex-1 pt-0.5 text-left text-[13px] leading-snug text-red-800 dark:text-red-200">
                {partActionError}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-md p-1.5 text-red-700 outline-none transition hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40 dark:text-red-300 dark:hover:bg-red-500/15 dark:focus-visible:ring-red-400/40"
                aria-label="Dismiss alert"
                onClick={() => {
                  setPartActionError(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="block h-4 w-4" aria-hidden="true">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : null}
          {partPlainValueNotice !== null ? (
            <div
              className="pointer-events-auto flex items-start gap-2 rounded-2xl border border-amber-200/90 bg-white/95 py-2.5 pl-4 pr-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm dark:border-amber-500/30 dark:bg-[#2c2c2e]/95 dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              role="status"
            >
              <p className="min-w-0 flex-1 pt-0.5 text-left text-[13px] leading-snug text-amber-950 dark:text-amber-100/95">
                {partPlainValueNotice}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-md p-1.5 text-amber-900 outline-none transition hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/15 dark:focus-visible:ring-amber-400/40"
                aria-label="Dismiss notice"
                onClick={() => {
                  setPartPlainValueNotice(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="block h-4 w-4" aria-hidden="true">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <dialog
        ref={partKindChangeConfirmDialogRef}
        className="fixed left-1/2 top-1/2 z-[600] w-[min(100vw-2rem,26rem)] max-h-[min(90dvh,calc(100vh-2rem))] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-black/[0.1] bg-white p-6 text-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
        onClose={handlePartKindConfirmDialogClose}
      >
        {pendingPartKindChangeConfirm !== null ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-semibold tracking-tight">Change part type</h2>
            <p className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              {pendingPartKindChangeConfirm.mode === "plainValueCrossover"
                ? PART_KIND_PLAIN_VALUE_CROSSOVER_MESSAGE
                : PART_KIND_LOSE_FILLED_DATA_MESSAGE}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-transparent px-5 text-[15px] font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
                onClick={handleCancelPendingPartKindChange}
                disabled={isPatchingParts}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex h-11 items-center justify-center rounded-xl bg-[#0071e3] px-5 text-[15px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
                disabled={isPatchingParts}
                onClick={handleConfirmPendingPartKindChange}
              >
                {isPatchingParts ? "Saving…" : "Continue"}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
};
