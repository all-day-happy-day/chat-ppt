import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useListAllSongs } from '@/api/query/song.query'
import type { Song } from '@/domain/models/song'
import { cn, getQueryData } from '@/lib/utils'

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

export function SongContentTableProps(): ContentTableProps {
  const listAllSongs = useListAllSongs()

  let songs = getQueryData(listAllSongs)
  if (!songs) return { contents: [null, null, null] }

  if (songs.length >= 3) {
    songs = songs.slice(0, 3)
  } else {
    const emptySongs = Array(3 - songs.length).fill(null)
    songs = songs.concat(emptySongs)
  }

  return {
    contents: [<SongItem song={songs[0]} />, <SongItem song={songs[1]} />, <SongItem song={songs[2]} />],
    // icons: [<div>Icon1</div>, <div>Icon2</div>, <div>Icon3</div>],
  }
}
