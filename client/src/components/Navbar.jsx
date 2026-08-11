import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Notifications from './Notifications'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>Fair Fund</Link>
        <div style={styles.links}>
          <Link to="/login" style={styles.loginLink}>Sign In</Link>
          <Link to="/register" style={styles.registerLink}>Get Started</Link>
        </div>
      </nav>
    )
  }

  return (
    <nav style={styles.nav}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/dashboard" style={styles.logo}>Fair Fund</Link>
        <div style={styles.links}>
          <Link to="/dashboard" style={styles.link}>Dashboard</Link>
          <Link to="/applications" style={styles.link}>Loans</Link>
          {user.role === 'admin' && <Link to="/admin" style={styles.adminLink}>Admin Portal</Link>}
        </div>
      </div>

      <div style={styles.profile}>
        <Notifications />
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--nav-border)', margin: '0 4px' }}></div>
        <div style={styles.avatar}>
          {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={styles.name}>{user.full_name}</span>
          <span style={styles.role}>{user.role === 'admin' ? 'Administrator' : 'Borrower'}</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'linear-gradient(90deg, #132818 0%, #1d3924 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif'
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#ffffff',
    textDecoration: 'none',
    letterSpacing: '0.03em',
  },
  links: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center'
  },
  link: {
    color: 'rgba(255, 255, 255, 0.78)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'color 0.2s'
  },
  adminLink: {
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.15)'
  },
  loginLink: {
    color: 'rgba(255, 255, 255, 0.85)',
    textDecoration: 'none',
    fontWeight: '600',
    marginRight: '1rem'
  },
  registerLink: {
    textDecoration: 'none',
    background: '#ffffff',
    color: 'var(--brand)',
    padding: '0.5rem 1.2rem',
    borderRadius: '6px',
    fontWeight: '700'
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--brand-light)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '0.95rem'
  },
  name: {
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: '600',
    lineHeight: '1.2'
  },
  role: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.75rem',
    lineHeight: '1.2'
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: 'rgba(255, 255, 255, 0.9)',
    padding: '0.45rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '1rem',
    transition: 'all 0.2s'
  }
}

export default Navbar
