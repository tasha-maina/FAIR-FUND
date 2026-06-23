import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Login failed')
        setLoading(false)
        return
      }

      // persist token; if remember, also store token in localStorage (handled by AuthContext.login)
      login(data.user, data.token)
      navigate('/dashboard')
    } catch (err) {
      setError('Network error')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ width: 420, background: '#072033', padding: 20, borderRadius: 8 }}>
        <h2 style={{ color: '#c9a84c' }}>Sign in</h2>
        {error && <div style={{ color: '#ff8a8a' }}>{error}</div>}
        <label style={{ display: 'block', marginTop: 12 }}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 8 }} />
        <label style={{ display: 'block', marginTop: 12 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 8 }} />
        <div style={{ marginTop: 12 }}>
          <label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
        </div>
        <button style={{ marginTop: 12, padding: '0.6rem 1rem', background: '#c9a84c', border: 'none' }} disabled={loading}>{loading ? 'Signing...' : 'Sign in'}</button>
      </form>
    </div>
  )
}
export default Login