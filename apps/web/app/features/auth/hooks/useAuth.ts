import { useEffect, useState } from 'react'
import { useNavigate, useFetcher } from 'react-router'
import { useSession } from './useSession'
import type { LoginFormValues, RegisterFormValues } from '~/types/auth'

export function useAuth() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { setSession } = useSession()
  const fetcher = useFetcher<{ session: { email: string; name: string } } | { error: string }>()

  const handleAuth = async (values: LoginFormValues | RegisterFormValues, endpoint: string) => {
    setError(null)

    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value as string)
    })

    fetcher.submit(formData, { method: 'post', action: endpoint })
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setSession({ isAuthenticated: false, user: null })
      navigate('/auth/login')
    } catch {
      setError('Failed to logout')
    }
  }
  const loading = fetcher.state === 'submitting'

  useEffect(() => {
    if (fetcher.data && 'session' in fetcher.data) {
      setSession({
        isAuthenticated: true,
        user: { email: fetcher.data.session.email, name: fetcher.data.session.name },
      })
    }
    if (fetcher.data && 'error' in fetcher.data) {
      setError(fetcher.data.error)
    }
    return () => {
      setSession({ isAuthenticated: false, user: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, fetcher.data, navigate])

  return {
    loading: loading,
    error,
    handleAuth,
    handleLogout,
  }
}
