import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    // national ID required: digits only, 7-12 chars
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
          // normalize phone: allow 07XXXXXXXX -> 2547XXXXXXXX
          phone_number: form.phone_number.replace(/[^0-9]/g, '').replace(/^0/, '254')
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Registration failed')
        setLoading(false)
        return
      }

      // Persist auth and navigate to dashboard
      login(data.user, data.token)
      navigate('/dashboard')
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Create an account</h2>
        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>Full name</label>
        <input name="full_name" value={form.full_name} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Email</label>
        <input name="email" value={form.email} onChange={handleChange} style={styles.input} type="email" />

        <label style={styles.label}>Phone number</label>
        <input name="phone_number" value={form.phone_number} onChange={handleChange} style={styles.input} placeholder="07XXXXXXXX" />

        <label style={styles.label}>National ID</label>
        <input name="national_id" value={form.national_id} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Password</label>
        <input name="password" value={form.password} onChange={handleChange} style={styles.input} type="password" />

        <button type="submit" style={styles.button} disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
      </form>
    </div>
  )
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', padding: '2rem' },
  form: { width: '100%', maxWidth: 480, background: '#072033', padding: '1.5rem', borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.6)' },
  title: { margin: 0, marginBottom: '1rem', color: '#c9a84c' },
  label: { display: 'block', marginTop: '0.75rem', marginBottom: '0.35rem', color: '#8892b0' },
  input: { width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#0b2a44', color: '#fff' },
  button: { marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#c9a84c', color: '#06242f', borderRadius: 8, fontWeight: 700, border: 'none' },
  error: { background: 'rgba(255,0,0,0.07)', color: '#ff8a8a', padding: '0.6rem', borderRadius: 6, marginBottom: '0.75rem' }
}

export default Register