const { Pool } = require('pg')
require('dotenv').config()

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