import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/i18n'

import { ContentTable } from './home-card/content-table/ContentTable'
import { SongsContentTableProps } from './home-card/content-table/songs/SongsTableContent'
import { HomeCard } from './home-card/HomeCard'

export function Home() {
  const { t } = useTranslation()

  return (
    <Suspense>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="flex h-full w-full flex-col items-center justify-center gap-16">
          <div className="scrollbar-hide flex h-fit w-full max-w-[1200px] flex-row flex-wrap items-center justify-center gap-16 overflow-y-scroll p-16">
            <HomeCard title={t('home.profile')}></HomeCard>
            <HomeCard title={t('home.projects')}>
              <ContentTable
                contents={[<div>Project 1</div>, <div>Project 2</div>, <div>Project 3</div>]}
                // icons={[<div>Icon1</div>, <div>Icon2</div>, <div>Icon3</div>]}
              />
            </HomeCard>
            <HomeCard title={t('home.templates')}></HomeCard>
            <HomeCard title={t('home.songs')}>
              <ContentTable {...SongsContentTableProps()} />
            </HomeCard>
          </div>
        </div>
      </div>
    </Suspense>
  )
}
