import { useState } from 'react'
import { useNavigate, useFetcher } from 'react-router'
import { useSession } from './useSession'
import type { LoginFormValues, RegisterFormValues } from '~/types/auth'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setSession } = useSession()
  const fetcher = useFetcher()

  const handleAuth = async (values: LoginFormValues | RegisterFormValues, endpoint: string) => {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value)
    })

    fetcher.submit(formData, { method: 'post', action: endpoint })
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setSession({ isAuthenticated: false, user: null })
      navigate('/auth/login')
    } catch {
      setError('Failed to logout')
    } finally {
      setLoading(false)
    }
  }

  return {
    loading: loading || fetcher.state !== 'idle',
    error: error || (fetcher.data?.error as string),
    handleAuth,
    handleLogout,
  }
}
