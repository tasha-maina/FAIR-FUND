import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './dashboard.css'

const PayFee = () => {
  const { applicationId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone_number: phone, application_id: applicationId })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Payment request failed')
        setLoading(false)
        return
      }

      setSent(true)
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="dashboard-root">
        <div className="panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: '#c9a84c' }}>Check your phone</h2>
          <p className="muted">An M-Pesa prompt has been sent. Enter your PIN to complete the payment.</p>
          <button className="primary-btn" style={{ marginTop: '1.5rem', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-root">
      <form className="panel" onSubmit={handleSubmit} style={{ maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ color: '#c9a84c' }}>Pay evaluation fee</h2>
        <p className="muted">Enter the M-Pesa number to receive the payment prompt</p>
        {error && <div style={{ color: '#ff8a8a', margin: '1rem 0' }}>{error}</div>}

        <label className="muted" style={{ display: 'block', marginTop: '1rem' }}>Phone number</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XXXXXXXX"
          style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#0b2a44', color: '#fff', marginTop: '0.35rem' }}
          required
        />

        <button type="submit" className="action-btn" style={{ marginTop: '1.5rem', width: '100%', border: 'none', cursor: 'pointer' }} disabled={loading}>
          {loading ? 'Sending request...' : 'Send payment request'}
        </button>
      </form>
    </div>
  )
}

export default PayFee