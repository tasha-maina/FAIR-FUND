const { Pool } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  console.error('Unexpected database error', err)
})

pool.connect()
  .then(() => console.log('Connected to Fair Fund database'))
  .catch(err => console.error('Database connection error', err))

module.exports = pool