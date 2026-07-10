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
        <div className="panel" style={{ maxWidth: 480, margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
          <h2 style={{ color: 'var(--brand)', margin: '0 0 1rem 0' }}>Check Your Phone</h2>
          <p className="muted" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            We've sent an M-Pesa STK payment request to <strong>{phone}</strong>.<br />
            Please enter your M-Pesa PIN on your phone to authorize the fee.
          </p>
          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="primary-btn" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-root">
      <form className="panel" onSubmit={handleSubmit} style={{ maxWidth: 480, margin: '2rem auto', padding: '2.5rem' }}>
        <h2 style={{ color: 'var(--brand)', margin: '0 0 0.5rem 0' }}>Pay Evaluation Fee</h2>
        <p className="muted" style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
          To initiate review of Application <strong>{applicationId.slice(0, 8)}</strong>, please pay the 5% evaluation fee via M-Pesa STK push.
        </p>

        {error && <div style={{ color: 'var(--error)', margin: '1rem 0', background: 'var(--error-bg)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(185, 28, 28, 0.2)', fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ textAlign: 'left' }}>
          <label>M-Pesa Mobile Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            required
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Format: 07XXXXXXXX or 2547XXXXXXXX</span>
        </div>

        <button 
          type="submit" 
          className="action-btn" 
          style={{ marginTop: '2rem', width: '100%', padding: '0.85rem' }} 
          disabled={loading}
        >
          {loading ? 'Sending Request...' : 'Send M-Pesa STK Push'}
        </button>
        
        <button 
          type="button" 
          className="action-btn secondary" 
          style={{ marginTop: '0.75rem', width: '100%', padding: '0.85rem' }}
          onClick={() => navigate('/dashboard')}
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

export default PayFee
