import { useTranslation } from 'react-i18next'

import { SaveButton } from '@/components/common/save-button/SaveButton'
import { Card } from '@/components/ui/Card'
import { InputField } from '@/components/ui/InputField'
import type { Role } from '@/domain/models/user'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'

import '@/i18n/i18n'

const ROLE_TEXT_CLASS: Record<Role, string> = {
  ADMIN: 'text-admin',
  USER: 'text-user',
}

export function UserSettings() {
  const user = useCurrentUser().data ?? {
    id: '1',
    username: 'John Doe',
    email: 'john.doe@example.com',
    role: 'ADMIN',
    createdAt: new Date(),
    lastSignIn: new Date(),
  }
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-16 pt-16">
      <div className="flex w-1/3 flex-row justify-start border-b pb-4">
        <p className="text-3xl font-semibold">{t('header.settings.settings')}</p>
      </div>
      <div className="flex w-1/3 items-start justify-between gap-6 px-2 max-md:justify-center md:flex-row">
        <div className="mb-6 flex max-w-full min-w-fit flex-col items-start gap-2 truncate">
          <p className="text-5xl font-semibold">{user.username}</p>
          <p className="text-muted-foreground p-1 text-base">{user.email}</p>
        </div>
        <Card className="flex w-1/5 min-w-fit items-center justify-center rounded-md text-xl font-bold capitalize">
          <p className={cn(ROLE_TEXT_CLASS[user.role])}>{user.role}</p>
        </Card>
      </div>
      <form
        className="flex w-1/3 flex-col items-start gap-24"
        onSubmit={(e: React.SubmitEvent<HTMLFormElement>) => {
          e.preventDefault()
          const form: HTMLFormElement = e.currentTarget
          const data = new FormData(form)
          const username = String(data.get('username') ?? '')
          const email = String(data.get('email') ?? '')
          console.log(username, email)
        }}
      >
        <div className="flex flex-col items-start gap-6">
          <InputField
            id="username"
            name="username"
            label={t('common.user.username')}
            type="text"
            defaultValue={user.username}
            className="max-md:w-full"
          />
          <InputField
            id="email"
            name="email"
            label={t('common.user.email')}
            type="email"
            defaultValue={user.email}
            className="max-md:w-full"
          />
        </div>
        <div className="flex w-full flex-row items-center justify-end gap-2 max-md:justify-center">
          <SaveButton type="submit" />
        </div>
      </form>
    </div>
  )
}
