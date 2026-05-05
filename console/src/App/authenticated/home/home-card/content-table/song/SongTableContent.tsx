import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useListSongsPartial } from '@/api/query/song.query'
import { HOME_CARD_PREVIEW_LIMIT } from '@/domain/list-query'
import type { Song } from '@/domain/models/song'
import { cn } from '@/lib/utils'

import '@/i18n/i18n'

import type { ContentTableProps } from '../content-table-types'

export function SongItem({ song }: { song: Song | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!song) return null

  return (
    <button
      type="button"
      onClick={(): void => {
        navigate(`/songs/${song.id}/edit`)
      }}
      className={cn(
        'flex h-full w-full flex-col items-start justify-center gap-1 rounded-lg text-left outline-none',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2'
      )}
    >
      <div className="text-semibold text-md">{song.title}</div>
      <div className="text-muted-foreground text-sm">{song.artist ? song.artist : t('song.no_artist')}</div>
    </button>
  )
}

function padPreviewSlots<T>(items: readonly T[], slotCount: number): (T | null)[] {
  const padded: (T | null)[] = [...items]
  while (padded.length < slotCount) {
    padded.push(null)
  }
  return padded.slice(0, slotCount)
}

export function SongContentTableProps(): ContentTableProps {
  const partial = useListSongsPartial(HOME_CARD_PREVIEW_LIMIT)

  if (partial.isLoading || partial.data === undefined) {
    return { contents: [null, null, null] }
  }

  const songs: (Song | null)[] = padPreviewSlots(partial.data, HOME_CARD_PREVIEW_LIMIT)

  return {
    contents: [
      <SongItem key="s0" song={songs[0]} />,
      <SongItem key="s1" song={songs[1]} />,
      <SongItem key="s2" song={songs[2]} />,
    ],
  }
}
