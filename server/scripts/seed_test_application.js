require('dotenv').config()
const pool = require('../db')

const seed = async () => {
  try {
    const userRes = await pool.query("SELECT id FROM users LIMIT 1")
    if (userRes.rows.length === 0) {
      console.log('No users found to seed application for')
      process.exit(0)
    }

    const userId = userRes.rows[0].id
    const loanAmount = 5000

    const appRes = await pool.query(
      `INSERT INTO loan_applications (user_id, loan_amount, purpose, employment_status, stable_income, previous_repayment, credit_score, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, loanAmount, 'Business inventory', 'employed', true, true, 650, 'submitted']
    )

    const application = appRes.rows[0]
    await pool.query(`INSERT INTO evaluation_fees (application_id, amount, payment_status) VALUES ($1,$2,$3)`, [application.id, (loanAmount*0.05).toFixed(2), 'completed'])

    console.log('Seeded application', application.id)
    process.exit(0)
  } catch (err) {
    console.error('Seeding failed', err)
    process.exit(1)
  }
}

seed()
