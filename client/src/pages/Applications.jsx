import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './dashboard.css'

const Applications = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ loan_amount: '', purpose: '', employment_status: 'employed', stable_income: true, previous_repayment: true })
  const [result, setResult] = useState(null)

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, loan_amount: Number(form.loan_amount) }) })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to create')
        return
      }

      // show returned credit score, risk level and evaluation fee in stat cards
      setResult({ credit_score: data.credit_score.score, risk_level: data.credit_score.risk_level, evaluation_fee: data.evaluation_fee })
      await fetchApps()
    } catch (err) {
      setError('Network error')
    }
  }

  return (
    <div className="dashboard-root">
      <header className="dash-header">
        <h1>Your applications</h1>
        <p className="muted">Manage and apply for loans</p>
      </header>

      <section className="dash-main">
        <div className="dash-left">
          <div className="panel">
            <h3>My applications</h3>
            {loading ? <div>Loading...</div> : error ? <div style={{ color: '#ff8a8a' }}>{error}</div> : (
              <ul className="activity-list">
                {apps.map(a => (
                  <li key={a.id} className="activity-item">
                    <div className="activity-info">
                      <div className="activity-title">Application {a.id}</div>
                      <div className="activity-date muted">{a.submitted_at}</div>
                    </div>
                    <div className="activity-amount">{a.status} — KES {a.loan_amount}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h3>Apply for a loan</h3>
            <form onSubmit={submit}>
              <label>Loan amount</label>
              <input name="loan_amount" type="number" value={form.loan_amount} onChange={handleChange} />
              <label>Purpose</label>
              <input name="purpose" value={form.purpose} onChange={handleChange} />
              <label>Employment status</label>
              <select name="employment_status" value={form.employment_status} onChange={handleChange}>
                <option value="employed">Employed</option>
                <option value="self-employed">Self-employed</option>
                <option value="unemployed">Unemployed</option>
              </select>
              <label><input type="checkbox" name="stable_income" checked={form.stable_income} onChange={handleChange} /> Stable income</label>
              <label><input type="checkbox" name="previous_repayment" checked={form.previous_repayment} onChange={handleChange} /> Previous repayment history</label>
              <div style={{ marginTop: 12 }}>
                <button className="action-btn" type="submit">Submit application</button>
              </div>
            </form>
          </div>
        </div>

        <aside className="dash-right">
          <div className="panel">
            <h3>Quick actions</h3>
            <div className="actions">
              <button className="action-btn" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
            </div>
          </div>

          {result && (
            <div className="panel small" style={{ marginTop: 12 }}>
              <h4>Result</h4>
              <div className="stat-card" style={{ marginBottom: 8 }}>
                <div className="stat-value">{result.credit_score}</div>
                <div className="stat-label">Credit score</div>
              </div>
              <div className="stat-card" style={{ marginBottom: 8 }}>
                <div className="stat-value">{result.risk_level}</div>
                <div className="stat-label">Risk level</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{result.evaluation_fee}</div>
                <div className="stat-label">Evaluation fee</div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

export default Applications
