import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './dashboard.css'

const AdminDashboard = () => {
  const { token } = useAuth()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Review modal state
  const [selectedApp, setSelectedApp] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewStatus, setReviewStatus] = useState('approved') // 'approved' or 'rejected'
  
  // UI filter state
  const [activeTab, setActiveTab] = useState('all')

  const fetchApps = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/applications/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load applications')
      const data = await res.json()
      setApps(data)
    } catch (e) {
      setError(e.message || 'Could not load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApps()
  }, [token])

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!selectedApp) return

    try {
      const res = await fetch(`/api/applications/${selectedApp.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: reviewStatus, note: reviewNote })
      })

      if (!res.ok) {
        const errData = await res.json()
        alert(errData.message || 'Review failed')
        return
      }

      setSelectedApp(null)
      setReviewNote('')
      fetchApps()
    } catch (err) {
      alert('Network error')
    }
  }

  const handleDisburse = async (appId) => {
    if (!window.confirm('Are you sure you want to disburse this loan? This will execute an M-Pesa B2C transaction.')) return

    try {
      const res = await fetch(`/api/applications/${appId}/disburse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (!res.ok) {
        alert(data.message || 'Disbursement failed')
        return
      }

      alert(`Disbursement successful! M-Pesa Transaction ID: ${data.mpesa_transaction_id}`)
      fetchApps()
    } catch (err) {
      alert('Disbursement network error')
    }
  }

  const handleSimulatePayment = async (app) => {
    if (!app.checkout_request_id) {
      alert('No checkout request ID found. Please prompt the user to pay first.')
      return
    }

    try {
      const res = await fetch('/api/mpesa/simulate-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stkCallback: {
            ResultCode: 0,
            ResultDesc: 'Simulated success',
            CheckoutRequestID: app.checkout_request_id,
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: app.fee_amount || 50 },
                { Name: 'MpesaReceiptNumber', Value: `SIM_${Math.random().toString(36).substr(2, 8).toUpperCase()}` },
                { Name: 'PhoneNumber', Value: app.phone_number }
              ]
            }
          }
        })
      })

      if (!res.ok) throw new Error('Simulation failed')
      alert('Payment callback simulation sent successfully!')
      fetchApps()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSimulateRepayment = async (app) => {
    if (!app.repayment_checkout_id) {
      alert('No active repayment checkout request ID found.')
      return
    }

    try {
      const res = await fetch('/api/mpesa/simulate-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stkCallback: {
            ResultCode: 0,
            ResultDesc: 'Simulated repayment success',
            CheckoutRequestID: app.repayment_checkout_id,
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: app.loan_amount },
                { Name: 'MpesaReceiptNumber', Value: `SIM_REP_${Math.random().toString(36).substr(2, 8).toUpperCase()}` },
                { Name: 'PhoneNumber', Value: app.phone_number }
              ]
            }
          }
        })
      })

      if (!res.ok) throw new Error('Simulation failed')
      alert('Repayment callback simulation sent successfully!')
      fetchApps()
    } catch (err) {
      alert(err.message)
    }
  }

  // filter rows
  const filteredApps = apps.filter(a => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending_payment') return a.status === 'submitted' && a.fee_status !== 'completed'
    if (activeTab === 'pending_review') return a.status === 'under_review' || (a.status === 'submitted' && a.fee_status === 'completed')
    if (activeTab === 'approved') return a.status === 'approved'
    if (activeTab === 'disbursed') return a.status === 'disbursed'
    if (activeTab === 'repaid') return a.status === 'repaid'
    if (activeTab === 'rejected') return a.status === 'rejected'
    return true
  })

  // metrics
  const totalVolume = apps
    .filter(a => a.status === 'disbursed' || a.status === 'repaid')
    .reduce((sum, a) => sum + parseFloat(a.loan_amount), 0)

  const pendingReviewCount = apps.filter(a => a.status === 'under_review' || (a.status === 'submitted' && a.fee_status === 'completed')).length
  const readyToDisburseCount = apps.filter(a => a.status === 'approved').length

  return (
    <div className="dashboard-root" style={{ fontFamily: 'Inter, sans-serif', color: '#fff', background: '#0a1628', minHeight: 'calc(100vh - 70px)' }}>
      <header className="dash-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#c9a84c', fontSize: '2rem', fontWeight: 800 }}>Admin Portal</h1>
        <p className="muted">Evaluate loan applications, simulate payments, and execute disbursements</p>
      </header>

      {/* Stats Board */}
      <section className="dash-stats" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card" style={styles.statsCard}>
          <div className="stat-value" style={{ color: '#c9a84c' }}>{apps.length}</div>
          <div className="stat-label">Total Applications</div>
        </div>
        <div className="stat-card" style={styles.statsCard}>
          <div className="stat-value" style={{ color: '#c084fc' }}>{pendingReviewCount}</div>
          <div className="stat-label">Awaiting Review</div>
        </div>
        <div className="stat-card" style={styles.statsCard}>
          <div className="stat-value" style={{ color: '#10b981' }}>{readyToDisburseCount}</div>
          <div className="stat-label">Ready to Disburse</div>
        </div>
        <div className="stat-card" style={styles.statsCard}>
          <div className="stat-value" style={{ color: '#3b82f6' }}>KES {totalVolume.toLocaleString()}</div>
          <div className="stat-label">Total Disbursed</div>
        </div>
      </section>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {['all', 'pending_payment', 'pending_review', 'approved', 'disbursed', 'repaid', 'rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === tab ? '2px solid #c9a84c' : '2px solid transparent',
              color: activeTab === tab ? '#c9a84c' : '#8892b0'
            }}
          >
            {tab.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Application Table */}
      <div className="panel" style={{ background: '#072033', padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading applications...</div>
        ) : error ? (
          <div style={{ color: '#ff8a8a', textAlign: 'center', padding: '2rem' }}>{error}</div>
        ) : filteredApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8892b0' }}>No applications found in this category.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Applicant</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Credit Score</th>
                  <th style={styles.th}>Fee Status</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => (
                  <tr key={app.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700 }}>{app.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>{app.email} | {app.phone_number}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700, color: '#c9a84c' }}>KES {parseFloat(app.loan_amount).toLocaleString()}</div>
                      <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>{app.purpose}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800 }}>{app.credit_score}</span>
                        <span style={{
                          ...styles.badge,
                          background: app.credit_score >= 80 ? 'rgba(16, 185, 129, 0.1)' : app.credit_score >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: app.credit_score >= 80 ? '#10b981' : app.credit_score >= 50 ? '#f59e0b' : '#ef4444'
                        }}>
                          {app.credit_score >= 80 ? 'Low Risk' : app.credit_score >= 50 ? 'Medium' : 'High Risk'}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: app.fee_status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: app.fee_status === 'completed' ? '#10b981' : '#ef4444'
                      }}>
                        {app.fee_status === 'completed' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: app.status === 'disbursed' ? 'rgba(59, 130, 246, 0.1)' : app.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : app.status === 'repaid' ? 'rgba(16, 185, 129, 0.2)' : app.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(192, 132, 252, 0.1)',
                        color: app.status === 'disbursed' ? '#3b82f6' : app.status === 'approved' ? '#10b981' : app.status === 'repaid' ? '#10b981' : app.status === 'rejected' ? '#ef4444' : '#c084fc'
                      }}>
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {/* Simulation Tool: If unpaid, allow developers to simulate callback */}
                        {app.status === 'submitted' && app.fee_status !== 'completed' && (
                          <button
                            onClick={() => handleSimulatePayment(app)}
                            style={{ ...styles.actionBtn, background: '#f59e0b', color: '#000' }}
                          >
                            Simulate M-Pesa Pay
                          </button>
                        )}

                        {/* Review Application */}
                        {(app.status === 'under_review' || (app.status === 'submitted' && app.fee_status === 'completed')) && (
                          <button
                            onClick={() => setSelectedApp(app)}
                            style={{ ...styles.actionBtn, background: '#c084fc', color: '#fff' }}
                          >
                            Review
                          </button>
                        )}

                        {/* Disburse Loan */}
                        {app.status === 'approved' && (
                          <button
                            onClick={() => handleDisburse(app.id)}
                            style={{ ...styles.actionBtn, background: '#10b981', color: '#fff' }}
                          >
                            Disburse Funds
                          </button>
                        )}

                        {/* Simulate Repayment if active loan and has pending repayment */}
                        {app.status === 'disbursed' && app.repayment_status === 'pending' && (
                          <button
                            onClick={() => handleSimulateRepayment(app)}
                            style={{ ...styles.actionBtn, background: '#f59e0b', color: '#000' }}
                          >
                            Simulate Repayment Pay
                          </button>
                        )}

                        {app.status === 'disbursed' && app.repayment_status !== 'pending' && (
                          <span style={{ color: '#8892b0', fontSize: '0.85rem' }}>Active Loan</span>
                        )}
                        
                        {app.status === 'repaid' && (
                          <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>Fully Repaid</span>
                        )}
                        {app.status === 'rejected' && (
                          <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Declined</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ margin: 0, color: '#c9a84c', marginBottom: '1rem' }}>Review Loan Application</h3>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Evaluate request of <strong>{selectedApp.full_name}</strong> for <strong>KES {parseFloat(selectedApp.loan_amount).toLocaleString()}</strong>
            </p>
            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Decision</label>
                <select
                  value={reviewStatus}
                  onChange={e => setReviewStatus(e.target.value)}
                  style={styles.select}
                >
                  <option value="approved">Approve Application</option>
                  <option value="rejected">Decline Application</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Decision Note</label>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Explain reasoning or terms..."
                  style={styles.textarea}
                  rows={4}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  style={{ ...styles.actionBtn, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...styles.actionBtn, background: reviewStatus === 'approved' ? '#10b981' : '#ef4444', color: '#fff' }}
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  statsCard: {
    background: '#072033',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
  },
  tabContainer: {
    display: 'flex',
    gap: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '1.5rem',
    overflowX: 'auto'
  },
  tabBtn: {
    background: 'transparent',
    border: 'none',
    padding: '0.75rem 1.2rem',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.95rem'
  },
  th: {
    padding: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#8892b0',
    fontWeight: 600
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background 0.2s',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.01)'
    }
  },
  td: {
    padding: '1.2rem 1rem'
  },
  badge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  actionBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(5, 10, 20, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  modalContent: {
    background: '#072033',
    padding: '2rem',
    borderRadius: 12,
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    background: '#0b2a44',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    color: '#fff',
    outline: 'none',
    fontSize: '0.95rem'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    background: '#0b2a44',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    color: '#fff',
    outline: 'none',
    fontSize: '0.95rem',
    resize: 'none',
    boxSizing: 'border-box'
  }
}

export default AdminDashboard