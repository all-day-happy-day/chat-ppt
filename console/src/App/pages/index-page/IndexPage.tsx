import { useNavigate } from 'react-router-dom'

import { useVerifyAccessToken } from '@/api/query/auth.query'
import { Spinner } from '@/components/ui/spinner/Spinner'
import { useMount } from '@/hooks/useMount'
import { getQueryData } from '@/lib/utils'

export function IndexPage() {
  const navigate = useNavigate()
  const verifyToken = useVerifyAccessToken()

  useMount(() => {
    try {
      const verified = getQueryData<boolean>(verifyToken)
      if (verified || verified !== undefined) {
        navigate('/settings')
      } else {
        navigate('/signin')
      }
    } catch {
      navigate('/signin')
    }
  })

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner width={40} height={40} />
    </div>
  )
}
