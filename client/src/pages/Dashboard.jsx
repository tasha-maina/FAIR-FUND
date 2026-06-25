import { Link, useNavigate } from 'react-router-dom'
import './dashboard.css'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Dashboard = () => {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401) {
          logout()
          navigate('/login')
          return
        }
        const data = await res.json()
        // applications list -> build simple stats and recent activity
        setRecent(data.slice(0, 5).map(a => ({ id: a.id, title: `Application ${a.id} - ${a.status}`, date: a.updated_at || a.submitted_at || '', amount: `KES ${a.loan_amount}`, status: a.status })))
        setStats([
          { label: 'Applications', value: String(data.length) },
          { label: 'Approved', value: String(data.filter(d => d.status === 'approved').length) },
          { label: 'Disbursed', value: String(data.filter(d => d.status === 'disbursed').length) },
        ])
      } catch (err) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  return (
    <div className="dashboard-root">
      <header className="dash-header">
        <h1>Welcome back{user ? `, ${user.full_name || ''}` : ''}</h1>
        <p className="muted">Here's a quick summary of your account</p>
      </header>

      {!loading && stats.length > 0 && stats[0].value === '0' ? (
        <div className="empty-state panel">
          <h2>Welcome to Fair Fund{user ? `, ${user.full_name.split(' ')[0]}` : ''}!</h2>
          <p className="muted">You don't have any applications yet. Start by applying for a loan — we'll guide you through the process.</p>
          <div className="empty-actions">
            <Link to="/applications" className="primary-btn">Apply for a loan</Link>
            <Link to="/dashboard" className="secondary-btn">Pay evaluation fee</Link>
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
              <div className="panel">
                <h3>Recent activity</h3>
                <ul className="activity-list">
                  {recent.map(r => (
                    <li key={r.id} className="activity-item">
                      <div className="activity-info">
                        <div className="activity-title">{r.title}</div>
                        <div className="activity-date muted">{r.date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="activity-amount">{r.amount}</div>
                        {r.status === 'submitted' && (
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
                  <Link to="/dashboard" className="action-btn secondary">Pay evaluation fee</Link>
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