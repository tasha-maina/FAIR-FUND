require('dotenv').config()
const pool = require('../db')

;(async () => {
  try {
    // create test admin user
    const email = 'admin@test.local'
    const phone = '254712345678'
    const pw = 'password'

    // find or create admin user
    let userId
    const found = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (found.rows.length > 0) {
      userId = found.rows[0].id
    } else {
      const u = await pool.query(
        `INSERT INTO users (email, phone_number, password_hash, role, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [email, phone, 'testhash', 'admin', 'Test Admin']
      )
      userId = u.rows[0].id
    }

    // create application
    const loanAmount = 1000
    const app = await pool.query(
      `INSERT INTO loan_applications (user_id, loan_amount, purpose, employment_status, stable_income, previous_repayment, credit_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, loanAmount, 'test', 'employed', true, true, 700, 'approved']
    )

    const appId = app.rows[0].id

    // upsert evaluation fee (create or update)
    const feeAmount = (loanAmount * 0.05).toFixed(2)
    const existingFee = await pool.query('SELECT id FROM evaluation_fees WHERE application_id = $1', [appId])
    if (existingFee.rows.length > 0) {
      await pool.query('UPDATE evaluation_fees SET amount = $1, payment_status = $2 WHERE application_id = $3', [feeAmount, 'completed', appId])
    } else {
      await pool.query('INSERT INTO evaluation_fees (application_id, amount, payment_status) VALUES ($1, $2, $3)', [appId, feeAmount, 'completed'])
    }

    console.log('Prepared test data: admin user id=', userId, 'application id=', appId)
    process.exit(0)
  } catch (err) {
    console.error('Error preparing test data', err)
    process.exit(1)
  }
})()
