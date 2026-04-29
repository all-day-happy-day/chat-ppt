import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useVerifyAccessToken } from '@/api/query/auth.query'
import { Spinner } from '@/components/ui/spinner/Spinner'
// import { getQueryData } from '@/lib/utils'

export function IndexPage() {
  const navigate = useNavigate()
  const verifyToken = useVerifyAccessToken()

  useEffect(() => {
    if (verifyToken.isPending) return

    if (verifyToken.isSuccess && verifyToken.data === true) {
      void navigate('/settings')
      return
    }
    if (verifyToken.isError) {
      navigate('/signin')
      return
    }
  }, [verifyToken.isPending, verifyToken.isSuccess, verifyToken.isError, verifyToken.data, navigate])

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner width={40} height={40} />
    </div>
  )
}
