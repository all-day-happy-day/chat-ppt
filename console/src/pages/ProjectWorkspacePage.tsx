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
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import {
  appendNewPartForPatch,
  computeSlideBoundsPxForLayoutIds,
  extractLayoutIdsForCanvasPreview,
  getPartTypeLabel,
  getProjectPartId,
  getProjectPartStableKey,
  PART_KIND_FOR_CREATE,
  removePartByIdForPatch,
  sortProjectPartsForDisplay,
  type PartKindForCreate,
} from "../lib/project-parts-for-patch";
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

const ADD_PART_MENU_MAX_WIDTH_PX: number = 272;

const ADD_PART_MENU_VIEWPORT_GUTTER_PX: number = 8;

const ADD_PART_MENU_FALLBACK_HEIGHT_PX: number = 200;

const ADD_PART_MENU_MIN_SCROLL_HEIGHT_PX: number = 120;

const PROJECT_TITLE_NAV_PIN_TOLERANCE_PX: number = 2;

const CANVAS_WORKSPACE_MIN_HEIGHT_PX: number = 160;

const MAIN_SCROLL_DOCK_EPSILON_PX: number = 1;

/** Fallback slide size when template layout geometry is missing or not yet loaded. */
const CANVAS_PREVIEW_FALLBACK_WIDTH_PX: number = 960;

const CANVAS_PREVIEW_FALLBACK_HEIGHT_PX: number = 540;

/** Approximate line height when normalizing `WheelEvent.deltaMode === DOM_DELTA_LINE`. */
const WHEEL_SCROLL_LINE_HEIGHT_PX: number = 16;

/** Tailwind `sm:` breakpoint (must match `tailwind` default). */
const SM_BREAKPOINT_MIN_WIDTH_PX: number = 640;

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
  hint: string;
};

const ADD_PART_KIND_OPTIONS: AddPartKindOption[] = [
  {
    kind: PART_KIND_FOR_CREATE.PLAIN,
    label: "Plain",
    hint: "Blank slide from the template layout.",
  },
  {
    kind: PART_KIND_FOR_CREATE.VALUE,
    label: "Value",
    hint: "Slide with placeholder fields you can fill in.",
  },
  {
    kind: PART_KIND_FOR_CREATE.LYRICS,
    label: "Lyrics",
    hint: "Song-style blocks (title + lyrics lines).",
  },
  {
    kind: PART_KIND_FOR_CREATE.BIBLE,
    label: "Bible",
    hint: "Scripture range (starts with a sample verse).",
  },
];

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
  const [isPatchingParts, setIsPatchingParts] = useState<boolean>(false);
  const [isAddPartMenuOpen, setIsAddPartMenuOpen] = useState<boolean>(false);
  const [addPartMenuAnchor, setAddPartMenuAnchor] = useState<AddPartMenuAnchor | null>(null);
  const addPartTileRef = useRef<HTMLButtonElement | null>(null);
  const partsListThumbViewportRef = useRef<HTMLDivElement | null>(null);
  const partsListMeasureRef = useRef<HTMLDivElement | null>(null);
  const partsScrollSpacerRef = useRef<HTMLDivElement | null>(null);
  const partsListScrollerRef = useRef<HTMLDivElement | null>(null);
  const workspaceMainScrollRef = useRef<HTMLElement | null>(null);
  const projectNavRef = useRef<HTMLElement | null>(null);
  const projectInformationRef = useRef<HTMLDivElement | null>(null);
  const projectTitleHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const canvasWorkspaceSectionRef = useRef<HTMLElement | null>(null);
  const canvasPreviewSizerRef = useRef<HTMLDivElement | null>(null);
  const canvasPreviewFrameRef = useRef<HTMLDivElement | null>(null);
  const navTitleScrollRafRef = useRef<number | null>(null);
  const [isProjectTitlePinnedToNav, setIsProjectTitlePinnedToNav] = useState<boolean>(false);
  const [canvasWorkspaceTopPx, setCanvasWorkspaceTopPx] = useState<number>(0);
  const [workspaceMainPaddingBottomPx, setWorkspaceMainPaddingBottomPx] = useState<number>(0);

  const updateCanvasWorkspaceDock = useCallback((): void => {
    const navEl: HTMLElement | null = projectNavRef.current;
    const mainEl: HTMLElement | null = workspaceMainScrollRef.current;
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
    const mainEl: HTMLElement | null = workspaceMainScrollRef.current;
    const titleEl: HTMLHeadingElement | null = projectTitleHeadingRef.current;
    if (mainEl === null || titleEl === null) {
      setIsProjectTitlePinnedToNav(false);
      return;
    }
    const mainRect: DOMRect = mainEl.getBoundingClientRect();
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
    const mainEl: HTMLElement | null = workspaceMainScrollRef.current;
    const titleEl: HTMLHeadingElement | null = projectTitleHeadingRef.current;
    const navEl: HTMLElement | null = projectNavRef.current;
    const infoEl: HTMLDivElement | null = projectInformationRef.current;
    if (mainEl === null || titleEl === null) {
      return;
    }
    updateProjectTitleInNav();
    updateCanvasWorkspaceDock();
    mainEl.addEventListener("scroll", handleMainScrollForDock, { passive: true });
    window.addEventListener("resize", handleMainScrollForDock);
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleMainScrollForDock();
      });
      resizeObserver.observe(mainEl);
      resizeObserver.observe(titleEl);
      if (navEl !== null) {
        resizeObserver.observe(navEl);
      }
      if (infoEl !== null) {
        resizeObserver.observe(infoEl);
      }
    }
    return () => {
      mainEl.removeEventListener("scroll", handleMainScrollForDock);
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
    if (project === null || isLoading || loadError !== null) {
      return;
    }
    const sectionEl: HTMLElement | null = canvasWorkspaceSectionRef.current;
    if (sectionEl === null) {
      return;
    }
    const handleWheelScrollMain = (event: WheelEvent): void => {
      const mainEl: HTMLElement | null = workspaceMainScrollRef.current;
      if (mainEl === null) {
        return;
      }
      const lineMultiplier: number = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_SCROLL_LINE_HEIGHT_PX : 1;
      const pageMultiplier: number = event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? mainEl.clientHeight : 1;
      const deltaPx: number = event.deltaY * lineMultiplier * pageMultiplier;
      mainEl.scrollTop += deltaPx;
      event.preventDefault();
    };
    sectionEl.addEventListener("wheel", handleWheelScrollMain, { passive: false });
    return () => {
      sectionEl.removeEventListener("wheel", handleWheelScrollMain);
    };
  }, [project, isLoading, loadError]);

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
    const mainScroller: HTMLElement | null = workspaceMainScrollRef.current;
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
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden">
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
        ref={workspaceMainScrollRef}
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
          <div className="flex flex-col">
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
                  className="mt-10 border-t border-neutral-200/90 dark:border-white/[0.08]"
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

            {defaultLayoutId === null && workspaceMetaError === null ? (
              <p
                className="mx-auto mb-4 w-full max-w-none px-4 text-center text-[13px] text-neutral-500 sm:px-6 dark:text-neutral-400"
                role="status"
              >
                No layout id could be read from the template, so new parts cannot be added until the template exposes at
                least one layout with shapes.
              </p>
            ) : null}

            {partActionError !== null ? (
              <p
                className="mx-auto mb-6 w-full max-w-none rounded-xl bg-red-500/10 px-4 py-3 text-center text-[13px] text-red-700 sm:px-6 dark:bg-red-500/15 dark:text-red-300"
                role="alert"
              >
                {partActionError}
              </p>
            ) : null}
          </div>
        ) : null}
      </main>

      {!isLoading && loadError === null && project !== null ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex w-full flex-col gap-0 bg-[#fbfbfa] px-3 py-4 dark:bg-[#191919] sm:flex-row sm:items-stretch sm:gap-3 sm:px-5 sm:py-6"
          style={{ top: `${canvasWorkspaceTopPx}px` }}
          aria-label="Project parts and canvas"
        >
          <aside
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
                  return (
                    <div
                      key={getProjectPartStableKey(part, index)}
                      className={`relative shrink-0 rounded-lg sm:w-full ${
                        isSelected ? "ring-2 ring-[#0071e3]/35 dark:ring-[#0a84ff]/40" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className={`flex w-full flex-col gap-1 rounded-lg border p-2 text-left outline-none transition ${
                          isSelected
                            ? "border-[#0071e3] bg-white shadow-sm dark:border-[#0a84ff] dark:bg-[#2c2c2e]"
                            : "border-black/[0.08] bg-white/90 hover:border-black/[0.14] dark:border-white/[0.1] dark:bg-[#1c1c1e]/90 dark:hover:border-white/[0.16]"
                        }`}
                        onClick={() => {
                          setSelectedPartIndex(index);
                        }}
                      >
                        <div className="flex aspect-video w-full items-center justify-center rounded-md bg-neutral-200/90 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800/90 dark:text-neutral-300">
                          {index + 1}
                        </div>
                        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          {getPartTypeLabel(part)}
                        </span>
                      </button>
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
                              <span className="text-[12px] font-normal leading-snug text-neutral-500 dark:text-neutral-400">
                                {row.hint}
                              </span>
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

          <section
            ref={canvasWorkspaceSectionRef}
            className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]"
            aria-label="Selected part preview"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Canvas</h2>
                <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
                  {sortedParts.length === 0
                    ? "Add a part to begin. Use the + tile at the end of the list and pick Plain, Value, Lyrics, or Bible."
                    : `Part ${selectedPartIndex + 1} of ${sortedParts.length} · ${selectedPartLabel}`}
                </p>
              </div>
              {sortedParts.length > 0 && selectedPart !== undefined ? (
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-red-200/90 bg-red-50/90 px-3 py-1.5 text-[12px] font-medium text-red-700 outline-none transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                  disabled={isPatchingParts}
                  onClick={() => {
                    handleDeletePartAtIndex(selectedPartIndex);
                  }}
                >
                  Delete part
                </button>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4 sm:px-6 sm:py-6">
              {sortedParts.length === 0 ? (
                <p className="mx-auto max-w-prose flex flex-1 items-center justify-center text-center text-[14px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  No parts yet. Tap the + tile at the end of the part list, then choose Plain, Value, Lyrics, or Bible
                  (uses your template&apos;s default layout id).
                </p>
              ) : selectedPart !== undefined ? (
                <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3">
                  <div
                    ref={canvasPreviewSizerRef}
                    className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden"
                  >
                    <div
                      ref={canvasPreviewFrameRef}
                      className="shrink-0 rounded-xl border border-black/[0.08] bg-neutral-100 dark:border-white/[0.1] dark:bg-neutral-900/80"
                    />
                  </div>
                  <p className="shrink-0 text-center text-[13px] text-neutral-500 dark:text-neutral-400">
                    Slide preview and editing will go here.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};
