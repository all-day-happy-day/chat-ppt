import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useGetCurrentUser } from '@/api/query/auth.query'
import { usePatchPassword, useVerifyPassword } from '@/api/query/auth.query'
import { usePatchUser } from '@/api/query/user.query'
import { ActionButton } from '@/components/common/action-button/ActionButton'
import { Button } from '@/components/ui/button/Button'
import { Card } from '@/components/ui/Card'
import { InputField } from '@/components/ui/InputField'
import type { Role, User } from '@/domain/models/user'
import { cn, getQueryData } from '@/lib/utils'

import '@/i18n/i18n'

import { ChangePassword } from './change-password/ChangePassword'
import type { UserSettingsForm } from './user-settings.types'

const ROLE_TEXT_CLASS: Record<Role, string> = {
  ADMIN: 'text-admin',
  USER: 'text-user',
}

export function UserSettings() {
  const { t } = useTranslation()
  const patchUser = usePatchUser()
  const verifyPassword = useVerifyPassword()
  const patchPassword = usePatchPassword()

  const { register, handleSubmit, reset } = useForm<UserSettingsForm>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  })
  const user: User | undefined = getQueryData<User>(useGetCurrentUser())
  useEffect(() => {
    if (!user) return
    reset({
      username: user.username,
      email: user.email,
      password: '',
    })
  }, [user, reset])
  const onSubmit = async (data: UserSettingsForm) => {
    if (!user) return
    await patchUser.mutateAsync({
      id: user.id,
      requestBody: {
        username: data.username,
        email: data.email,
      },
    })
  }

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false)
  const handleChangePassword = async (newPassword: string): Promise<void> => {
    if (!user) return
    console.log('newPassword: ', newPassword)
    await patchPassword.mutateAsync({ id: user.id, requestBody: { password: newPassword } })
    await verifyPassword.mutateAsync({ principal: user.username, password: newPassword })
    toast.success(t('common.global.password_changed'))
  }

  if (user === undefined) return null

  return (
    <Suspense>
      <div className="flex w-full flex-col items-center justify-center">
        <div className="flex w-2xl flex-col gap-12 pt-16 max-md:w-fit">
          <div className="flex flex-row justify-start border-b pb-4">
            <p className="text-3xl font-semibold">{t('header.settings.settings')}</p>
          </div>
          <div className="flex items-center justify-between gap-16 px-1 max-md:flex-col max-md:justify-center md:flex-row">
            <div className="flex max-w-full min-w-fit flex-col items-start justify-center gap-4 truncate">
              <p className="text-5xl font-semibold">{user.username}</p>
              <p className="text-muted-foreground pl-1 text-base">{user.email}</p>
            </div>
            <Card className="flex w-1/6 min-w-fit items-center justify-center p-4 text-xl font-bold capitalize shadow-[0_0_10px]">
              <p className={cn(ROLE_TEXT_CLASS[user.role])}>{user.role}</p>
            </Card>
          </div>
          <form
            className="flex w-full flex-col items-start gap-12 max-md:items-center"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="flex flex-col items-start justify-between gap-6">
              <InputField
                register={register}
                name="username"
                label={t('common.user.username')}
                className="w-xs max-md:w-full"
              />
              <InputField
                register={register}
                name="email"
                label={t('common.user.email')}
                className="w-xs max-md:w-full"
              />
            </div>
            <div className="flex w-full flex-row items-center justify-end gap-2 max-md:justify-center">
              <ActionButton type="submit" label={t('common.global.save')} />
            </div>
          </form>
          <div className="border-secondary flex flex-col items-start gap-8 border-t pt-8">
            <p className="text-2xl font-semibold">{t('common.user.change_password')}</p>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setIsPasswordModalOpen(true)}
              className="text-destructive"
            >
              {t('common.user.change_password')}
            </Button>
          </div>
        </div>
      </div>
      {isPasswordModalOpen && (
        <ChangePassword
          onOpenChange={setIsPasswordModalOpen}
          principal={user.username} // principal: username
          onSubmitPasswordChange={handleChangePassword}
        />
      )}
    </Suspense>
  )
}
