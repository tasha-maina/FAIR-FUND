const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNhNzFmYTg2LWM3MjItNGI5Yi1hZGYyLTY0OTVlOGMyODk1NSIsInJvbGUiOiJhcHBsaWNhbnQiLCJpYXQiOjE3ODIyNDkyNzksImV4cCI6MTc4Mjg1NDA3OX0.k4wSk0oaBLoOAIgMXeGUYcbyc13O3ywp9Y4ldDMDNuk'

const DevQuickLogin = () => {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname
  // only show on local development hosts
  if (!['localhost', '127.0.0.1'].includes(host)) return null

  const login = () => {
    localStorage.setItem('token', DEV_TOKEN)
    // reload so AuthContext picks it up
    window.location.reload()
  }

  return (
    <div style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 9999 }}>
      <button onClick={login} style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: '#f1c40f', border: 'none', cursor: 'pointer' }}>Dev: Quick login</button>
    </div>
  )
}

export default DevQuickLogin
