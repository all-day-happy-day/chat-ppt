import { useTranslation } from 'react-i18next'

import { useListAllSongs } from '@/api/query/song.query'
import { BaseListLayout } from '@/App/layouts/base-list-layout/BaseListLayout'
import { getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

export function SongListPage() {
  const { t } = useTranslation()
  const songs = getQueryData(useListAllSongs())

  if (!songs) return null

  const contents: Record<string, unknown>[] = songs.map((song) => {
    return {
      [t('list.title')]: song.title,
      [t('list.artist')]: song.artist,
    }
  })
  return <BaseListLayout title={t('home.songs')} headers={[t('list.title'), t('list.artist')]} contents={contents} />
}
