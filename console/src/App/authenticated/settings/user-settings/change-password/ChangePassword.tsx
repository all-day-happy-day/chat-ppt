import { Suspense, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useVerifyPassword } from '@/api/query/auth.query'
import { ActionButton } from '@/components/common/action-button/ActionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { InputField } from '@/components/ui/InputField'

import '@/i18n/i18n'

import type { ChangePasswordForm, ChangePasswordProps } from './change-password.types'

const MIN_PASSWORD_LENGTH_FOR_VERIFY: number = 4
const VERIFY_DEBOUNCE_MS: number = 300

export function ChangePassword({ onOpenChange, principal, onSubmitPasswordChange }: ChangePasswordProps) {
  const { t } = useTranslation()
  const verifyPassword = useVerifyPassword()

  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
    mode: 'onChange',
  })

  const currentPassword = useWatch({ control, name: 'currentPassword' })
  const newPassword = useWatch({ control, name: 'newPassword' })
  const confirmNewPassword = useWatch({ control, name: 'confirmNewPassword' })

  const [verifiedSnapshot, setVerifiedSnapshot] = useState<string | null>(null)
  const isCurrentPasswordVerified: boolean = verifiedSnapshot !== null && verifiedSnapshot === currentPassword

  const currentPasswordRef = useRef<string>('')
  const currentPasswordTimerRef = useRef<number | null>(null)

  const verifyCurrentPasswordDebounced = (password: string): void => {
    if (currentPasswordTimerRef.current !== null) {
      window.clearTimeout(currentPasswordTimerRef.current)
    }

    currentPasswordRef.current = password
    if (password.length < MIN_PASSWORD_LENGTH_FOR_VERIFY) {
      setVerifiedSnapshot(null)
      setError('currentPassword', {
        type: 'validate',
        message: t('common.global.password_too_short', { minLength: MIN_PASSWORD_LENGTH_FOR_VERIFY }),
      })
      return
    }

    currentPasswordTimerRef.current = window.setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          await verifyPassword.mutateAsync({ principal, password })

          if (currentPasswordRef.current !== password) return

          setVerifiedSnapshot(password)
          clearErrors('currentPassword')
        } catch {
          if (currentPasswordRef.current !== password) return

          setVerifiedSnapshot(null)
          setError('currentPassword', { type: 'validate', message: t('common.global.wrong_password') })
        }
      })()
    }, VERIFY_DEBOUNCE_MS)
  }

  const submit = async (data: ChangePasswordForm) => {
    if (!isCurrentPasswordVerified) {
      setError('currentPassword', { type: 'validate', message: t('common.global.wrong_password') })
      return
    }
    if (data.newPassword.length < MIN_PASSWORD_LENGTH_FOR_VERIFY) {
      setError('newPassword', { type: 'validate', message: t('common.global.password_too_short') })
      return
    }
    if (data.newPassword !== data.confirmNewPassword) {
      setError('confirmNewPassword', { type: 'validate', message: t('common.global.password_mismatch') })
      return
    }
    await Promise.resolve(onSubmitPasswordChange(data.newPassword))
    onOpenChange(false)
  }

  return (
    <Suspense>
      <div className="fixed inset-0 z-100 flex h-full w-full items-center justify-center">
        <div
          className="absolute inset-0 flex h-full w-full justify-center bg-black/90"
          onClick={() => onOpenChange(false)}
        />
        <div className="z-101 flex flex-row items-center justify-center">
          <Card className="w-[400px] p-4 pb-2">
            <CardHeader className="w-full">
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="w-full">
              <form onSubmit={handleSubmit(submit)} className="flex w-full flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <InputField<ChangePasswordForm>
                    register={register}
                    name="currentPassword"
                    label="Current Password"
                    placeholder="********"
                    type="password"
                    registerOptions={{
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        verifyCurrentPasswordDebounced(e.target.value)
                      },
                      validate: (value: string) => {
                        if (value.length < MIN_PASSWORD_LENGTH_FOR_VERIFY) {
                          return t('common.global.password_too_short', { minLength: MIN_PASSWORD_LENGTH_FOR_VERIFY })
                        }
                        return true
                      },
                    }}
                  />
                  <div className="min-h-4 text-[11px]">
                    {errors.currentPassword && (
                      <p className="text-destructive pl-1">{errors.currentPassword.message}</p>
                    )}
                    {verifiedSnapshot && <p className="text-user pl-1">{t('common.global.password_verified')}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <InputField<ChangePasswordForm>
                    register={register}
                    name="newPassword"
                    label="New Password"
                    placeholder="********"
                    type="password"
                    registerOptions={{
                      validate: (value: string) => {
                        if (value.length < MIN_PASSWORD_LENGTH_FOR_VERIFY) {
                          return t('common.global.password_too_short', { minLength: MIN_PASSWORD_LENGTH_FOR_VERIFY })
                        }
                        return true
                      },
                    }}
                  />
                  <div className="min-h-4 text-[11px]">
                    {errors.newPassword && <p className="text-destructive pl-1">{errors.newPassword.message}</p>}
                    {newPassword && !errors.newPassword && (
                      <p className="text-user pl-1">{t('common.global.new_password_verified')}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <InputField<ChangePasswordForm>
                    register={register}
                    name="confirmNewPassword"
                    label="Confirm New Password"
                    placeholder="********"
                    type="password"
                    registerOptions={{
                      validate: (value: string) => {
                        if (value !== newPassword) {
                          return t('common.global.password_mismatch')
                        } else {
                          clearErrors('confirmNewPassword')
                        }
                        return true
                      },
                    }}
                  />
                  <div className="min-h-4 text-[11px]">
                    {errors.confirmNewPassword && (
                      <p className="text-destructive pl-1">{errors.confirmNewPassword.message}</p>
                    )}
                    {confirmNewPassword && !errors.confirmNewPassword && (
                      <p className="text-user pl-1">{t('common.global.new_password_confirmed')}</p>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-row justify-center">
                  <ActionButton
                    type="submit"
                    label="Change"
                    disabled={!isCurrentPasswordVerified || !newPassword || !confirmNewPassword}
                    className="w-1/3"
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}
