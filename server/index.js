const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const pool = require('./db')

const path = require('path')
dotenv.config({ path: path.join(__dirname, '.env') })

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

app.get('/api/health', (req, res) => {
  res.json({ message: 'Fair Fund API is running', status: 'ok' })
})

// Serve static frontend assets if built in client/dist
const distPath = path.join(__dirname, '../client/dist')
app.use(express.static(distPath))

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.json({ message: 'Fair Fund API is running' })
    }
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})