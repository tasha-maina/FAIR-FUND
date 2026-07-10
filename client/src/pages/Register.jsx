import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './dashboard.css'

const Register = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone_number: '', national_id: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validate = () => {
    if (!form.full_name || !form.email || !form.password || !form.phone_number) {
      setError('Please fill all required fields')
      return false
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (!form.national_id) {
      setError('National ID is required')
      return false
    }
    if (!/^[0-9]{7,12}$/.test(form.national_id)) {
      setError('National ID must be 7-12 digits')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone_number: form.phone_number.replace(/[^0-9]/g, '').replace(/^0/, '254')
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Registration failed')
        setLoading(false)
        return
      }

      login(data.user, data.token)
      navigate('/dashboard')
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', padding: '2rem' }}>
      <form onSubmit={handleSubmit} className="panel" style={{ width: '100%', maxWidth: 460, padding: '2.5rem' }}>
        <h2 style={{ color: 'var(--brand)', margin: '0 0 0.5rem 0', textAlign: 'center' }}>Get Started</h2>
        <p className="muted" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>Create a Fair Fund account to access credit</p>
        
        {error && <div style={{ color: 'var(--error)', background: 'var(--error-bg)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(185, 28, 28, 0.2)', marginBottom: '1.25rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
          <label>Full Name *</label>
          <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="John Doe" required />
        </div>

        <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
          <label>Email Address *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" required />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'left', flex: '1 1 180px' }}>
            <label>Phone Number (M-Pesa) *</label>
            <input name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="07XXXXXXXX" required />
          </div>
          <div style={{ textAlign: 'left', flex: '1 1 180px' }}>
            <label>National ID *</label>
            <input name="national_id" value={form.national_id} onChange={handleChange} placeholder="12345678" required />
          </div>
        </div>

        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <label>Password *</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="At least 6 characters" required />
        </div>

        <button type="submit" className="action-btn" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="muted" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </form>
    </div>
  )
}

export default Register
