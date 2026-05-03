import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from 'lucide-react'

import { useGetLyrics, usePatchLyrics } from '@/api/query/song.query'
import { Button } from '@/components/ui/button/Button'
import { Spinner } from '@/components/ui/spinner/Spinner'
import type { Song } from '@/domain/models/song'
import type { LyricsPart } from '@/domain/valueobjects/song'

import '@/i18n/i18n'

interface EditableLyricsPart extends LyricsPart {
  readonly clientId: string
}

interface LyricPartEditorProps {
  readonly part: EditableLyricsPart
  readonly index: number
  readonly onPartNameChange: (index: number, value: string) => void
  readonly onLyricsChange: (index: number, value: string) => void
  readonly onRemove: (index: number) => void
}

const LyricPartEditor = ({
  part,
  index,
  onPartNameChange,
  onLyricsChange,
  onRemove,
}: LyricPartEditorProps): React.ReactElement => {
  const partId: string = `lyrics-part-${part.clientId}`

  return (
    <div className="border-border flex w-full flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-row items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Part name</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive h-7 shrink-0 px-2 text-xs"
          onClick={(): void => {
            onRemove(index)
          }}
        >
          Remove
        </Button>
      </div>
      <input
        id={`${partId}-name`}
        type="text"
        value={part.part}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
          onPartNameChange(index, e.target.value)
        }}
        className="border-input bg-background focus:border-ring h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none"
      />
      <label
        htmlFor={`${partId}-text`}
        className="text-muted-foreground mt-2 text-xs font-medium uppercase tracking-wide"
      >
        Lyrics
      </label>
      <textarea
        id={`${partId}-text`}
        value={part.lyrics}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => {
          onLyricsChange(index, e.target.value)
        }}
        rows={8}
        className="border-input bg-background focus:border-ring min-h-[120px] w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
      />
    </div>
  )
}

const toEditableParts = (initialParts: readonly LyricsPart[]): EditableLyricsPart[] =>
  initialParts.map(
    (p: LyricsPart): EditableLyricsPart => ({
      part: p.part,
      lyrics: p.lyrics,
      clientId: crypto.randomUUID(),
    })
  )

interface SongEditContentProps {
  readonly song: Song
  readonly songId: string
  readonly initialParts: readonly LyricsPart[]
}

const SongEditContent = ({ song, songId, initialParts }: SongEditContentProps): React.ReactElement => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const patchLyrics = usePatchLyrics()

  const [parts, setParts] = React.useState<EditableLyricsPart[]>(() => toEditableParts(initialParts))

  const updatePartName = (index: number, value: string): void => {
    setParts((prev: EditableLyricsPart[]) =>
      prev.map((p: EditableLyricsPart, i: number) => (i === index ? { ...p, part: value } : p))
    )
  }

  const updateLyricsBody = (index: number, value: string): void => {
    setParts((prev: EditableLyricsPart[]) =>
      prev.map((p: EditableLyricsPart, i: number) => (i === index ? { ...p, lyrics: value } : p))
    )
  }

  const removePart = (index: number): void => {
    setParts((prev: EditableLyricsPart[]) => prev.filter((_: EditableLyricsPart, i: number) => i !== index))
  }

  const addPart = (): void => {
    setParts((prev: EditableLyricsPart[]) => [
      ...prev,
      { part: '', lyrics: '', clientId: crypto.randomUUID() },
    ])
  }

  const handleSave = (): void => {
    if (songId.length === 0) return
    const payload: LyricsPart[] = parts.map(({ part, lyrics }: EditableLyricsPart) => ({ part, lyrics }))
    patchLyrics.mutate({ songId, requestBody: { lyrics: payload } })
  }

  return (
    <>
      <div className="mb-6 flex w-full justify-start">
        <button
          type="button"
          onClick={(): void => navigate('/songs')}
          className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm font-medium outline-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ArrowLeftIcon aria-hidden className="size-4 shrink-0" />
          Song list
        </button>
      </div>

      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{song.title}</h1>
        <p className="text-muted-foreground mt-2 text-lg">{song.artist ?? t('song.no_artist')}</p>
      </div>

      <div className="mb-8 flex w-full justify-end">
        <Button
          type="button"
          variant="default"
          size="sm"
          loading={patchLyrics.isPending}
          loadingLabel={t('common.global.save')}
          disabled={patchLyrics.isPending}
          onClick={handleSave}
          className="h-7 min-w-0 px-2.5 text-[11px] font-semibold"
        >
          {t('common.global.save')}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {parts.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm">
            No parts yet. Use &quot;Add part&quot; below to create one.
          </p>
        ) : (
          parts.map((part: EditableLyricsPart, index: number) => (
            <LyricPartEditor
              key={part.clientId}
              part={part}
              index={index}
              onPartNameChange={updatePartName}
              onLyricsChange={updateLyricsBody}
              onRemove={removePart}
            />
          ))
        )}
      </div>

      <div className="mt-6 flex w-full justify-start">
        <Button type="button" variant="outline" size="sm" onClick={addPart}>
          Add part
        </Button>
      </div>
    </>
  )
}

export function SongEditPage(): React.ReactElement | null {
  const { songId = '' } = useParams<{ songId: string }>()

  const lyricsQuery = useGetLyrics(songId)

  if (songId.length === 0) {
    return <div className="text-muted-foreground text-center text-sm">Missing song id.</div>
  }

  if (lyricsQuery.isPending) {
    return (
      <div className="flex w-full justify-center py-16">
        <Spinner className="text-foreground" width={32} height={32} />
      </div>
    )
  }

  if (lyricsQuery.isError) {
    return (
      <div className="text-destructive text-center text-sm">Could not load song lyrics. Try again later.</div>
    )
  }

  if (lyricsQuery.data === undefined) {
    return null
  }

  const song: Song = lyricsQuery.data.song
  const lyricsParts: readonly LyricsPart[] = lyricsQuery.data.lyrics.lyrics

  return (
    <div className="flex w-full max-w-2xl flex-col items-stretch self-center px-4 pb-16">
      <SongEditContent
        key={`${songId}-${String(lyricsQuery.dataUpdatedAt)}`}
        song={song}
        songId={songId}
        initialParts={lyricsParts}
      />
    </div>
  )
}
