import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { listSongsByTitle } from "../api/song";
import type { SongListItem } from "../types/song";

const TITLE_DEBOUNCE_MS: number = 280;

const DROPDOWN_MAX_HEIGHT_PX: number = 240;

const DROPDOWN_VIEWPORT_GUTTER_PX: number = 8;

const DROPDOWN_Z_INDEX: number = 500;

const SUGGESTIONS_EMPTY_LABEL: string = "No matching songs";

const SUGGESTIONS_LOADING_LABEL: string = "Searching…";

export type LyricsSongTitleFieldProps = {
  title: string;
  onTitleChange: (nextTitle: string) => void;
  onPickSuggestion: (pickedTitle: string, pickedArtist: string) => void;
  inputId: string;
  labelId: string;
};

type DropdownRect = {
  topPx: number;
  leftPx: number;
  widthPx: number;
};

export const LyricsSongTitleField = ({
  title,
  onTitleChange,
  onPickSuggestion,
  inputId,
  labelId,
}: LyricsSongTitleFieldProps): ReactElement => {
  const [debouncedTitle, setDebouncedTitle] = useState<string>(title);
  const [suggestions, setSuggestions] = useState<SongListItem[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const TEXT_INPUT_CLASS: string =
    "mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

  useEffect(() => {
    const timeoutId: number = window.setTimeout((): void => {
      setDebouncedTitle(title);
    }, TITLE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [title]);

  useEffect(() => {
    const trimmed: string = debouncedTitle.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }
    const controller: AbortController = new AbortController();
    let cancelled: boolean = false;
    setSuggestions([]);
    setIsLoadingSuggestions(true);
    void (async (): Promise<void> => {
      try {
        const items: SongListItem[] = await listSongsByTitle(trimmed, controller.signal);
        if (!cancelled) {
          setSuggestions(items);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSuggestions(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedTitle]);

  const updateDropdownRect = useCallback((): void => {
    const inputEl: HTMLInputElement | null = inputRef.current;
    if (inputEl === null) {
      setDropdownRect(null);
      return;
    }
    const rect: DOMRect = inputEl.getBoundingClientRect();
    const gutter: number = DROPDOWN_VIEWPORT_GUTTER_PX;
    const maxWidth: number = window.innerWidth - gutter * 2;
    const widthPx: number = Math.min(rect.width, maxWidth);
    let leftPx: number = rect.left;
    const maxLeft: number = window.innerWidth - gutter - widthPx;
    if (leftPx > maxLeft) {
      leftPx = maxLeft;
    }
    if (leftPx < gutter) {
      leftPx = gutter;
    }
    setDropdownRect({
      topPx: rect.bottom + gutter,
      leftPx,
      widthPx,
    });
  }, []);

  const showDropdown: boolean = isInputFocused && debouncedTitle.trim().length > 0;

  useLayoutEffect(() => {
    if (!showDropdown) {
      setDropdownRect(null);
      return;
    }
    updateDropdownRect();
    const handleReposition = (): void => {
      updateDropdownRect();
    };
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [showDropdown, updateDropdownRect, suggestions, isLoadingSuggestions, debouncedTitle]);

  const handlePick = useCallback(
    (item: SongListItem): void => {
      const pickedArtist: string = item.artist ?? "";
      onPickSuggestion(item.title, pickedArtist);
      setIsInputFocused(false);
      setDropdownRect(null);
    },
    [onPickSuggestion]
  );

  const dropdownPortal: ReactElement | null =
    showDropdown && dropdownRect !== null
      ? createPortal(
          <div
            data-lyrics-song-suggestions="true"
            role="listbox"
            aria-label="Matching songs"
            className="fixed overflow-x-hidden overflow-y-auto rounded-xl border border-black/[0.1] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.22)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
            style={{
              top: dropdownRect.topPx,
              left: dropdownRect.leftPx,
              width: dropdownRect.widthPx,
              maxHeight: DROPDOWN_MAX_HEIGHT_PX,
              zIndex: DROPDOWN_Z_INDEX,
            }}
          >
            {isLoadingSuggestions ? (
              <p className="break-words px-3 py-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                {SUGGESTIONS_LOADING_LABEL}
              </p>
            ) : suggestions.length === 0 ? (
              <p className="break-words px-3 py-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                {SUGGESTIONS_EMPTY_LABEL}
              </p>
            ) : (
              <ul className="flex flex-col">
                {suggestions.map((item: SongListItem) => (
                  <li key={item.id} className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.08]">
                    <button
                      type="button"
                      role="option"
                      className="w-full cursor-pointer px-3 py-2 text-left outline-none transition hover:bg-neutral-50 focus-visible:bg-neutral-50 dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.06]"
                      onMouseDown={(event: MouseEvent<HTMLButtonElement>): void => {
                        event.preventDefault();
                        handlePick(item);
                      }}
                    >
                      <div className="min-w-0 whitespace-normal break-words text-[12px] font-medium leading-snug text-neutral-900 dark:text-neutral-100">
                        {item.title}
                      </div>
                      {item.artist !== null && item.artist.length > 0 ? (
                        <div className="mt-0.5 min-w-0 whitespace-normal break-words text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                          {item.artist}
                        </div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <label htmlFor={inputId} id={labelId} className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
        Title
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className={TEXT_INPUT_CLASS}
        value={title}
        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
          onTitleChange(event.target.value);
        }}
        onFocus={(): void => {
          setIsInputFocused(true);
        }}
        onBlur={(): void => {
          window.setTimeout((): void => {
            setIsInputFocused(false);
          }, 120);
        }}
        autoComplete="off"
        placeholder="Song title"
      />
      {dropdownPortal}
    </div>
  );
};
