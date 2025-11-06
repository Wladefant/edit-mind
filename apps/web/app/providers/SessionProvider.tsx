import { useState, type ReactNode } from 'react';
import { SessionContext, type Session } from '~/hooks/useSession'

interface SessionProviderProps {
  children: ReactNode
  initialSession?: Session
}

export function SessionProvider({ children, initialSession }: SessionProviderProps) {
  const [session, setSession] = useState<Session>(
    initialSession || {
      isAuthenticated: false,
      user: null,
    }
  )


  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  )
}