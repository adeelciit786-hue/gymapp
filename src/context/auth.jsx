import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest('/auth/me')
      .then(({ user: current }) => { if (active) setUser(current) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    const expire = () => setUser(null)
    window.addEventListener('forge:auth-expired', expire)
    return () => {
      active = false
      window.removeEventListener('forge:auth-expired', expire)
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    async login(email, password) {
      const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setUser(result.user)
      return result.user
    },
    async signup(fields) {
      const result = await apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify(fields) })
      setUser(result.user)
      return result.user
    },
    updateUser(fields) {
      setUser((current) => current ? { ...current, ...fields } : current)
    },
    async logout() {
      await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({}) })
      setUser(null)
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
