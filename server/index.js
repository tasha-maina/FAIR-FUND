const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const pool = require('./db')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const authRoutes = require('./routes/auth')
app.use('/api/auth', authRoutes)

const applicationRoutes = require('./routes/applications')
app.use('/api/applications', applicationRoutes)

const mpesaRoutes = require('./routes/mpesa')
app.use('/api/mpesa', mpesaRoutes)

const notificationsRoutes = require('./routes/notifications')
app.use('/api/notifications', notificationsRoutes)

app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected'
  try {
    await pool.query('SELECT 1')
  } catch {
    dbStatus = 'disconnected'
  }
  res.json({
    message: 'Fair Fund API is running',
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  })
})

// Serve static frontend assets if built in client/dist
const distPath = path.join(__dirname, '../client/dist')
app.use(express.static(distPath))

app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' })
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.json({ message: 'Fair Fund API is running' })
    }
  })
})

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err)
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  })
})

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`)
  server.close(() => {
    pool.end(() => {
      console.log('Database pool closed. Process exited.')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))