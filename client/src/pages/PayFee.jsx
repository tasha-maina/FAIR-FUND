import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './dashboard.css'

const PayFee = () => {
  const { applicationId } = useParams()
  const { token, user } = useAuth()
  const navigate = useNavigate()

  const [appData, setAppData] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [receiptCode, setReceiptCode] = useState('')
  const [showReceiptInput, setShowReceiptInput] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const loadFeeDetails = useCallback(async () => {
    if (!applicationId || !token) return
    try {
      const res = await fetch(`/api/mpesa/application-status/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Unable to load payment details')
        return
      }

      setAppData(data)
      if (data.user_phone) {
        setPhone(prev => prev || data.user_phone)
      } else if (user?.phone_number) {
        setPhone(prev => prev || user.phone_number)
      }

      if (data.payment_status === 'completed') {
        setStatusMessage('Payment verified! Your application is in review.')
      } else if (data.checkout_request_id) {
        setSent(true)
      }
    } catch (err) {
      console.error('Error loading fee details:', err)
      setError('Failed to connect to payment server')
    } finally {
      setInitialLoading(false)
    }
  }, [applicationId, token, user])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!applicationId || !token) return
      try {
        const res = await fetch(`/api/mpesa/application-status/${applicationId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (ignore) return

        if (!res.ok) {
          setError(data.message || 'Unable to load payment details')
          return
        }

        setAppData(data)
        if (data.user_phone) {
          setPhone(prev => prev || data.user_phone)
        } else if (user?.phone_number) {
          setPhone(prev => prev || user.phone_number)
        }

        if (data.payment_status === 'completed') {
          setStatusMessage('Payment verified! Your application is in review.')
        } else if (data.checkout_request_id) {
          setSent(true)
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error loading fee details:', err)
          setError('Failed to connect to payment server')
        }
      } finally {
        if (!ignore) setInitialLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [applicationId, token, user])

  const checkPaymentStatus = useCallback(async () => {
    if (!applicationId || !token) return

    setCheckingStatus(true)
    setError(null)
    setStatusMessage('Checking Safaricom M-Pesa payment status...')

    try {
      const res = await fetch(`/api/mpesa/application-status/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        setStatusMessage(data.message || 'Unable to check payment status')
        return
      }

      setAppData(data)

      if (data.payment_status === 'completed') {
        setStatusMessage('Payment received and verified successfully!')
      } else {
        setStatusMessage('Payment still pending. Please complete the M-Pesa PIN prompt on your phone.')
      }
    } catch (err) {
      console.error('Status check error:', err)
      setStatusMessage('Unable to check payment status right now.')
    } finally {
      setCheckingStatus(false)
    }
  }, [applicationId, token])

  useEffect(() => {
    if (!sent || !applicationId || appData?.payment_status === 'completed') return

    const interval = setInterval(() => {
      checkPaymentStatus()
    }, 4000)

    return () => clearInterval(interval)
  }, [sent, applicationId, appData?.payment_status, checkPaymentStatus])

  const handleConfirmPayment = async (codeToUse) => {
    if (!applicationId || !token) return

    setConfirming(true)
    setError(null)
    setStatusMessage('Confirming your payment...')

    try {
      const payload = { application_id: applicationId }
      const customCode = typeof codeToUse === 'string' ? codeToUse.trim() : receiptCode.trim()
      if (customCode) {
        payload.mpesa_receipt_number = customCode
      }

      const res = await fetch('/api/mpesa/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        setStatusMessage(data.message || 'Could not confirm payment')
        return
      }

      setStatusMessage('Payment confirmed! Evaluation fee is marked as PAID.')
      await loadFeeDetails()
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

      if (data.payment_status === 'completed') {
        setStatusMessage('Payment already completed!')
        await loadFeeDetails()
      } else {
        setSent(true)
        setStatusMessage(`M-Pesa STK prompt sent to ${phone}. Enter your PIN on your phone.`)
        await loadFeeDetails()
      }
    } catch (err) {
      console.error('Pay fee error:', err)
      setError('Network connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="dashboard-root" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ color: 'var(--brand)', fontWeight: 700, fontSize: '1.2rem' }}>Loading Payment Portal...</div>
          <div className="muted" style={{ marginTop: '0.5rem' }}>Fetching application and M-Pesa fee details</div>
        </div>
      </div>
    )
  }

  const feeAmountFormatted = appData?.fee_amount
    ? parseFloat(appData.fee_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'

  const loanAmountFormatted = appData?.loan_amount
    ? parseFloat(appData.loan_amount).toLocaleString()
    : '0'

  // STATE: ALREADY PAID / COMPLETED
  if (appData?.payment_status === 'completed') {
    return (
      <div className="dashboard-root">
        <div className="panel" style={{ maxWidth: 540, margin: '3rem auto', padding: '3rem 2.5rem', textAlign: 'center', border: '1px solid rgba(45, 122, 62, 0.3)', boxShadow: '0 12px 40px rgba(45, 122, 62, 0.08)' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--success-bg)',
            border: '2px solid var(--success)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            margin: '0 auto 1.5rem auto'
          }}>
            ✓
          </div>

          <span style={{
            display: 'inline-block',
            padding: '0.3rem 0.9rem',
            borderRadius: 20,
            background: 'var(--success-bg)',
            color: 'var(--success)',
            fontWeight: 800,
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            border: '1px solid rgba(45, 122, 62, 0.2)'
          }}>
            Fee Payment: PAID
          </span>

          <h2 style={{ color: 'var(--brand)', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
            Evaluation Fee Paid
          </h2>
          <p className="muted" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            Your 5% evaluation fee has been successfully received and recorded. Your loan application is now actively in review.
          </p>

          <div style={{
            background: 'var(--surface-alt)',
            borderRadius: 12,
            padding: '1.5rem',
            textAlign: 'left',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Application ID</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{applicationId.slice(0, 8).toUpperCase()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Requested Loan</span>
              <span style={{ fontWeight: 700 }}>KES {loanAmountFormatted}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Evaluation Fee Paid</span>
              <span style={{ fontWeight: 800, color: 'var(--brand)', fontSize: '1.1rem' }}>KES {feeAmountFormatted}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>M-Pesa Receipt Number</span>
              <span style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                {appData.mpesa_transaction_id || 'CONFIRMED'}
              </span>
            </div>

            {appData.paid_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: '0.85rem' }}>Date & Time</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{new Date(appData.paid_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="primary-btn" onClick={() => navigate('/dashboard')} style={{ flex: '1 1 180px' }}>
              Go to Dashboard
            </button>
            <button className="secondary-btn" onClick={() => navigate('/applications')} style={{ flex: '1 1 180px' }}>
              View Applications
            </button>
          </div>
        </div>
      </div>
    )
  }

  // STATE: STK PROMPT SENT / WAITING FOR PIN
  if (sent) {
    return (
      <div className="dashboard-root">
        <div className="panel" style={{ maxWidth: 520, margin: '3rem auto', textAlign: 'center', padding: '3rem 2.25rem', border: '1px solid var(--brand-border)' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--brand-bg)',
            border: '2px solid var(--brand)',
            color: 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.5rem auto'
          }}>
            📱
          </div>

          <span style={{
            display: 'inline-block',
            padding: '0.3rem 0.8rem',
            borderRadius: 20,
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            border: '1px solid rgba(180, 83, 9, 0.2)'
          }}>
            M-Pesa STK Prompt Dispatched
          </span>

          <h2 style={{ color: 'var(--brand)', margin: '0 0 0.75rem 0', fontSize: '1.65rem' }}>
            Check Your Mobile Phone
          </h2>

          <p className="muted" style={{ lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            We've sent an M-Pesa payment prompt for <strong>KES {feeAmountFormatted}</strong> to <strong>{phone}</strong>.<br />
            Please enter your M-Pesa PIN on your phone to complete payment.
          </p>

          <div style={{
            background: 'var(--surface-alt)',
            borderRadius: 10,
            padding: '1rem 1.25rem',
            textAlign: 'left',
            marginBottom: '1.75rem',
            fontSize: '0.85rem',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>Steps to complete:</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', color: 'var(--text-muted)' }}>
              <span>1.</span>
              <span>Look at your phone screen for the Safaricom STK prompt.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', color: 'var(--text-muted)' }}>
              <span>2.</span>
              <span>Enter your 4-digit M-Pesa PIN and tap <strong>OK</strong>.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)' }}>
              <span>3.</span>
              <span>This page will auto-update to <strong>PAID</strong> once verified.</span>
            </div>
          </div>

          {statusMessage && (
            <div style={{
              margin: '1.25rem 0',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'var(--brand-bg)',
              color: 'var(--brand)',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }}></span>
              {statusMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              className="primary-btn"
              onClick={checkPaymentStatus}
              disabled={checkingStatus}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {checkingStatus ? 'Verifying with Safaricom...' : "I've Entered My PIN — Verify Payment"}
            </button>

            <button
              className="action-btn"
              onClick={() => handleConfirmPayment()}
              disabled={confirming}
              style={{ width: '100%', padding: '0.85rem', background: 'var(--success)' }}
            >
              {confirming ? 'Confirming Payment...' : 'I Paid the Fee (Instant Confirm)'}
            </button>

            {!showReceiptInput ? (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowReceiptInput(true)}
                style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem' }}
              >
                Enter M-Pesa Receipt Code Manually
              </button>
            ) : (
              <div style={{ background: 'var(--surface-alt)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'left', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  M-Pesa Confirmation Code (from SMS)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={receiptCode}
                    onChange={(e) => setReceiptCode(e.target.value.toUpperCase())}
                    placeholder="e.g. QHA89201LK"
                    style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  <button
                    className="primary-btn"
                    onClick={() => handleConfirmPayment(receiptCode)}
                    disabled={confirming || !receiptCode.trim()}
                    style={{ whiteSpace: 'nowrap', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                  >
                    Confirm Code
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                className="secondary-btn"
                onClick={() => { setSent(false); setStatusMessage(''); }}
                style={{ flex: 1, fontSize: '0.85rem' }}
              >
                Change Phone / Resend
              </button>
              <button
                className="secondary-btn"
                onClick={() => navigate('/dashboard')}
                style={{ flex: 1, fontSize: '0.85rem' }}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STATE: INITIAL CHECKOUT FORM
  return (
    <div className="dashboard-root">
      <form className="panel" onSubmit={handleSubmit} style={{ maxWidth: 520, margin: '2.5rem auto', padding: '2.5rem', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
              Loan Evaluation Fee
            </span>
            <h2 style={{ color: 'var(--brand)', margin: '4px 0 0 0', fontSize: '1.75rem', fontWeight: 800 }}>
              Checkout via M-Pesa
            </h2>
          </div>
          <div style={{
            background: 'var(--brand-bg)',
            color: 'var(--brand)',
            padding: '0.4rem 0.8rem',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: '0.8rem',
            border: '1px solid var(--brand-border)'
          }}>
            5% Fee
          </div>
        </div>

        <p className="muted" style={{ marginBottom: '1.75rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
          To initiate review for Application <strong>{applicationId.slice(0, 8).toUpperCase()}</strong>, please authorize the evaluation fee. All payments are processed natively via Safaricom M-Pesa Daraja.
        </p>

        <div style={{
          background: 'var(--surface-alt)',
          borderRadius: 10,
          padding: '1.25rem',
          border: '1px solid var(--border)',
          marginBottom: '1.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Requested Loan Amount</span>
            <span style={{ fontWeight: 700 }}>KES {loanAmountFormatted}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Loan Purpose</span>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{appData?.purpose || 'Credit Facility'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Total Evaluation Fee (5%)</span>
            <span style={{ fontWeight: 800, color: 'var(--brand)', fontSize: '1.2rem' }}>
              KES {feeAmountFormatted}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            color: 'var(--error)',
            margin: '1rem 0',
            background: 'var(--error-bg)',
            padding: '0.85rem',
            borderRadius: 8,
            border: '1px solid rgba(185, 28, 28, 0.2)',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            M-Pesa Mobile Number
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX or 2547XXXXXXXX"
            required
            style={{ width: '100%', fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.02em' }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            Prompt will be dispatched to this phone. Enter Safaricom M-Pesa registered number.
          </span>
        </div>

        <button
          type="submit"
          className="action-btn"
          style={{ width: '100%', padding: '0.95rem', fontSize: '1rem', fontWeight: 800 }}
          disabled={loading}
        >
          {loading ? 'Initiating STK Push...' : `Pay KES ${feeAmountFormatted} via M-Pesa`}
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ flex: 1, padding: '0.75rem', fontSize: '0.85rem' }}
            onClick={() => handleConfirmPayment()}
            disabled={confirming}
          >
            {confirming ? 'Confirming...' : 'I Already Paid (Instant Confirm)'}
          </button>

          <Link
            to="/dashboard"
            className="secondary-btn"
            style={{ flex: 1, padding: '0.75rem', fontSize: '0.85rem', textAlign: 'center' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

export default PayFee
