import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { signOut, verifySession } from "../api/auth";
import { listProjectsByUserId, patchProjectById } from "../api/project";
import { listTemplateLayoutsByTemplateId, listTemplatesByUserId } from "../api/template";
import { listUsers } from "../api/user";
import { PART_EDIT_LAYOUT_PALETTE_MENU_ID, type ValuePlaceholderEditorRow } from "../components/PartEditPanel";
import {
  LYRICS_EDIT_LYRICS_LAYOUT_PALETTE_MENU_ID,
  LYRICS_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID,
} from "../components/TemplateLayoutGalleryPicker";
import { isSignInRequiredError } from "../lib/auth-errors";
import {
  appendNewPartForPatch,
  applyPlainValueLayoutReconcileToNormalizedParts,
  clampSortedInsertIndexForNewPart,
  moveSortedPartToSortedIndex,
  buildValuePartContentsPayloadFromFieldRows,
  buildValuePartPlaceholderEditRows,
  computeSlideBoundsPxForLayoutIds,
  extractLayoutIdsForCanvasPreview,
  findTemplateLayoutEntryByLayoutId,
  getPartTypeLabel,
  getPrimaryLayoutIdFromPart,
  getPrimaryTemplateLayoutFieldLabel,
  getProjectPartId,
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
import {
  createDefaultLyricsSongRow,
  mergeLyricsSongRowsIntoExistingContents,
  readLyricsSongRowsFromPart,
  readLyricsTemplateLayoutIdsFromPart,
} from "../lib/lyrics-part-contents";
import { readLyricsPartSongsSnapshotFromLocation } from "../lib/lyrics-song-configure-location-state";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import {
  DUPLICATE_LYRIC_PART_NAME_USER_WARNING,
  DUPLICATE_LYRIC_PART_NAME_WARNING_MS,
  isDuplicateLyricPartNamePatchError,
} from "../lib/parse-api-error";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetLayoutResponse } from "../types/template-layout";
import type { GetTemplateResponse } from "../types/template";
import type { GetProjectResponse } from "../types/project";
import type { GetUserResponse } from "../types/user";
import {
  ADD_PART_KIND_MENU_ID,
  ADD_PART_MENU_ANCHOR_SELECTOR,
  ADD_PART_MENU_FALLBACK_HEIGHT_PX,
  ADD_PART_MENU_MAX_WIDTH_PX,
  ADD_PART_MENU_MIN_SCROLL_HEIGHT_PX,
  ADD_PART_MENU_VIEWPORT_GUTTER_PX,
  CANVAS_PREVIEW_FALLBACK_HEIGHT_PX,
  CANVAS_PREVIEW_FALLBACK_WIDTH_PX,
  CANVAS_WORKSPACE_MIN_HEIGHT_PX,
  MAIN_SCROLL_DOCK_EPSILON_PX,
  PART_KIND_CHANGE_MENU_ID,
  PART_TOAST_AUTO_DISMISS_MS,
  PROJECT_TITLE_NAV_PIN_TOLERANCE_PX,
  SM_BREAKPOINT_MIN_WIDTH_PX,
  WHEEL_SCROLL_LINE_HEIGHT_PX,
  WORKSPACE_LOAD_NETWORK_FALLBACK,
} from "./project-workspace/constants";
import { PartKindChangeDialog } from "./project-workspace/PartKindChangeDialog";
import { PartNotifications } from "./project-workspace/PartNotifications";
import { PartsAside } from "./project-workspace/PartsAside";
import type {
  AddPartMenuAnchor,
  PartEditValueFieldRowState,
  PendingPartKindChangeConfirm,
} from "./project-workspace/types";
import {
  isPlainValuePartKindCrossover,
  needsDestructivePartKindConfirm,
  pickDefaultLayoutId,
  readProjectPartType,
  resolveOwnerUsername,
} from "./project-workspace/utils";
import { WorkspaceBackNav } from "./project-workspace/WorkspaceBackNav";
import { WorkspaceCanvasEditorColumn } from "./project-workspace/WorkspaceCanvasEditorColumn";
import { WorkspaceHeader } from "./project-workspace/WorkspaceHeader";
import { WorkspaceMetaSection } from "./project-workspace/WorkspaceMetaSection";

const RESTORE_LYRICS_PART_EDIT_PANEL_KEY: string = "restoreLyricsPartEditPanel";

const LYRICS_PART_EDIT_SORTED_INDEX_KEY: string = "lyricsPartEditPartSortedIndex";

export const ProjectWorkspacePage = () => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const location = useLocation();
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
  const [lyricsDuplicatePartNameWarning, setLyricsDuplicatePartNameWarning] = useState<string | null>(null);
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
  const addPartMenuTriggerRef = useRef<HTMLElement | null>(null);
  const addPartInsertBeforeRef = useRef<number>(0);
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
  const [partEditLyricsSongs, setPartEditLyricsSongs] = useState<LyricsSongRow[]>([createDefaultLyricsSongRow()]);
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
    const anchor: HTMLElement | null = addPartMenuTriggerRef.current;
    if (anchor === null) {
      return;
    }
    const rect: DOMRect = anchor.getBoundingClientRect();
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
      addPartMenuTriggerRef.current = null;
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
      const anchorNode: HTMLElement | null = addPartMenuTriggerRef.current;
      if (anchorNode !== null) {
        resizeObserver.observe(anchorNode);
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
      if (event.target instanceof Element && event.target.closest(ADD_PART_MENU_ANCHOR_SELECTOR) !== null) {
        return;
      }
      const menuEl: HTMLElement | null = document.getElementById(ADD_PART_KIND_MENU_ID);
      if (menuEl !== null && menuEl.contains(event.target)) {
        return;
      }
      addPartMenuTriggerRef.current = null;
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
        addPartMenuTriggerRef.current = null;
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

  const openAddPartMenu = useCallback((anchor: HTMLElement, insertBeforeSortedIndex: number): void => {
    setPartTypeMenuOpenIndex(null);
    addPartMenuTriggerRef.current = anchor;
    addPartInsertBeforeRef.current = insertBeforeSortedIndex;
    setIsAddPartMenuOpen(true);
  }, []);

  const handleReorderSortedParts = useCallback(
    (fromSortedIndex: number, toSortedIndex: number): void => {
      if (project === null || fromSortedIndex === toSortedIndex) {
        return;
      }
      const ordered: unknown[] = sortProjectPartsForDisplay(project.parts);
      const movedPart: unknown | undefined = ordered[fromSortedIndex];
      const movedId: string | null = movedPart !== undefined ? getProjectPartId(movedPart) : null;
      void (async (): Promise<void> => {
        setPartActionError(null);
        setPartPlainValueNotice(null);
        setIsPatchingParts(true);
        try {
          const partsPayload: unknown[] = moveSortedPartToSortedIndex(project.parts, fromSortedIndex, toSortedIndex);
          const updated: GetProjectResponse = await patchProjectById(project.id, {
            parts: partsPayload,
          });
          setProject(updated);
          if (movedId !== null) {
            const nextSorted: unknown[] = sortProjectPartsForDisplay(updated.parts);
            const nextIndex: number = nextSorted.findIndex((p: unknown): boolean => getProjectPartId(p) === movedId);
            setSelectedPartIndex(nextIndex >= 0 ? nextIndex : 0);
          }
        } catch (error: unknown) {
          if (isSignInRequiredError(error)) {
            handleSessionExpiredNavigation();
            return;
          }
          const message: string =
            error instanceof Error ? error.message : "Could not reorder parts. Try again after refreshing.";
          setPartActionError(message);
        } finally {
          setIsPatchingParts(false);
        }
      })();
    },
    [project, handleSessionExpiredNavigation]
  );

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
      if (project === null) {
        return;
      }
      const insertBeforeSortedIndex: number = addPartInsertBeforeRef.current;
      setIsAddPartMenuOpen(false);
      addPartMenuTriggerRef.current = null;
      void (async (): Promise<void> => {
        setPartActionError(null);
        setPartPlainValueNotice(null);
        setIsPatchingParts(true);
        try {
          const partsPayload: unknown[] = appendNewPartForPatch(project.parts, kind, null, insertBeforeSortedIndex);
          const updated: GetProjectResponse = await patchProjectById(project.id, {
            parts: partsPayload,
          });
          setProject(updated);
          const sortedBefore: unknown[] = sortProjectPartsForDisplay(project.parts);
          const insertAt: number = clampSortedInsertIndexForNewPart(sortedBefore, insertBeforeSortedIndex);
          setSelectedPartIndex(insertAt);
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
    [project, handleSessionExpiredNavigation]
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

  const handlePartTypeMenuButtonClick = useCallback((event: MouseEvent<HTMLButtonElement>, index: number): void => {
    event.stopPropagation();
    addPartMenuTriggerRef.current = null;
    setIsAddPartMenuOpen(false);
    setSelectedPartIndex(index);
    setPartTypeMenuOpenIndex((open: number | null): number | null => (open === index ? null : index));
  }, []);

  const selectedPart: unknown | undefined = sortedParts[selectedPartIndex];
  const selectedPartRef = useRef<unknown | undefined>(undefined);
  selectedPartRef.current = selectedPart;
  /** Avoid overwriting lyrics song rows hydrated from configure return snapshot (see restore-from-location effect). */
  const skipLyricsPartEditHydrateFromSelectedPartOnceRef = useRef<boolean>(false);
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
      return "Use the + before Part 1 in the parts list to add Plain, Value, Lyrics, or Bible.";
    }
    return `Part ${String(selectedPartIndex + 1)} of ${String(sortedParts.length)} · ${selectedPartLabel}`;
  }, [sortedParts.length, selectedPartIndex, selectedPartLabel]);

  const handleClosePartEditPanel = useCallback((): void => {
    setIsPartEditPanelOpen(false);
  }, []);

  const applyLyricsPartToEditState = useCallback(
    (part: unknown, lyricsSongRowsOverride?: LyricsSongRow[] | null): void => {
      if (readProjectPartType(part) !== PART_KIND_FOR_CREATE.LYRICS) {
        return;
      }
      const { lyricsLayoutId: lyricsLayoutIdFromPart, titleLayoutId: titleLayoutIdFromPart } =
        readLyricsTemplateLayoutIdsFromPart(part);
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
      const rowsFromPart: LyricsSongRow[] = readLyricsSongRowsFromPart(part);
      const nextSongs: LyricsSongRow[] =
        lyricsSongRowsOverride !== null && lyricsSongRowsOverride !== undefined && lyricsSongRowsOverride.length > 0
          ? lyricsSongRowsOverride
          : rowsFromPart;
      setPartEditLyricsLyricsLayoutId(nextLyricsLayoutId);
      setPartEditLyricsTitleLayoutId(nextTitleLayoutId);
      setPartEditLyricsSongs(nextSongs);
    },
    [templateLayoutChoices]
  );

  useEffect((): void => {
    if (project === null) {
      return;
    }
    const raw: unknown = location.state;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return;
    }
    const stateRecord: Record<string, unknown> = raw as Record<string, unknown>;
    if (stateRecord[RESTORE_LYRICS_PART_EDIT_PANEL_KEY] !== true) {
      return;
    }
    const rawIdx: unknown = stateRecord[LYRICS_PART_EDIT_SORTED_INDEX_KEY];
    if (typeof rawIdx !== "number" || !Number.isInteger(rawIdx) || rawIdx < 0) {
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    const sortedPartsForRestore: unknown[] = sortProjectPartsForDisplay(project.parts);
    if (rawIdx >= sortedPartsForRestore.length) {
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    const partToEdit: unknown = sortedPartsForRestore[rawIdx];
    if (readProjectPartType(partToEdit) !== PART_KIND_FOR_CREATE.LYRICS) {
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    const snapshotRows: LyricsSongRow[] | null = readLyricsPartSongsSnapshotFromLocation(raw);
    const songsFromConfigureReturn: LyricsSongRow[] | null =
      snapshotRows !== null && snapshotRows.length > 0 ? snapshotRows : null;
    skipLyricsPartEditHydrateFromSelectedPartOnceRef.current = true;
    setSelectedPartIndex(rawIdx);
    applyLyricsPartToEditState(partToEdit, songsFromConfigureReturn);
    setIsPartEditPanelOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [project, location.state, location.pathname, applyLyricsPartToEditState, navigate]);

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
    if (!isPartEditPanelOpen) {
      return;
    }
    const part: unknown | undefined = selectedPartRef.current;
    if (part === undefined) {
      return;
    }
    if (readProjectPartType(part) !== PART_KIND_FOR_CREATE.LYRICS) {
      setPartEditLyricsLyricsLayoutId(null);
      setPartEditLyricsTitleLayoutId(null);
      setPartEditLyricsSongs([createDefaultLyricsSongRow()]);
      return;
    }
    if (skipLyricsPartEditHydrateFromSelectedPartOnceRef.current) {
      skipLyricsPartEditHydrateFromSelectedPartOnceRef.current = false;
      return;
    }
    applyLyricsPartToEditState(part);
  }, [isPartEditPanelOpen, selectedPartIndex, applyLyricsPartToEditState]);

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
      const preservedLayouts: { lyricsLayoutId: string | null; titleLayoutId: string | null } =
        readLyricsTemplateLayoutIdsFromPart(part);
      const lyricsLayoutForPatch: string | null =
        partEditLyricsLyricsLayoutId !== null && partEditLyricsLyricsLayoutId.length > 0
          ? partEditLyricsLyricsLayoutId
          : preservedLayouts.lyricsLayoutId;
      const titleLayoutForPatch: string | null =
        partEditLyricsTitleLayoutId !== null && partEditLyricsTitleLayoutId.length > 0
          ? partEditLyricsTitleLayoutId
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
    setPartActionError(null);
    setPartPlainValueNotice(null);
    setLyricsDuplicatePartNameWarning(null);
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
        if (isDuplicateLyricPartNamePatchError(error)) {
          setPartEditLyricsSongs(readLyricsSongRowsFromPart(selectedPart));
          setLyricsDuplicatePartNameWarning(DUPLICATE_LYRIC_PART_NAME_USER_WARNING);
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

  const isPartLyricsSaveDisabled: boolean = partEditEmptyStateMessage !== null;

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
    setPartEditSelectedLayoutId(null);
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
      resolvedLayoutId: string | null,
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
      const resolvedLayoutId: string | null = layoutId;
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
    [project, partTypeMenuOpenIndex, sortedParts, applyPartKindChange]
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
    (layoutId: string | null): void => {
      if (layoutId === null) {
        setPartEditSelectedLayoutId(null);
        setPartEditLayoutHydrationSuppressed(true);
        if (selectedPartId !== null) {
          addPlainValueLayoutPreviewSuppressedPartId(selectedPartId);
        }
        return;
      }
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
      selectedPartId,
      templateLayouts,
      handleSessionExpiredNavigation,
      removePlainValueLayoutPreviewSuppressedPartId,
      addPlainValueLayoutPreviewSuppressedPartId,
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
      <WorkspaceHeader
        principal={principal}
        isSessionAdmin={isSessionAdmin}
        isSigningOut={isSigningOut}
        theme={theme}
        onGoHome={handleGoHome}
        onToggleTheme={handleToggleTheme}
        onSignOut={handleSignOutClick}
      />
      <WorkspaceBackNav
        navRef={projectNavRef}
        project={project}
        isProjectTitlePinnedToNav={isProjectTitlePinnedToNav}
        onBackToProjects={handleBackToProjects}
      />
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
          <WorkspaceMetaSection
            titleHeadingRef={projectTitleHeadingRef}
            projectInformationRef={projectInformationRef}
            project={project}
            workspaceMetaError={workspaceMetaError}
            templateDisplayName={templateDisplayName}
            ownerUsername={ownerUsername}
            defaultLayoutId={defaultLayoutId}
          />
        ) : null}
      </main>
      {!isLoading && loadError === null && project !== null ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex w-full flex-col gap-0 bg-[#fbfbfa] px-3 py-4 dark:bg-[#191919] sm:px-5 sm:py-6"
          style={{ top: `${canvasWorkspaceTopPx}px` }}
          aria-label="Project parts and canvas"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-0 sm:flex-row sm:items-stretch sm:gap-3">
            <PartsAside
              projectPartsAsideRef={projectPartsAsideRef}
              partsListThumbViewportRef={partsListThumbViewportRef}
              partsListMeasureRef={partsListMeasureRef}
              partsScrollSpacerRef={partsScrollSpacerRef}
              partsListScrollerRef={partsListScrollerRef}
              partTypeMenuTriggerRef={partTypeMenuTriggerRef}
              sortedParts={sortedParts}
              selectedPartIndex={selectedPartIndex}
              onSelectPartIndex={setSelectedPartIndex}
              templateLayouts={templateLayouts}
              plainValueLayoutPreviewSuppressedPartIds={plainValueLayoutPreviewSuppressedPartIds}
              isPatchingParts={isPatchingParts}
              isAddPartMenuOpen={isAddPartMenuOpen}
              onOpenAddPartMenu={openAddPartMenu}
              addPartMenuAnchor={addPartMenuAnchor}
              partTypeMenuOpenIndex={partTypeMenuOpenIndex}
              onPartTypeMenuButtonClick={handlePartTypeMenuButtonClick}
              onDeletePartAtIndex={handleDeletePartAtIndex}
              onAddPartOfKind={handleAddPartOfKind}
              onReorderSortedParts={handleReorderSortedParts}
              onPartsListRailScroll={handlePartsListRailScroll}
            />
            <WorkspaceCanvasEditorColumn
              canvasPreviewSizerRef={canvasPreviewSizerRef}
              canvasPreviewFrameRef={canvasPreviewFrameRef}
              partEditPanelRef={partEditPanelRef}
              sortedPartsLength={sortedParts.length}
              selectedPart={selectedPart}
              selectedPartIndex={selectedPartIndex}
              selectedPartLabel={selectedPartLabel}
              canvasPlaceholderHoverLabel={canvasPlaceholderHoverLabel}
              canvasHeaderCenterDefaultText={canvasHeaderCenterDefaultText}
              onEditFromCanvas={handleEditSelectedPartFromCanvas}
              onCanvasPlaceholderHoverLabelChange={setCanvasPlaceholderHoverLabel}
              selectedPartLayoutEntry={selectedPartLayoutEntry}
              selectedPartIsLyrics={selectedPartIsLyrics}
              selectedPartIsValue={selectedPartIsValue}
              plainValueLayoutPreviewSuppressed={plainValueLayoutPreviewSuppressed}
              canvasValueHighlightShapeKey={canvasValueHighlightShapeKey}
              isPatchingParts={isPatchingParts}
              isPartEditPanelOpen={isPartEditPanelOpen}
              onClosePartEditPanel={handleClosePartEditPanel}
              partEditHeading={partEditHeading}
              templateLayoutChoices={templateLayoutChoices}
              partEditLyricsLyricsLayoutId={partEditLyricsLyricsLayoutId}
              partEditLyricsTitleLayoutId={partEditLyricsTitleLayoutId}
              onChangeLyricsLayoutId={setPartEditLyricsLyricsLayoutId}
              onChangeTitleLayoutId={setPartEditLyricsTitleLayoutId}
              partEditLyricsSongs={partEditLyricsSongs}
              onPartEditLyricsSongsChange={setPartEditLyricsSongs}
              lyricsConfigureProjectId={projectId ?? ""}
              lyricsConfigurePartSortedIndex={selectedPartIndex}
              partEditEmptyStateMessage={partEditEmptyStateMessage}
              isPartLyricsSaveDisabled={isPartLyricsSaveDisabled}
              onSaveLyricsPart={handleSaveLyricsPart}
              partEditLayoutFieldLabel={partEditLayoutFieldLabel}
              partEditSelectedLayoutId={partEditSelectedLayoutId}
              onSelectPartEditLayoutId={handleSelectPartEditLayoutId}
              isPartPrimaryLayoutSaveDisabled={isPartPrimaryLayoutSaveDisabled}
              onSavePartPrimaryLayout={handleSavePartPrimaryLayout}
              showClearLayoutSelectionControl={isPartEditPanelOpen && selectedPartIsPlainOrValue}
              onClearPartLayoutSelection={handleClearPartLayoutSelection}
              valuePlaceholderRowsForPartEdit={valuePlaceholderRowsForPartEdit}
              onChangeValuePlaceholderText={handlePartEditValuePlaceholderChange}
              onFocusValuePlaceholderField={handleFocusValuePlaceholderField}
              onBlurValuePlaceholderField={handleBlurValuePlaceholderField}
              partEditPrimarySaveButtonLabel={partEditPrimarySaveButtonLabel}
              partTypeMenuOpenIndex={partTypeMenuOpenIndex}
              partTypeMenuAnchor={partTypeMenuAnchor}
              onApplyPartKindChange={handleApplyPartKindChange}
            />
          </div>
        </div>
      ) : null}
      <PartNotifications
        partActionError={partActionError}
        partPlainValueNotice={partPlainValueNotice}
        lyricsDuplicatePartNameWarning={lyricsDuplicatePartNameWarning}
        onDismissError={() => {
          setPartActionError(null);
        }}
        onDismissNotice={() => {
          setPartPlainValueNotice(null);
        }}
        onDismissLyricsDuplicatePartNameWarning={() => {
          setLyricsDuplicatePartNameWarning(null);
        }}
      />
      <PartKindChangeDialog
        dialogRef={partKindChangeConfirmDialogRef}
        pendingPartKindChangeConfirm={pendingPartKindChangeConfirm}
        isPatchingParts={isPatchingParts}
        onClose={handlePartKindConfirmDialogClose}
        onCancel={handleCancelPendingPartKindChange}
        onConfirm={handleConfirmPendingPartKindChange}
      />
    </div>
  );
};
