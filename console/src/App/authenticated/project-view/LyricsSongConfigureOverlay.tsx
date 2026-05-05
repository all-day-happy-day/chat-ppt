import * as React from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button/Button'
import type { LyricsPart } from '@/domain/valueobjects/song'

import { LyricsSongSplitPartsEditor } from './LyricsSongSplitPartsEditor'

import type { TFunction } from 'i18next'

export interface LyricsSongConfigureSnapshot {
  readonly songIndex: number
  readonly title: string
  readonly artist: string | null
  readonly lines: readonly LyricsPart[]
  readonly sequence: readonly number[]
  readonly configured: boolean
  /** Bumps when the overlay opens so inner state re-initializes without an effect. */
  readonly revision: number
}

export interface LyricsSongConfigureOverlayProps {
  readonly snapshot: LyricsSongConfigureSnapshot | null
  readonly t: TFunction
  readonly onClose: () => void
  readonly onApply: (
    songIndex: number,
    payload: { readonly lines: LyricsPart[]; readonly sequence: number[]; readonly configured: boolean }
  ) => void
}

function labelsFromT(t: TFunction): {
  partsTitle: string
  partsHint: string
  partNameLabel: string
  partLyricsLabel: string
  removePartLabel: string
  addPartLabel: string
  poolTitle: string
  poolHint: string
  formTitle: string
  formHint: string
  formEmptyHint: string
  configuredLabel: string
  closeLabel: string
  doneLabel: string
  overlayTitle: string
  blankTileLabel: string
} {
  return {
    partsTitle: t('page.project_view.lyrics_configure_parts_title'),
    partsHint: t('page.project_view.lyrics_configure_parts_hint'),
    partNameLabel: t('page.project_view.lyrics_configure_part_name'),
    partLyricsLabel: t('page.project_view.lyrics_configure_part_lyrics'),
    removePartLabel: t('page.project_view.lyrics_configure_remove_part'),
    addPartLabel: t('page.project_view.lyrics_configure_add_part'),
    poolTitle: t('page.project_view.lyrics_configure_pool_title'),
    poolHint: t('page.project_view.lyrics_configure_pool_hint'),
    formTitle: t('page.project_view.lyrics_configure_form_title'),
    formHint: t('page.project_view.lyrics_configure_form_hint'),
    formEmptyHint: t('page.project_view.lyrics_configure_form_empty'),
    configuredLabel: t('page.project_view.lyrics_configure_configured'),
    closeLabel: t('page.project_view.lyrics_configure_close'),
    doneLabel: t('page.project_view.lyrics_configure_done'),
    overlayTitle: t('page.project_view.lyrics_configure_overlay_title'),
    blankTileLabel: t('page.project_view.lyrics_configure_blank_tile'),
  }
}

function configureSubtitle(t: TFunction, snapshot: LyricsSongConfigureSnapshot): string {
  const titleTrim: string = snapshot.title.trim()
  const artistTrim: string = snapshot.artist !== null ? snapshot.artist.trim() : ''
  const titleLabel: string = titleTrim.length > 0 ? titleTrim : t('page.project_view.lyrics_configure_untitled')
  const artistLabel: string = artistTrim.length > 0 ? artistTrim : t('page.project_view.lyrics_configure_no_artist')
  return t('page.project_view.lyrics_configure_subtitle', {
    index: String(snapshot.songIndex + 1),
    title: titleLabel,
    artist: artistLabel,
  })
}

function lyricsConfigureDomIds(songIndex: number): { readonly headingId: string; readonly descId: string } {
  return {
    headingId: `lyrics-configure-${String(songIndex)}-title`,
    descId: `lyrics-configure-${String(songIndex)}-desc`,
  }
}

interface LyricsSongConfigureDialogBodyProps {
  readonly snapshot: LyricsSongConfigureSnapshot
  readonly lb: ReturnType<typeof labelsFromT>
  readonly t: TFunction
  readonly onApply: (
    songIndex: number,
    payload: { readonly lines: LyricsPart[]; readonly sequence: number[]; readonly configured: boolean }
  ) => void
  readonly onClose: () => void
}

function LyricsSongConfigureDialogBody({
  snapshot,
  lb,
  t,
  onApply,
  onClose,
}: LyricsSongConfigureDialogBodyProps): React.ReactElement {
  const { headingId, descId }: { readonly headingId: string; readonly descId: string } =
    lyricsConfigureDomIds(snapshot.songIndex)

  const [lines, setLines] = React.useState<LyricsPart[]>(
    (): LyricsPart[] => snapshot.lines.map((l: LyricsPart): LyricsPart => ({ ...l }))
  )
  const [sequence, setSequence] = React.useState<number[]>(
    (): number[] => [...snapshot.sequence]
  )
  const [configured, setConfigured] = React.useState<boolean>(() => snapshot.configured)

  React.useEffect((): void | (() => void) => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return (): void => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handleDone = (): void => {
    onApply(snapshot.songIndex, {
      lines: lines.map((l: LyricsPart): LyricsPart => ({ ...l })),
      sequence: [...sequence],
      configured,
    })
    onClose()
  }

  return (
    <>
      <header className="border-border flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 id={headingId} className="text-foreground truncate text-base font-semibold md:text-lg">
            {lb.overlayTitle}
          </h2>
          <p id={descId} className="text-muted-foreground mt-0.5 text-xs md:text-sm">
            {configureSubtitle(t, snapshot)}
          </p>
        </div>
        <button
          type="button"
          aria-label={lb.closeLabel}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded-md p-1.5 outline-none focus-visible:ring-2"
          onClick={onClose}
        >
          <XIcon aria-hidden className="size-5" />
        </button>
      </header>
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
        <label className="border-border bg-muted/10 mb-5 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2">
          <input
            type="checkbox"
            className="border-input size-4 rounded"
            checked={configured}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
              setConfigured(ev.target.checked)
            }}
          />
          <span className="text-foreground text-sm">{lb.configuredLabel}</span>
        </label>
        <LyricsSongSplitPartsEditor
          lines={lines}
          onLinesChange={setLines}
          partSequence={sequence}
          onPartSequenceChange={setSequence}
          fieldIdPrefix={`lyrics-cfg-${String(snapshot.songIndex)}-${String(snapshot.revision)}`}
          labels={{
            partsTitle: lb.partsTitle,
            partsHint: lb.partsHint,
            partNameLabel: lb.partNameLabel,
            partLyricsLabel: lb.partLyricsLabel,
            removePartLabel: lb.removePartLabel,
            addPartLabel: lb.addPartLabel,
            poolTitle: lb.poolTitle,
            poolHint: lb.poolHint,
            formTitle: lb.formTitle,
            formHint: lb.formHint,
            formEmptyHint: lb.formEmptyHint,
            blankTileLabel: lb.blankTileLabel,
          }}
        />
      </div>
      <footer className="border-border flex shrink-0 justify-end gap-2 border-t px-4 py-3 md:px-5">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {lb.closeLabel}
        </Button>
        <Button type="button" variant="default" size="sm" onClick={handleDone}>
          {lb.doneLabel}
        </Button>
      </footer>
    </>
  )
}

export function LyricsSongConfigureOverlay({
  snapshot,
  t,
  onClose,
  onApply,
}: LyricsSongConfigureOverlayProps): React.ReactElement | null {
  const lb: ReturnType<typeof labelsFromT> = React.useMemo((): ReturnType<typeof labelsFromT> => labelsFromT(t), [t])

  if (snapshot === null) {
    return null
  }

  const { headingId, descId }: { readonly headingId: string; readonly descId: string } =
    lyricsConfigureDomIds(snapshot.songIndex)

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-start justify-center pt-6 pb-4 md:pt-10"
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descId}
        className="border-border bg-background text-foreground relative z-10 flex max-h-[min(85vh,900px)] w-[min(96rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border shadow-xl"
        onClick={(e: React.MouseEvent<HTMLDivElement>): void => {
          e.stopPropagation()
        }}
      >
        <LyricsSongConfigureDialogBody
          key={snapshot.revision}
          snapshot={snapshot}
          lb={lb}
          t={t}
          onApply={onApply}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  )
}
