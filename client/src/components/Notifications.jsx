import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Notifications = () => {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!token) return
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setItems(d.notifications || []))
      .catch(() => {})
  }, [token])

  const unread = items.filter(i => !i.read).length

  const markRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      setItems(items.map(it => it.id === id ? { ...it, read: true } : it))
    } catch (e) {}
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Notifications">
        🔔{unread > 0 && <span style={{ marginLeft: 6, color: '#c9a84c' }}>{unread}</span>}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: '120%', width: 320, background: '#072033', color: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Notifications</h4>
          {items.length === 0 && <div style={{ color: '#8892b0' }}>No notifications</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map(n => (
              <li key={n.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#8892b0' }}>{n.body}</div>
                  </div>
                  {!n.read && <button onClick={() => markRead(n.id)} style={{ background: 'transparent', border: 'none', color: '#c9a84c', cursor: 'pointer' }}>Mark</button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Notifications
