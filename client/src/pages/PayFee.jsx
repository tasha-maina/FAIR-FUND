import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './dashboard.css'

const PayFee = () => {
  const { applicationId } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const checkPaymentStatus = async () => {
    if (!applicationId) return

    setCheckingStatus(true)
    setError(null)
    setStatusMessage('Checking your payment status...')

    try {
      const res = await fetch(`/api/mpesa/application-status/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        setStatusMessage(data.message || 'Unable to check payment status')
        return
      }

      if (data.payment_status === 'completed') {
        setStatusMessage('Payment received. Your application is now moving to review.')
        navigate('/dashboard', { replace: true })
      } else {
        setStatusMessage('Still waiting for confirmation. Please complete the M-Pesa prompt on your phone.')
      }
    } catch (err) {
      console.error('Status check error:', err)
      setStatusMessage('Unable to check payment status right now.')
    } finally {
      setCheckingStatus(false)
    }
  }

  useEffect(() => {
    if (!sent || !applicationId) return

    const interval = setInterval(() => {
      checkPaymentStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [sent, applicationId, token])

  const handleConfirmPayment = async () => {
    if (!applicationId) return

    setConfirming(true)
    setError(null)
    setStatusMessage('Confirming your payment...')

    try {
      const res = await fetch('/api/mpesa/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ application_id: applicationId })
      })

      const data = await res.json()

      if (!res.ok) {
        setStatusMessage(data.message || 'Could not confirm payment')
        return
      }

      setStatusMessage('Payment confirmed. Your application is now moving to review.')
      setTimeout(() => navigate('/dashboard', { replace: true }), 600)
    } catch (err) {
      console.error('Confirm payment error:', err)
      setStatusMessage('Could not confirm payment right now.')
    } finally {
      setConfirming(false)
    }
  }

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
      console.error('Pay fee error:', err)
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
          {statusMessage && (
            <div style={{ marginTop: '1rem', color: 'var(--brand)', fontWeight: 600 }}>{statusMessage}</div>
          )}

          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="primary-btn" onClick={handleConfirmPayment} disabled={confirming}>
              {confirming ? 'Confirming...' : 'I Paid the Fee'}
            </button>
            <button className="primary-btn" onClick={checkPaymentStatus} disabled={checkingStatus}>
              {checkingStatus ? 'Checking...' : 'Check Payment Status'}
            </button>
            <button className="secondary-btn" onClick={() => navigate('/dashboard')}>
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
