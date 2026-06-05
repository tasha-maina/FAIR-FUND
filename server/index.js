const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const pool = require('./db')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Fair Fund API is running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const authRoutes = require('./routes/auth')
app.use('/api/auth', authRoutes)

const applicationRoutes = require('./routes/applications')
app.use('/api/applications', applicationRoutes)