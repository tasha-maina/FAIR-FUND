import { Link, useNavigate } from 'react-router-dom'
import './dashboard.css'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { isFeePaid, isStepDone, getProgressWidth } from './dashboardProgress.mjs'

const Dashboard = () => {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingFeeAppId, setPendingFeeAppId] = useState(null)
  const [latestApp, setLatestApp] = useState(null)

  // Repayment UI state
  const [repayLoading, setRepayLoading] = useState(false)
  const [repayError, setRepayError] = useState(null)
  const [repaySuccess, setRepaySuccess] = useState(false)
  const [repayPhone, setRepayPhone] = useState(user?.phone_number || '')

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) {
        logout()
        navigate('/login')
        return
      }
      const data = await res.json()
      
      const unpaid = data.find(a => a.status === 'submitted' && a.fee_status !== 'completed')
      setPendingFeeAppId(unpaid ? unpaid.id : null)

      if (data.length > 0) {
        setLatestApp(data[0])
      } else {
        setLatestApp(null)
      }

      // applications list -> build simple stats and recent activity
      setRecent(data.slice(0, 5).map(a => ({ 
        id: a.id, 
        title: `Application ${a.id.slice(0, 8)} - ${a.status}`, 
        date: a.updated_at || a.submitted_at || '', 
        amount: `KES ${parseFloat(a.loan_amount).toLocaleString()}`, 
        status: a.status,
        fee_status: a.fee_status
      })))
      
      setStats([
        { label: 'Applications', value: String(data.length) },
        { label: 'Approved', value: String(data.filter(d => d.status === 'approved' || d.status === 'disbursed' || d.status === 'repaid').length) },
        { label: 'Fully Repaid', value: String(data.filter(d => d.status === 'repaid').length) },
      ])
    } catch (err) {
      console.error('Fetch dashboard error:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token, logout, navigate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  // Poll while evaluation fee payment may still be processing
  useEffect(() => {
    if (!latestApp || latestApp.fee_status === 'completed') return
    if (latestApp.status !== 'submitted') return
    const interval = setInterval(() => {
      fetchData()
    }, 5000)
    return () => clearInterval(interval)
  }, [latestApp, fetchData])

  const handleRepaySubmit = async (e) => {
    e.preventDefault()
    if (!latestApp || !latestApp.loan_offer_id) return
    
    setRepayLoading(true)
    setRepayError(null)
    setRepaySuccess(false)
    
    try {
      const res = await fetch('/api/mpesa/repay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phone_number: repayPhone,
          loan_offer_id: latestApp.loan_offer_id
        })
      })
      
      const data = await res.json()
      if (!res.ok) {
        setRepayError(data.message || 'Repayment initiation failed')
        return
      }
      
      setRepaySuccess(true)
      // Check for status updates
      setTimeout(() => fetchData(), 5000)
    } catch (err) {
      console.error('Repayment submit error:', err)
      setRepayError('Network error')
    } finally {
      setRepayLoading(false)
    }
  }

  const needsFeePayment = (app) =>
    app?.status === 'submitted' && app?.fee_status !== 'completed'

  return (
    <div className="dashboard-root" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="dash-header" style={{ marginBottom: '1.5rem' }}>
        <h1>Welcome back{user ? `, ${user.full_name || ''}` : ''}</h1>
        <p className="muted">Here's a quick summary of your account</p>
      </header>

      {!loading && stats.length > 0 && stats[0].value === '0' ? (
        <div className="empty-state panel">
          <h2>Welcome to Fair Fund{user ? `, ${user.full_name.split(' ')[0]}` : ''}!</h2>
          <p className="muted">You don't have any applications yet. Start by applying for a loan — we'll guide you through the process.</p>
          <div className="empty-actions">
            <Link to="/applications" className="primary-btn">Apply for a loan</Link>
            {pendingFeeAppId && <Link to={`/pay/${pendingFeeAppId}`} className="secondary-btn">Pay evaluation fee</Link>}
          </div>
        </div>
      ) : (
        <>
          <section className="dash-stats">
            {loading ? <div>Loading...</div> : error ? <div>{error}</div> : stats.map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </section>

          <section className="dash-main">
            <div className="dash-left">
              {/* Application Progress visualizer */}
              {latestApp && (
                <div className="panel" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0 }}>Active Application Progress</h3>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>Track the lifecycle of your current loan request</p>
                  
                  <div className="progress-stepper">
                    <div className="progress-track"></div>
                    <div className="progress-fill" style={{ width: getProgressWidth(latestApp) }}></div>

                    <div className="progress-step">
                      <div className="step-circle done">✓</div>
                      <div className="progress-step-label">Submitted</div>
                    </div>

                    <div className="progress-step">
                      <div className={`step-circle ${isStepDone(latestApp, 'fee') ? 'done' : 'pending'}`}>
                        {isStepDone(latestApp, 'fee') ? '✓' : '2'}
                      </div>
                      <div className="progress-step-label">Evaluation Fee</div>
                    </div>

                    <div className="progress-step">
                      <div className={`step-circle ${isStepDone(latestApp, 'review') ? 'done' : 'pending'}`}>
                        {isStepDone(latestApp, 'review') ? '✓' : '3'}
                      </div>
                      <div className="progress-step-label">Admin Review</div>
                    </div>

                    <div className="progress-step">
                      <div className={`step-circle ${isStepDone(latestApp, 'disburse') ? 'done' : 'pending'}`}>
                        {isStepDone(latestApp, 'disburse') ? '✓' : '4'}
                      </div>
                      <div className="progress-step-label">Disbursement</div>
                    </div>
                  </div>
                  
                  {needsFeePayment(latestApp) && (
                    <div className="status-banner fee-required">
                      <div>
                        <div className="status-title">Fee Payment Required</div>
                        <div className="status-desc">Please pay the 5% evaluation fee to move your application to review.</div>
                      </div>
                      <Link to={`/pay/${latestApp.id}`} className="action-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Pay Fee</Link>
                    </div>
                  )}

                  {isFeePaid(latestApp) && latestApp.status === 'submitted' && (
                    <div className="status-banner review">
                      <div>
                        <div className="status-title">Evaluation Fee Paid</div>
                        <div className="status-desc">Your payment was received. Your application will move to admin review shortly.</div>
                      </div>
                    </div>
                  )}

                  {latestApp.status === 'under_review' && (
                    <div className="status-banner review">
                      <div className="status-title">Under Review</div>
                      <div className="status-desc">Our loan officers are currently reviewing your credit profile. You will receive a notification as soon as a decision is made.</div>
                    </div>
                  )}

                  {latestApp.status === 'approved' && (
                    <div className="status-banner approved">
                      <div className="status-title">Approved & Ready</div>
                      <div className="status-desc">Your loan is approved! The funds are currently being prepared for disbursement to your M-Pesa account.</div>
                    </div>
                  )}

                  {latestApp.status === 'disbursed' && latestApp.loan_offer_status !== 'repaid' && (
                    <div className="status-banner disbursed">
                      <div className="status-title">Funds Disbursed</div>
                      <div className="status-desc">Congratulations! Your loan has been successfully disbursed to your phone. Check your M-Pesa messages.</div>
                    </div>
                  )}

                  {latestApp.status === 'repaid' && (
                    <div className="status-banner repaid">
                      <div className="status-title">Loan Repaid Successfully</div>
                      <div className="status-desc">Congratulations! You have fully repaid your loan. Your clean history qualifies you to borrow again immediately!</div>
                    </div>
                  )}

                  {latestApp.status === 'rejected' && (
                    <div className="status-banner rejected">
                      <div className="status-title">Application Declined</div>
                      <div className="status-desc">Unfortunately, your application was not approved. Admin Note: "{latestApp.admin_note || 'N/A'}"</div>
                    </div>
                  )}
                </div>
              )}

              {/* Loan Repayment Panel */}
              {latestApp && latestApp.status === 'disbursed' && latestApp.loan_offer_status !== 'repaid' && (
                <div className="panel repay-panel" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Active Loan Repayment</span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 4, textTransform: 'uppercase', border: '1px solid rgba(180, 83, 9, 0.2)' }}>Due Soon</span>
                  </h3>
                  <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Repay your active loan balance instantly via M-Pesa</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Outstanding Balance</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>KES {parseFloat(latestApp.approved_amount || latestApp.loan_amount).toLocaleString()}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Interest Rate: {latestApp.interest_rate || 0}% | Term: {latestApp.repayment_months || 1} Month</div>
                      {latestApp.disbursement_tx_id && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Disbursement Tx ID: {latestApp.disbursement_tx_id}</div>}
                    </div>
                    
                    <div style={{ flex: '1 1 auto', maxWidth: '340px' }}>
                      {repaySuccess ? (
                        <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(45, 122, 62, 0.2)', padding: '1rem', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>STK Push Sent!</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Check your phone for the M-Pesa prompt. Enter your PIN to repay.</div>
                        </div>
                      ) : (
                        <form onSubmit={handleRepaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>M-Pesa Phone Number</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="text"
                              value={repayPhone}
                              onChange={e => setRepayPhone(e.target.value)}
                              placeholder="07XXXXXXXX"
                              required
                            />
                            <button 
                              type="submit" 
                              className="action-btn" 
                              disabled={repayLoading}
                              style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
                            >
                              {repayLoading ? 'Sending...' : 'Repay Now'}
                            </button>
                          </div>
                          {repayError && <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: 4 }}>{repayError}</div>}
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Transparent Credit Scoring Card */}
              {latestApp && latestApp.score_breakdown && (
                <div className="panel" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0 }}>Transparent Credit Scoring</h3>
                  <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>See exactly how your creditworthiness was evaluated</p>
                  
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 800, color: latestApp.credit_score >= 80 ? 'var(--success)' : latestApp.credit_score >= 50 ? 'var(--warning)' : 'var(--error)', lineHeight: 1 }}>
                        {latestApp.credit_score}
                      </div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)', marginTop: 8 }}>Credit Score</div>
                      
                      <span style={{
                        marginTop: 12,
                        padding: '0.25rem 0.75rem',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: latestApp.credit_score >= 80 ? 'var(--success-bg)' : latestApp.credit_score >= 50 ? 'var(--warning-bg)' : 'var(--error-bg)',
                        color: latestApp.credit_score >= 80 ? 'var(--success)' : latestApp.credit_score >= 50 ? 'var(--warning)' : 'var(--error)'
                      }}>
                        {latestApp.risk_level === 'low' ? 'Low Risk' : latestApp.risk_level === 'medium' ? 'Medium Risk' : 'High Risk'}
                      </span>
                    </div>
                    
                    <div style={{ flex: '2 2 300px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Employment Stability', score: latestApp.score_breakdown.employment, max: 30, color: 'var(--info)' },
                        { label: 'Income Consistency', score: latestApp.score_breakdown.stable_income, max: 25, color: 'var(--success)' },
                        { label: 'Payment History', score: latestApp.score_breakdown.previous_repayment, max: 25, color: 'var(--brand)' },
                        { label: 'Loan Size Adequacy', score: latestApp.score_breakdown.loan_amount, max: 20, color: 'var(--warning)' }
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
                            <span style={{ fontWeight: 700, color: item.color }}>{item.score || 0} / {item.max} pts</span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: 'var(--step-pending)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${((item.score || 0) / item.max) * 100}%`, height: '100%', background: item.color, borderRadius: 3, transition: 'width 0.6s ease' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="panel">
                <h3>Recent activity</h3>
                <ul className="activity-list">
                  {recent.map(r => (
                    <li key={r.id} className="activity-item">
                      <div className="activity-info">
                        <div className="activity-title">{r.title}</div>
                        <div className="activity-date muted">{r.date ? new Date(r.date).toLocaleDateString() : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="activity-amount">{r.amount}</div>
                        {r.status === 'submitted' && r.fee_status !== 'completed' && (
                          <Link to={`/pay/${r.id}`} className="action-btn" style={{ padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>
                            Pay fee
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="dash-right">
              <div className="panel">
                <h3>Quick actions</h3>
                <div className="actions">
                  <Link to="/applications" className="action-btn">Apply for loan</Link>
                  <Link to={pendingFeeAppId ? `/pay/${pendingFeeAppId}` : '/applications'} className="action-btn secondary">Pay evaluation fee</Link>
                </div>
              </div>

              <div className="panel small">
                <h4>Support</h4>
                <p className="muted">Need help? Contact support@fairfund.local</p>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  )
}

export default Dashboard