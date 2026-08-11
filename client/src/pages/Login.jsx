import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'
import './dashboard.css'

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
      const res = await API.post('/auth/login', { email, password })
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', padding: '2rem' }}>
      <form onSubmit={submit} className="panel" style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}>
        <h2 style={{ color: 'var(--brand)', margin: '0 0 0.5rem 0', textAlign: 'center' }}>Welcome Back</h2>
        <p className="muted" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>Sign in to manage your loans</p>
        
        {error && <div style={{ color: 'var(--error)', background: 'var(--error-bg)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(185, 28, 28, 0.2)', marginBottom: '1.25rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
        
        <div style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
          <label>Email Address</label>
          <input 
            type="email"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="name@email.com"
            required
          />
        </div>
        
        <div style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••"
            required
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            <input 
              type="checkbox" 
              checked={remember} 
              onChange={e => setRemember(e.target.checked)} 
              style={{ marginRight: '6px' }}
            /> 
            Remember me
          </label>
        </div>
        
        <button 
          type="submit"
          className="action-btn"
          style={{ width: '100%', padding: '0.85rem' }} 
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <p className="muted" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          New to Fair Fund? <Link to="/register" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
        </p>
      </form>
    </div>
  )
}

export default Login
