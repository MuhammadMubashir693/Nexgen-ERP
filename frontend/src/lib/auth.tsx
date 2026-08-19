import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, clearTokens, getAccessToken, signIn, signOut } from '../api/client'
import type { Role } from '../api/employees'

interface CurrentUser {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  department: { id: string; name: string } | null
  employee: {
    id: string
    firstName: string
    lastName: string
    designation: string | null
    avatarUrl: string | null
  } | null
}

interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false)
      return
    }
    apiFetch<{ success: true; user: CurrentUser }>('/api/auth/me')
      .then((result) => setUser(result.user))
      .catch(() => {
        clearTokens()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    await signIn(email, password)
    const result = await apiFetch<{ success: true; user: CurrentUser }>('/api/auth/me')
    setUser(result.user)
  }

  async function logout() {
    await signOut()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
