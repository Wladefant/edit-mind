import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSession } from '../../hooks/useSession'

export function AuthGuard() {
  const navigate = useNavigate()
  const { session } = useSession()

  useEffect(() => {
    if (!session.isAuthenticated) {
      navigate('/auth/login')
    }
  }, [session.isAuthenticated, navigate])

  if (!session.isAuthenticated) {
    return null
  }

  return <Outlet />
}
