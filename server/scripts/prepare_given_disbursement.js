require('dotenv').config()
const pool = require('../db')

;(async () => {
  try {
    const applicationId = 'aa4c5141-f619-40f5-a778-75caef0c2a72'
    const phone = '0712345678'
    const normalizedPhone = phone.replace(/^0/, '254')

    // ensure user exists with this phone
    let userId
    const u = await pool.query('SELECT id FROM users WHERE phone_number = $1', [normalizedPhone])
    if (u.rows.length > 0) {
      userId = u.rows[0].id
    } else {
      const email = `user+${Date.now()}@test.local`
      const inserted = await pool.query(
        `INSERT INTO users (email, phone_number, password_hash, role, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [email, normalizedPhone, 'testhash', 'user', 'Test User']
      )
      userId = inserted.rows[0].id
    }

    // upsert application with provided id, mark as approved
    const existingApp = await pool.query('SELECT id FROM loan_applications WHERE id = $1', [applicationId])
    if (existingApp.rows.length > 0) {
      await pool.query(
        `UPDATE loan_applications SET user_id = $1, loan_amount = $2, status = $3, updated_at = NOW() WHERE id = $4`,
        [userId, 1000, 'approved', applicationId]
      )
    } else {
      await pool.query(
        `INSERT INTO loan_applications (id, user_id, loan_amount, purpose, employment_status, stable_income, previous_repayment, credit_score, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [applicationId, userId, 1000, 'test', 'employed', true, true, 700, 'approved']
      )
    }

    // upsert evaluation fee as completed
    const fee = await pool.query('SELECT id FROM evaluation_fees WHERE application_id = $1', [applicationId])
    if (fee.rows.length > 0) {
      await pool.query('UPDATE evaluation_fees SET amount = $1, payment_status = $2 WHERE application_id = $3', [50.0, 'completed', applicationId])
    } else {
      await pool.query('INSERT INTO evaluation_fees (application_id, amount, payment_status) VALUES ($1,$2,$3)', [applicationId, 50.0, 'completed'])
    }

    console.log('Prepared application', applicationId, 'with user', userId, 'phone', normalizedPhone)
    process.exit(0)
  } catch (err) {
    console.error('Error preparing DB:', err)
    process.exit(1)
  }
})()
