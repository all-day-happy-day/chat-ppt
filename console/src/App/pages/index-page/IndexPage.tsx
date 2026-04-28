import { Spinner } from '@/components/ui/spinner/Spinner'
import { authUseCase } from '@/di/usecases'
import { useMount } from '@/hooks/useMount'

export function IndexPage() {
  useMount(() => {
    authUseCase
      .verify()
      .then(() => {
        window.location.href = '/settings'
      })
      .catch(() => {
        window.location.href = '/signin'
      })
  })

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner width={40} height={40} />
    </div>
  )
}
