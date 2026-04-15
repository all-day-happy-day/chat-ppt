import { PART_KIND_FOR_CREATE, type PartKindForCreate } from '../../lib/project-parts-for-patch';

export const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  'Could not reach the server. Check your connection and that the API is running, then refresh this page.';

export const ADD_PART_KIND_MENU_ID: string = 'project-add-part-kind-menu';

export const PART_KIND_CHANGE_MENU_ID: string = 'project-part-kind-change-menu';

export const CANVAS_PREVIEW_EMPTY_FRAME_MIN_HEIGHT_CLASS: string = 'min-h-32';

export const CANVAS_PREVIEW_EMPTY_FRAME_MIN_WIDTH_CLASS: string = 'min-w-48';

export const CANVAS_SECTION_HEADER_ROW_MIN_HEIGHT_CLASS: string = 'min-h-[44px]';

export const ADD_PART_MENU_MAX_WIDTH_PX: number = 272;

export const ADD_PART_MENU_VIEWPORT_GUTTER_PX: number = 8;

export const ADD_PART_MENU_FALLBACK_HEIGHT_PX: number = 200;

export const ADD_PART_MENU_MIN_SCROLL_HEIGHT_PX: number = 120;

export const PROJECT_TITLE_NAV_PIN_TOLERANCE_PX: number = 2;

export const CANVAS_WORKSPACE_MIN_HEIGHT_PX: number = 160;

export const MAIN_SCROLL_DOCK_EPSILON_PX: number = 1;

/** Approximate line height when normalizing `WheelEvent.deltaMode === DOM_DELTA_LINE`. */
export const WHEEL_SCROLL_LINE_HEIGHT_PX: number = 16;

/** Fallback slide size when template layout geometry is missing or not yet loaded. */
export const CANVAS_PREVIEW_FALLBACK_WIDTH_PX: number = 960;

export const CANVAS_PREVIEW_FALLBACK_HEIGHT_PX: number = 540;

export const CANVAS_PREVIEW_LYRICS_PART_LABEL: string = 'Lyrics part';

/** Tailwind `sm:` breakpoint (must match `tailwind` default). */
export const SM_BREAKPOINT_MIN_WIDTH_PX: number = 640;

/** Floating part notice / error toast duration (no on-screen countdown). */
export const PART_TOAST_AUTO_DISMISS_MS: number = 3000;

export const ADD_PART_KIND_OPTION_CLASS: string =
  'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-[13px] outline-none transition hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:hover:bg-white/10 dark:focus-visible:bg-white/10 dark:focus-visible:ring-[#0a84ff]';

export type AddPartKindOption = {
  kind: PartKindForCreate;
  label: string;
};

export const ADD_PART_KIND_OPTIONS: AddPartKindOption[] = [
  { kind: PART_KIND_FOR_CREATE.PLAIN, label: 'Plain' },
  { kind: PART_KIND_FOR_CREATE.VALUE, label: 'Value' },
  { kind: PART_KIND_FOR_CREATE.LYRICS, label: 'Lyrics' },
  { kind: PART_KIND_FOR_CREATE.BIBLE, label: 'Bible' },
];

export const PART_KIND_LOSE_FILLED_DATA_MESSAGE: string =
  'Changing the part type can discard text and values you already entered. Continue?';

export const PART_KIND_PLAIN_VALUE_CROSSOVER_MESSAGE: string =
  'Switching between Plain and Value clears the slide layout selection until you pick a layout again in Edit. Continue?';
