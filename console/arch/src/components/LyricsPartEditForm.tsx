import { type ChangeEvent,forwardRef, useCallback } from "react";
import { Link } from "react-router-dom";

import type { LyricsSongRow } from "../lib/lyrics-part-contents";
import { createDefaultLyricsSongRow } from "../lib/lyrics-part-contents";
import { LYRICS_PART_SONGS_SNAPSHOT_STATE_KEY } from "../lib/lyrics-song-configure-location-state";
import type { TemplateLayoutChoice } from "../lib/project-parts-for-patch";

import { LyricsSongTitleField } from "./LyricsSongTitleField";
import {
  LYRICS_EDIT_LYRICS_LAYOUT_PALETTE_MENU_ID,
  LYRICS_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID,
  TemplateLayoutGalleryPicker,
} from "./TemplateLayoutGalleryPicker";

const LYRICS_LAYOUT_FIELD_LABEL: string = "Lyrics slide layout";

const TITLE_LAYOUT_FIELD_LABEL: string = "Title slide layout (optional)";

const SONGS_SECTION_LABEL: string = "Songs";

const SONG_ARTIST_LABEL: string = "Artist (optional)";

const ADD_SONG_BUTTON_LABEL: string = "+ Add song";

const REMOVE_SONG_BUTTON_LABEL: string = "Remove";

const LYRICS_SAVE_BUTTON_LABEL: string = "Save";

const LYRICS_SAVE_BUTTON_SAVING_LABEL: string = "Saving…";

const CONFIGURE_BUTTON_LABEL: string = "Configure";

const CONFIGURE_DISABLED_HINT: string = "Add a song title before configuring lyric parts.";

const CONFIGURED_STATUS_LABEL: string = "configured";

const NOT_CONFIGURED_STATUS_LABEL: string = "not configured";

export type LyricsPartEditFormProps = {
  isOpen: boolean;
  onClose: () => void;
  partHeading: string;
  layoutChoices: TemplateLayoutChoice[];
  lyricsLayoutId: string | null;
  titleLayoutId: string | null;
  onChangeLyricsLayoutId: (layoutId: string) => void;
  onChangeTitleLayoutId: (layoutId: string | null) => void;
  songs: LyricsSongRow[];
  onSongsChange: (songs: LyricsSongRow[]) => void;
  emptyStateMessage: string | null;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onSave: () => void;
  lyricsConfigureProjectId: string;
  lyricsConfigurePartSortedIndex: number;
};

const TEXT_INPUT_CLASS: string =
  "mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

export const LyricsPartEditForm = forwardRef<HTMLElement, LyricsPartEditFormProps>(function LyricsPartEditForm(
  {
    isOpen,
    onClose,
    partHeading,
    layoutChoices,
    lyricsLayoutId,
    titleLayoutId,
    onChangeLyricsLayoutId,
    onChangeTitleLayoutId,
    songs,
    onSongsChange,
    emptyStateMessage,
    isSaveDisabled,
    isSaving,
    onSave,
    lyricsConfigureProjectId,
    lyricsConfigurePartSortedIndex,
  },
  ref
) {
  const handleSongTitleChange = useCallback(
    (index: number, value: string): void => {
      const next: LyricsSongRow[] = songs.map(
        (row: LyricsSongRow, i: number): LyricsSongRow =>
          i === index ? { ...row, title: value, lyricsPartsConfigured: false } : row
      );
      onSongsChange(next);
    },
    [songs, onSongsChange]
  );

  const handleSongArtistChange = useCallback(
    (index: number, value: string): void => {
      const next: LyricsSongRow[] = songs.map(
        (row: LyricsSongRow, i: number): LyricsSongRow =>
          i === index ? { ...row, artist: value, lyricsPartsConfigured: false } : row
      );
      onSongsChange(next);
    },
    [songs, onSongsChange]
  );

  const handleSongPickFromLibrary = useCallback(
    (index: number, pickedTitle: string, pickedArtist: string): void => {
      const next: LyricsSongRow[] = songs.map(
        (row: LyricsSongRow, i: number): LyricsSongRow =>
          i === index
            ? {
                ...row,
                title: pickedTitle,
                artist: pickedArtist,
                matchedBackendSongId: null,
                lyricsPartsConfigured: false,
              }
            : row
      );
      onSongsChange(next);
    },
    [songs, onSongsChange]
  );

  const handleAddSong = useCallback((): void => {
    onSongsChange([...songs, createDefaultLyricsSongRow()]);
  }, [songs, onSongsChange]);

  const handleRemoveSong = useCallback(
    (index: number): void => {
      if (songs.length <= 1) {
        return;
      }
      const next: LyricsSongRow[] = songs.filter((_: LyricsSongRow, i: number): boolean => i !== index);
      onSongsChange(next);
    },
    [songs, onSongsChange]
  );

  const handleLyricsLayoutFromGallery = useCallback(
    (layoutId: string | null): void => {
      if (layoutId !== null) {
        onChangeLyricsLayoutId(layoutId);
      }
    },
    [onChangeLyricsLayoutId]
  );

  const handleTitleLayoutFromGallery = useCallback(
    (layoutId: string | null): void => {
      onChangeTitleLayoutId(layoutId);
    },
    [onChangeTitleLayoutId]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      ref={ref}
      className="flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden border-t border-neutral-200/90 bg-white dark:border-white/[0.08] dark:bg-[#1c1c1e] sm:h-full sm:max-h-none sm:w-[min(100%,18rem)] sm:rounded-2xl sm:border-l sm:border-t-0 sm:border-black/[0.06] sm:dark:border-white/[0.08]"
      aria-label="Edit lyrics part"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Edit part</h2>
          <p className="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{partHeading}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-black/[0.1] bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-200 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
          onClick={onClose}
          aria-label="Close part editor"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {emptyStateMessage !== null ? (
          <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-400" role="status">
            {emptyStateMessage}
          </p>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <TemplateLayoutGalleryPicker
              layoutFieldLabel={LYRICS_LAYOUT_FIELD_LABEL}
              menuId={LYRICS_EDIT_LYRICS_LAYOUT_PALETTE_MENU_ID}
              layoutChoices={layoutChoices}
              selectedLayoutId={lyricsLayoutId}
              onSelectLayout={handleLyricsLayoutFromGallery}
              showNoneChoiceInGallery={false}
            />
            <TemplateLayoutGalleryPicker
              layoutFieldLabel={TITLE_LAYOUT_FIELD_LABEL}
              menuId={LYRICS_EDIT_TITLE_LAYOUT_PALETTE_MENU_ID}
              layoutChoices={layoutChoices}
              selectedLayoutId={titleLayoutId}
              onSelectLayout={handleTitleLayoutFromGallery}
              showNoneChoiceInGallery
              noneChoiceTileLabel="No title layout"
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {SONGS_SECTION_LABEL}
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                {songs.map((song: LyricsSongRow, index: number) => {
                  const canOpenConfigure: boolean = song.title.trim().length > 0 && lyricsConfigureProjectId.length > 0;
                  const configureTo: string = `/projects/${lyricsConfigureProjectId}/part/${String(
                    lyricsConfigurePartSortedIndex
                  )}/song/${String(index)}/lyrics`;
                  const statusBadgeClass: string = song.lyricsPartsConfigured
                    ? "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100"
                    : "bg-amber-500/12 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100";
                  const configureControlClass: string =
                    "inline-flex shrink-0 items-center justify-center rounded-md border px-2 py-1 text-[10px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:focus-visible:ring-[#0a84ff]";
                  return (
                    <li
                      key={`lyrics-song-${String(index)}`}
                      className="rounded-xl border border-black/[0.08] bg-neutral-50/80 p-2.5 dark:border-white/[0.1] dark:bg-white/[0.04]"
                    >
                      <div className="mb-2 flex justify-end">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${statusBadgeClass}`}
                        >
                          {song.lyricsPartsConfigured ? CONFIGURED_STATUS_LABEL : NOT_CONFIGURED_STATUS_LABEL}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <LyricsSongTitleField
                          title={song.title}
                          onTitleChange={(nextTitle: string): void => {
                            handleSongTitleChange(index, nextTitle);
                          }}
                          onPickSuggestion={(pickedTitle: string, pickedArtist: string): void => {
                            handleSongPickFromLibrary(index, pickedTitle, pickedArtist);
                          }}
                          inputId={`lyrics-song-title-${String(index)}`}
                          labelId={`lyrics-song-title-label-${String(index)}`}
                        />
                        <div>
                          <label
                            htmlFor={`lyrics-song-artist-${String(index)}`}
                            className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
                          >
                            {SONG_ARTIST_LABEL}
                          </label>
                          <input
                            id={`lyrics-song-artist-${String(index)}`}
                            type="text"
                            className={TEXT_INPUT_CLASS}
                            value={song.artist}
                            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                              handleSongArtistChange(index, event.target.value);
                            }}
                            autoComplete="off"
                            placeholder="Artist"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="rounded-md px-2 py-1 text-[10px] font-medium text-red-700 outline-none transition hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-500/15 dark:focus-visible:ring-red-400/40"
                          onClick={() => {
                            handleRemoveSong(index);
                          }}
                          disabled={songs.length <= 1}
                        >
                          {REMOVE_SONG_BUTTON_LABEL}
                        </button>
                        {canOpenConfigure ? (
                          <Link
                            to={configureTo}
                            state={{
                              lyricsSongConfigure: {
                                songIndex: index,
                                title: song.title,
                                artist: song.artist,
                                matchedBackendSongId: song.matchedBackendSongId,
                              },
                              [LYRICS_PART_SONGS_SNAPSHOT_STATE_KEY]: songs,
                              restoreLyricsPartEditPanel: true,
                              lyricsPartEditPartSortedIndex: lyricsConfigurePartSortedIndex,
                            }}
                            className={`${configureControlClass} border-black/[0.1] bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5`}
                          >
                            {CONFIGURE_BUTTON_LABEL}
                          </Link>
                        ) : (
                          <span
                            className={`${configureControlClass} cursor-not-allowed border-black/[0.06] bg-neutral-100/80 text-neutral-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-500`}
                            title={CONFIGURE_DISABLED_HINT}
                            aria-label={CONFIGURE_DISABLED_HINT}
                          >
                            {CONFIGURE_BUTTON_LABEL}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-dashed border-black/[0.14] py-2 text-[11px] font-medium text-neutral-700 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.18] dark:text-neutral-200 dark:hover:bg-white/[0.06] dark:focus-visible:ring-[#0a84ff]"
                onClick={handleAddSong}
              >
                {ADD_SONG_BUTTON_LABEL}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 border-t border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
        <button
          type="button"
          className="rounded-md border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-800 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-100 dark:hover:bg-white/5 dark:focus-visible:ring-[#0a84ff]"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md border border-[#0071e3]/40 bg-[#0071e3] px-2.5 py-1 text-[11px] font-medium text-white outline-none transition hover:bg-[#0066cf] focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#0a84ff]/50 dark:bg-[#0a84ff] dark:hover:bg-[#0990ff] dark:focus-visible:ring-[#0a84ff]"
          onClick={onSave}
          disabled={isSaveDisabled || isSaving}
        >
          {isSaving ? LYRICS_SAVE_BUTTON_SAVING_LABEL : LYRICS_SAVE_BUTTON_LABEL}
        </button>
      </div>
    </aside>
  );
});
