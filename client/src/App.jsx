import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Notifications from './components/Notifications'
import { useAuth } from './context/AuthContext'
import Applications from './pages/Applications'
import DevQuickLogin from './components/DevQuickLogin'
import PayFee from './pages/PayFee'
import Navbar from './components/Navbar'

function App() {
  const { user } = useAuth()
  return (
    <>
      <DevQuickLogin />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Dashboard />
              {user && <Notifications />}
            </div>
          </ProtectedRoute>
        } />
        <Route path="/applications" element={
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/pay/:applicationId" element={
          <ProtectedRoute>
            <PayFee />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  )
}

export default App