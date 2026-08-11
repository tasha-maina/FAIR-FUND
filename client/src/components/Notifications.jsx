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
    } catch (e) {
      console.error('Mark notification read error:', e)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button 
        onClick={() => setOpen(!open)} 
        style={styles.bellBtn} 
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'color 0.2s', color: open ? '#c9a84c' : '#8892b0' }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unread > 0 && (
          <span style={styles.badge}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#c9a84c' }}>Notifications</h4>
            {unread > 0 && <span style={{ fontSize: '0.75rem', color: '#8892b0' }}>{unread} unread</span>}
          </div>
          
          <div style={styles.listContainer}>
            {items.length === 0 ? (
              <div style={styles.emptyState}>No notifications yet</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map(n => (
                  <li key={n.id} style={{ ...styles.item, backgroundColor: n.read ? 'transparent' : 'rgba(201, 168, 76, 0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...styles.itemTitle, color: n.read ? '#e5e7eb' : '#fff' }}>{n.title}</div>
                        <div style={styles.itemBody}>{n.body}</div>
                        {n.created_at && (
                          <div style={styles.itemTime}>
                            {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      {!n.read && (
                        <button 
                          onClick={() => markRead(n.id)} 
                          style={styles.markBtn}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  bellBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    outline: 'none',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.03)'
    }
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: '#ff4d4d',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '700',
    borderRadius: '10px',
    padding: '2px 5px',
    minWidth: '12px',
    textAlign: 'center',
    lineHeight: '1',
    boxShadow: '0 0 6px rgba(255, 77, 77, 0.5)'
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '135%',
    width: '320px',
    background: 'rgba(7, 32, 51, 0.95)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    zIndex: 1010,
    overflow: 'hidden'
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listContainer: {
    maxHeight: '360px',
    overflowY: 'auto',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: '#8892b0',
    fontSize: '0.9rem'
  },
  item: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.01)'
    }
  },
  itemTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '2px'
  },
  itemBody: {
    fontSize: '0.8rem',
    color: '#8892b0',
    lineHeight: '1.4'
  },
  itemTime: {
    fontSize: '0.7rem',
    color: '#5b6580',
    marginTop: '6px'
  },
  markBtn: {
    background: 'rgba(201, 168, 76, 0.1)',
    border: 'none',
    color: '#c9a84c',
    cursor: 'pointer',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    transition: 'all 0.2s',
    outline: 'none',
    ':hover': {
      background: '#c9a84c',
      color: '#0a1628'
    }
  }
}

export default Notifications
