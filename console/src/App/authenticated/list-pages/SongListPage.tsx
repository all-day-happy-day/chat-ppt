import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useListAllSongs } from '@/api/query/song.query'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import type { ReactElement } from 'react'

export function SongListPage(): ReactElement | null {
  const { t } = useTranslation()
  const songs = getQueryData(useListAllSongs())

  if (!songs) return null

  return (
    <div className="scrollbar-hide flex h-full min-h-0 w-full min-w-0 max-w-3xl flex-col overflow-y-auto px-8 pt-8 pb-16">
      <h1 className="text-4xl font-bold">{t('home.songs')}</h1>
      <ul className="mt-8 flex flex-col gap-4">
        {songs.map(
          (song): ReactElement => (
            <li
              key={song.id}
              className="border-border flex flex-row items-center justify-between gap-4 border-b pb-4"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{song.title}</div>
                <div className="text-muted-foreground truncate text-sm">
                  {song.artist ?? t('song.no_artist')}
                </div>
              </div>
              <Link
                to={`/songs/${song.id}/edit`}
                className="text-foreground shrink-0 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-border"
              >
                Edit
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
