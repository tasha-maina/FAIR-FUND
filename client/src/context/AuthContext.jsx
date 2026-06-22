import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')

    const init = async () => {
      if (!token) {
        if (storedUser) setUser(JSON.parse(storedUser))
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) {
          // token invalid or expired
          setUser(null)
          setToken(null)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setLoading(false)
          return
        }

        const data = await res.json()
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      } catch (err) {
        console.error('Error fetching profile', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [token])

  const login = (userData, tokenData) => {
    setUser(userData)
    setToken(tokenData)
    localStorage.setItem('token', tokenData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)