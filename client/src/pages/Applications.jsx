import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './dashboard.css'

const Applications = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ 
    loan_amount: '', 
    purpose: '', 
    employment_status: 'employed', 
    stable_income: true, 
    previous_repayment: true 
  })
  const [result, setResult] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState(null)

  const fetchApps = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setApps(data)
    } catch (e) {
      setError('Could not load applications')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchApps() }, [token])

  const handleChange = (e) => setForm({ 
    ...form, 
    [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value 
  })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!form.loan_amount || Number(form.loan_amount) <= 0) {
      setError('Please enter a valid loan amount')
      return
    }
    if (!form.purpose) {
      setError('Please specify the purpose of the loan')
      return
    }
    try {
      const res = await fetch('/api/applications', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify({ ...form, loan_amount: Number(form.loan_amount) }) 
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to create')
        return
      }

      setResult({ 
        credit_score: data.credit_score.score, 
        risk_level: data.credit_score.risk_level, 
        evaluation_fee: data.evaluation_fee 
      })
      await fetchApps()
    } catch (err) {
      setError('Network error')
    }
  }

  const handlePayEvaluationFee = async () => {
    if (!user || !user.phone_number) {
      setPaymentError('Phone number not found in profile')
      return
    }
    if (!result) return

    setPaymentLoading(true)
    setPaymentError(null)
    try {
      // Find the most recent unpaid application to get its ID
      const unpaidApp = apps.find(a => a.status === 'submitted' && a.fee_status !== 'completed')
      if (!unpaidApp) {
        setPaymentError('No pending application found')
        setPaymentLoading(false)
        return
      }

      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phone_number: user.phone_number,
          application_id: unpaidApp.id
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setPaymentError(data.message || 'Payment initiation failed')
        setPaymentLoading(false)
        return
      }

      setPaymentLoading(false)
      setResult(null)
      setForm({ loan_amount: '', purpose: '', employment_status: 'employed', stable_income: true, previous_repayment: true })
      
      // Navigate to pay confirmation screen or back to dashboard
      navigate(`/pay/${unpaidApp.id}`)
    } catch (err) {
      setPaymentError('Network error initiating payment')
      setPaymentLoading(false)
    }
  }

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'disbursed':
        return { background: 'var(--info-bg)', color: 'var(--info)' }
      case 'repaid':
      case 'approved':
        return { background: 'var(--success-bg)', color: 'var(--success)' }
      case 'rejected':
        return { background: 'var(--error-bg)', color: 'var(--error)' }
      case 'under_review':
        return { background: 'var(--info-bg)', color: 'var(--info)' }
      default:
        return { background: 'var(--warning-bg)', color: 'var(--warning)' }
    }
  }

  return (
    <div className="dashboard-root">
      <header className="dash-header" style={{ marginBottom: '1.5rem' }}>
        <h1>Loan Applications</h1>
        <p className="muted">Apply for fair credit and view application history</p>
      </header>

      <section className="dash-main">
        <div className="dash-left">
          <div className="panel" style={{ marginTop: 0 }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>New Loan Application</h3>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem' }}>Requested Amount (KES)</label>
                <input 
                  name="loan_amount" 
                  type="number" 
                  value={form.loan_amount} 
                  onChange={handleChange} 
                  placeholder="e.g. 10000"
                  style={{ marginTop: '0.25rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem' }}>Purpose of Loan</label>
                <input 
                  name="purpose" 
                  value={form.purpose} 
                  onChange={handleChange} 
                  placeholder="e.g. Business expansion, medical expenses..."
                  style={{ marginTop: '0.25rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem' }}>Employment Status</label>
                <select 
                  name="employment_status" 
                  value={form.employment_status} 
                  onChange={handleChange}
                  style={{ marginTop: '0.25rem' }}
                >
                  <option value="employed">Employed (Full-Time)</option>
                  <option value="self-employed">Self-employed / Business Owner</option>
                  <option value="unemployed">Unemployed</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    name="stable_income" 
                    checked={form.stable_income} 
                    onChange={handleChange} 
                    style={{ width: 'auto', margin: '0 8px 0 0' }}
                  /> 
                  Stable monthly income
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    name="previous_repayment" 
                    checked={form.previous_repayment} 
                    onChange={handleChange} 
                    style={{ width: 'auto', margin: '0 8px 0 0' }}
                  /> 
                  Clean credit repayment history
                </label>
              </div>

              {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</div>}

              <div style={{ marginTop: '1rem' }}>
                <button className="action-btn" type="submit" style={{ border: 'none', cursor: 'pointer', width: '100%' }}>
                  Submit & Check Credit Score
                </button>
              </div>
            </form>
          </div>

          <div className="panel" style={{ marginTop: '1.5rem' }}>
            <h3>My Applications</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>Loading applications...</div>
            ) : apps.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>You have not submitted any applications yet.</div>
            ) : (
              <ul className="activity-list">
                {apps.map(a => (
                  <li key={a.id} className="activity-item" style={{ padding: '1.25rem 0' }}>
                    <div className="activity-info">
                      <div className="activity-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Application {a.id.slice(0, 8)}</span>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          ...getStatusBadgeStyle(a.status)
                        }}>
                          {a.status}
                        </span>
                      </div>
                      <div className="activity-date muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        Submitted on {new Date(a.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="activity-amount" style={{ fontSize: '1.1rem' }}>
                        KES {parseFloat(a.loan_amount).toLocaleString()}
                      </div>
                      <div className="muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        {a.purpose}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="dash-right">
          <div className="panel">
            <h3>Quick Actions</h3>
            <div className="actions">
              <button className="action-btn secondary" onClick={() => navigate('/dashboard')} style={{ width: '100%' }}>
                Back to Dashboard
              </button>
            </div>
          </div>

          {result && (
            <div className="panel" style={{ marginTop: '1.5rem', border: '1px solid var(--brand-border)' }}>
              <h3 style={{ margin: 0 }}>Application Result</h3>
              <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Your real-time credit score analysis</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'var(--surface-alt)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Credit Score</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: result.credit_score >= 80 ? 'var(--success)' : result.credit_score >= 50 ? 'var(--warning)' : 'var(--error)', marginTop: '2px' }}>
                    {result.credit_score} / 100
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Risk Evaluation</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: result.credit_score >= 80 ? 'var(--success)' : result.credit_score >= 50 ? 'var(--warning)' : 'var(--error)', marginTop: '2px', textTransform: 'uppercase' }}>
                    {result.risk_level} Risk
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Evaluation Fee (5%)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand)', marginTop: '2px' }}>
                    {result.evaluation_fee}
                  </div>
                  <div className="muted" style={{ fontSize: '0.7rem', marginTop: '4px' }}>Required by M-Pesa before admin review.</div>
                </div>
              </div>

              {paymentError && <div style={{ color: 'var(--error)', fontSize: '0.8rem', margin: '0.75rem 0 0 0' }}>{paymentError}</div>}
              
              <button 
                className="action-btn" 
                onClick={handlePayEvaluationFee} 
                disabled={paymentLoading}
                style={{ width: '100%', marginTop: '1.25rem', border: 'none', cursor: 'pointer' }}
              >
                {paymentLoading ? 'Initiating M-Pesa...' : 'Pay via M-Pesa'}
              </button>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

export default Applications
