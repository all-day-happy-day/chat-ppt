import { useTranslation } from 'react-i18next'

import { useListAllSongs } from '@/api/query/song.query'
import type { Song } from '@/domain/models/song'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import type { ContentTableProps } from '../content-table-types'

export function SongItem({ song }: { song: Song | null }) {
  const { t } = useTranslation()

  if (!song) return null

  return (
    <div className="flex h-full w-full flex-col items-start justify-center gap-1">
      <div className="text-semibold text-md">{song.title}</div>
      <div className="text-muted-foreground text-sm">{song.artist ? song.artist : t('song.no_artist')}</div>
    </div>
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
    contents: [<SongItem song={songs[0]} />, <SongItem song={songs[1]} />, null],
    // icons: [<div>Icon1</div>, <div>Icon2</div>, <div>Icon3</div>],
  }
}
