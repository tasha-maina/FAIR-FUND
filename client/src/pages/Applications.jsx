import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Applications = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ loan_amount: '', purpose: '', employment_status: 'employed', stable_income: true, previous_repayment: true })

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
    try {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
      if (!res.ok) {
        const d = await res.json()
        setError(d.message || 'Failed to create')
        return
      }
      await fetchApps()
      navigate('/dashboard')
    } catch (err) {
      setError('Network error')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h2>My Applications</h2>
      {loading ? <div>Loading...</div> : error ? <div style={{ color: '#ff8a8a' }}>{error}</div> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {apps.map(a => (
            <li key={a.id} style={{ padding: 12, background: '#072033', marginBottom: 8, borderRadius: 8 }}>
              <div style={{ fontWeight: 700 }}>Application {a.id}</div>
              <div className="muted">Status: {a.status}</div>
              <div>Amount: KES {a.loan_amount}</div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <h3>Apply for a loan</h3>
        <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <label>Loan amount</label>
          <input name="loan_amount" value={form.loan_amount} onChange={handleChange} />
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
          <button type="submit" style={{ marginTop: 8, padding: '0.6rem 1rem', background: '#c9a84c', border: 'none' }}>Submit application</button>
        </form>
      </div>
    </div>
  )
}

export default Applications
