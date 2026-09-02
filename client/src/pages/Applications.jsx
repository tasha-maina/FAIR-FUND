import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import './dashboard.css'

const Applications = () => {
  const { token } = useAuth()
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

  const fetchApps = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setApps(data)
    } catch (e) {
      console.error('Fetch applications error:', e)
      setError('Could not load applications')
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      if (!token) return
      try {
        const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!ignore) setApps(data)
      } catch (e) {
        if (!ignore) {
          console.error('Fetch applications error:', e)
          setError('Could not load applications')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [token])

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
        setError(data.message || 'Failed to submit application')
        return
      }

      setResult({ 
        application_id: data.application.id,
        credit_score: data.credit_score.score, 
        risk_level: data.credit_score.risk_level, 
        evaluation_fee: data.evaluation_fee 
      })
      setForm({ loan_amount: '', purpose: '', employment_status: 'employed', stable_income: true, previous_repayment: true })
      await fetchApps()
    } catch (err) {
      console.error('Application submit error:', err)
      setError('Network error')
    }
  }

  const handlePayEvaluationFee = () => {
    if (!result?.application_id) return
    navigate(`/pay/${result.application_id}`)
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
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', color: 'var(--brand)' }}>
              New Loan Application
            </h3>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem' }}>Requested Amount (KES) *</label>
                <input 
                  name="loan_amount" 
                  type="number" 
                  value={form.loan_amount} 
                  onChange={handleChange} 
                  placeholder="e.g. 10000"
                  style={{ marginTop: '0.25rem' }}
                  required
                />
                {form.loan_amount && Number(form.loan_amount) > 0 && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--brand)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estimated 5% Evaluation Fee:</span>
                    <span>KES {(Number(form.loan_amount) * 0.05).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.85rem' }}>Purpose of Loan *</label>
                <input 
                  name="purpose" 
                  value={form.purpose} 
                  onChange={handleChange} 
                  placeholder="e.g. Business inventory, medical bills, education..."
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
                  <option value="employed">Employed (Full-Time / Salaried)</option>
                  <option value="self-employed">Self-employed / Small Business</option>
                  <option value="unemployed">Unemployed / Other</option>
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
                  Stable monthly income stream
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    name="previous_repayment" 
                    checked={form.previous_repayment} 
                    onChange={handleChange} 
                    style={{ width: 'auto', margin: '0 8px 0 0' }}
                  /> 
                  Good M-Pesa / credit repayment history
                </label>
              </div>

              {error && <div style={{ color: 'var(--error)', background: 'var(--error-bg)', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', margin: '0.5rem 0', border: '1px solid rgba(185, 28, 28, 0.2)' }}>{error}</div>}

              <div style={{ marginTop: '1rem' }}>
                <button className="action-btn" type="submit" style={{ border: 'none', cursor: 'pointer', width: '100%', padding: '0.9rem' }}>
                  Submit & Evaluate Credit Score
                </button>
              </div>
            </form>
          </div>

          <div className="panel" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--brand)' }}>My Loan Applications</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>Loading applications...</div>
            ) : apps.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>You have not submitted any applications yet.</div>
            ) : (
              <ul className="activity-list">
                {apps.map(a => (
                  <li key={a.id} className="activity-item" style={{ padding: '1.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div className="activity-info">
                      <div className="activity-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800 }}>APP-{a.id.slice(0, 8).toUpperCase()}</span>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          ...getStatusBadgeStyle(a.status)
                        }}>
                          {a.status.replace('_', ' ')}
                        </span>
                        {a.credit_score && (
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            background: 'var(--surface-alt)',
                            color: 'var(--text)'
                          }}>
                            Score: {a.credit_score}
                          </span>
                        )}
                      </div>
                      <div className="activity-date muted" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                        {a.purpose} • Submitted on {new Date(a.submitted_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div className="activity-amount" style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                        KES {parseFloat(a.loan_amount).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {a.fee_status === 'completed' ? (
                          <>
                            <span style={{
                              background: 'var(--success-bg)',
                              color: 'var(--success)',
                              border: '1px solid rgba(45, 122, 62, 0.25)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: 20,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span>✓</span> Fee: PAID
                            </span>
                            <Link to={`/pay/${a.id}`} style={{ fontSize: '0.75rem', color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>
                              Receipt
                            </Link>
                          </>
                        ) : (
                          <Link to={`/pay/${a.id}`} className="action-btn" style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', background: 'var(--warning)', color: '#fff', textDecoration: 'none' }}>
                            Pay Fee (KES {parseFloat(a.fee_amount || (a.loan_amount * 0.05)).toLocaleString()}) →
                          </Link>
                        )}
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
              <button className="action-btn secondary" onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '0.85rem' }}>
                Back to Dashboard
              </button>
            </div>
          </div>

          {result && (
            <div className="panel" style={{ marginTop: '1.5rem', border: '1px solid var(--brand-border)', boxShadow: '0 8px 24px rgba(44, 85, 48, 0.08)' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.65rem',
                borderRadius: 20,
                background: 'var(--brand-bg)',
                color: 'var(--brand)',
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '0.5rem'
              }}>
                Instant Score Analysis
              </span>
              <h3 style={{ margin: 0, color: 'var(--brand)' }}>Application Result</h3>
              <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Your real-time credit score analysis</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'var(--surface-alt)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Credit Score</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: result.credit_score >= 80 ? 'var(--success)' : result.credit_score >= 50 ? 'var(--warning)' : 'var(--error)', marginTop: '2px' }}>
                    {result.credit_score} / 100
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Risk Classification</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: result.credit_score >= 80 ? 'var(--success)' : result.credit_score >= 50 ? 'var(--warning)' : 'var(--error)', marginTop: '2px', textTransform: 'uppercase' }}>
                    {result.risk_level} Risk
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>5% Evaluation Fee Required</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand)', marginTop: '2px' }}>
                    {result.evaluation_fee}
                  </div>
                  <div className="muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Payable via Safaricom M-Pesa to initiate admin review.</div>
                </div>
              </div>
              
              <button 
                className="action-btn" 
                onClick={handlePayEvaluationFee}
                style={{ width: '100%', marginTop: '1.25rem', border: 'none', cursor: 'pointer', padding: '0.9rem', fontSize: '0.95rem' }}
              >
                Proceed to Pay {result.evaluation_fee} via M-Pesa →
              </button>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

export default Applications
