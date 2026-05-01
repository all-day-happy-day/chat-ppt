import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import '@/i18n/i18n'

import { ContentTable } from './home-card/content-table/ContentTable'
import { ProjectContentTableProps } from './home-card/content-table/project/ProjectTableContent'
import { SongContentTableProps } from './home-card/content-table/song/SongTableContent'
import { TemplateContentTableProps } from './home-card/content-table/template/TemplateTableContent'
import { HomeCard } from './home-card/HomeCard'
import { ProfileCard } from './home-card/profile/ProfileCard'

export function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Suspense>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="flex h-full w-full flex-col items-center justify-center gap-16">
          <div className="scrollbar-hide flex h-fit w-full max-w-[1200px] flex-row flex-wrap items-center justify-center gap-16 overflow-y-scroll p-16">
            <HomeCard title={t('home.profile')} header={false} onClick={() => navigate('/settings')}>
              <ProfileCard />
            </HomeCard>
            <HomeCard title={t('home.projects')}>
              <ContentTable {...ProjectContentTableProps()} />
            </HomeCard>
            <HomeCard title={t('home.templates')}>
              <ContentTable {...TemplateContentTableProps()} />
            </HomeCard>
            <HomeCard title={t('home.songs')}>
              <ContentTable {...SongContentTableProps()} />
            </HomeCard>
          </div>
        </div>
      </div>
    </Suspense>
  )
}
