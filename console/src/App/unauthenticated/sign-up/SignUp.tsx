import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { ActionButton } from '@/components/common/action-button/ActionButton'
import { Button } from '@/components/ui/button/Button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { InputField } from '@/components/ui/InputField'

import '@/i18n/i18n'

import type { SignUpForm } from './SignUp.types'

export function SignUp() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { register, handleSubmit } = useForm<SignUpForm>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  })

  const onSubmit = (data: SignUpForm) => {
    console.log(data)
  }

  return (
    <Suspense>
      <div className="scrollbar-hide flex h-full items-center justify-center">
        <Card className="w-[400px] pt-8 pb-4">
          <CardHeader className="flex w-full flex-col items-center justify-center">
            <CardTitle className="text-center">Create your account</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 w-full px-8">
            <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-6">
              <InputField
                register={register}
                name="username"
                label={t('common.user.username')}
                placeholder={t('common.user.username')}
              />
              <InputField
                register={register}
                name="email"
                label={t('common.user.email')}
                placeholder={t('common.user.email')}
              />
              <InputField
                register={register}
                name="password"
                label={t('common.user.password')}
                placeholder={t('common.user.password')}
              />
              <div className="mt-4 flex w-full flex-row items-center justify-around">
                <ActionButton type="submit" label={t('common.global.sign_up')} className="h-8 w-1/3" />
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button variant="link" onClick={() => navigate('/signin')}>
              <p>{t('common.auth.already_have_an_account')}</p>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Suspense>
  )
}
