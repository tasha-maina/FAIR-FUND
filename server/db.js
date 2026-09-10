const { Pool } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const isProduction = process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'))

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('Unexpected database error', err)
})

pool.connect()
  .then((client) => {
    console.log('Connected to Fair Fund database')
    client.release()
  })
  .catch(err => console.error('Database connection error', err))

module.exports = pool