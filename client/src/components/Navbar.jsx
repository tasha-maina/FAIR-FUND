import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    background: 'rgba(10, 22, 40, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
    color: '#c9a84c',
    textDecoration: 'none',
    letterSpacing: '0.05em',
    textShadow: '0 0 10px rgba(201, 168, 76, 0.2)'
  },
  links: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center'
  },
  link: {
    color: '#8892b0',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'color 0.2s'
  },
  adminLink: {
    color: '#c084fc',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    background: 'rgba(192, 132, 252, 0.1)',
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid rgba(192, 132, 252, 0.2)'
  },
  loginLink: {
    color: '#c9a84c',
    textDecoration: 'none',
    fontWeight: '600',
    marginRight: '1rem'
  },
  registerLink: {
    textDecoration: 'none',
    background: '#c9a84c',
    color: '#0a1628',
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
    background: 'linear-gradient(135deg, #c9a84c, #f0c96a)',
    color: '#0a1628',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '0.95rem'
  },
  name: {
    color: '#f3f4f6',
    fontSize: '0.9rem',
    fontWeight: '600',
    lineHeight: '1.2'
  },
  role: {
    color: '#8892b0',
    fontSize: '0.75rem',
    lineHeight: '1.2'
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 87, 87, 0.3)',
    color: '#ff8a8a',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '1rem',
    transition: 'all 0.2s'
  }
}

export default Navbar
