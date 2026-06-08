import { startTransition, Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useSignIn } from '@/api/query/auth.query'
import { ActionButton } from '@/components/common/action-button/ActionButton'
import { Button } from '@/components/ui/button/Button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { InputField } from '@/components/ui/InputField'

import '@/i18n/i18n'
import '@/i18n/i18n'

import type { SignInForm } from './SignIn.types'

export function SignIn() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutateAsync: signIn } = useSignIn()

  const [credentialError, setCredentialError] = useState<boolean>(false)

  const { register, handleSubmit } = useForm<SignInForm>({
    defaultValues: {
      principal: '',
      password: '',
    },
  })

  const onSubmit = (data: { principal: string; password: string }) => {
    setCredentialError(false)
    startTransition(async () => {
      try {
        await signIn({
          principal: data.principal,
          password: data.password,
        })
        void navigate('/')
      } catch {
        setCredentialError(true)
      }
    })
  }

  return (
    <Suspense>
      <div className="scrollbar-hide flex h-full items-center justify-center">
        <Card className="w-[400px] pt-8 pb-4">
          <CardHeader className="flex w-full flex-col items-center justify-center">
            <CardTitle className="text-center">{t('common.global.welcome')}</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 w-full px-8">
            <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-6">
              <InputField
                register={register}
                name="principal"
                label={t('common.global.email_or_username')}
                placeholder={t('common.global.email_or_username')}
              />
              <InputField
                register={register}
                name="password"
                label={t('common.global.password')}
                placeholder={t('common.user.password')}
                type="password"
              />
              <p className={`text-xs text-red-500 ${credentialError ? 'visible' : 'invisible'}`}>
                {t('common.auth.invalid_credentials')}
              </p>
              <div className="mt-4 flex w-full flex-row items-center justify-around">
                <ActionButton type="submit" label={t('common.global.sign_in')} className="h-8 w-1/3" />
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button variant="link" onClick={() => navigate('/signup')}>
              <p>{t('common.auth.dont_have_an_account')}</p>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Suspense>
  )
}
