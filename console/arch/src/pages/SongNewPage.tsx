import { type FormEvent, type ReactElement,useCallback, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { scrapeLyricsCreatingSong } from "../api/song";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { writeLibrarySongMetaToSession } from "../lib/library-song-session";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";

const TEXT_INPUT_CLASS: string =
  "mt-1 w-full rounded-lg border border-black/[0.12] bg-white px-3 py-2 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.14] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#0a84ff]";

export const SongNewPage = (): ReactElement => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const titleInputId: string = useId();
  const artistInputId: string = useId();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [title, setTitle] = useState<string>("");
  const [artist, setArtist] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleToggleTheme = useCallback((): void => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setFormError(null);
      const trimmedTitle: string = title.trim();
      if (trimmedTitle.length === 0) {
        setFormError("Enter a song title.");
        return;
      }
      const artistTrimmed: string = artist.trim();
      const artistValue: string | null = artistTrimmed.length > 0 ? artistTrimmed : null;
      setIsSubmitting(true);
      try {
        const created = await scrapeLyricsCreatingSong(trimmedTitle, artistValue);
        writeLibrarySongMetaToSession(created.songId, {
          title: created.title,
          artist: created.artist,
        });
        navigate(`/songs/${created.songId}/edit`, { replace: true });
      } catch (error: unknown) {
        setFormError(error instanceof Error ? error.message : "Could not add the song.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, artist, navigate]
  );

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#fbfbfa] dark:bg-[#191919]">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
          >
            {APP_DISPLAY_NAME}
          </Link>
          <span className="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">New song</span>
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
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <h1 className="text-[24px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Add song</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          We look up lyrics for the title (and optional artist) and save the song to your library.
        </p>
        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor={titleInputId} className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
              Title
            </label>
            <input
              id={titleInputId}
              type="text"
              value={title}
              onChange={(e): void => {
                setTitle(e.target.value);
              }}
              className={TEXT_INPUT_CLASS}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor={artistInputId} className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
              Artist
            </label>
            <input
              id={artistInputId}
              type="text"
              value={artist}
              onChange={(e): void => {
                setArtist(e.target.value);
              }}
              className={TEXT_INPUT_CLASS}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>
          {formError !== null ? (
            <p className="text-[13px] text-red-700 dark:text-red-300" role="alert">
              {formError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-[#0071e3] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff]"
          >
            {isSubmitting ? "Adding…" : "Add song"}
          </button>
        </form>
      </main>
    </div>
  );
};
