const express = require('express')
const router = express.Router()
const pool = require('../db')
const protect = require('../middleware/auth')

const calculateCreditScore = require('../utils/creditScoring')

router.post('/', protect, async (req, res) => {
  const { loan_amount, purpose, employment_status, stable_income, previous_repayment } = req.body
  const user_id = req.user.id

  try {
    const { score, breakdown, risk_level } = calculateCreditScore({
      employment_status,
      stable_income,
      previous_repayment,
      loan_amount
    })

    const newApplication = await pool.query(
      `INSERT INTO loan_applications 
        (user_id, loan_amount, purpose, employment_status, stable_income, previous_repayment, credit_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, loan_amount, purpose, employment_status, stable_income, previous_repayment, score]
    )

    const application_id = newApplication.rows[0].id

    await pool.query(
      `INSERT INTO credit_scores (user_id, application_id, score, score_breakdown, risk_level)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, application_id, score, JSON.stringify(breakdown), risk_level]
    )

    const evaluation_fee = (parseFloat(loan_amount) * 0.05).toFixed(2)

    await pool.query(
      `INSERT INTO evaluation_fees (application_id, amount)
       VALUES ($1, $2)`,
      [application_id, evaluation_fee]
    )

    res.status(201).json({
      application: newApplication.rows[0],
      credit_score: { score, breakdown, risk_level },
      evaluation_fee: `KES ${evaluation_fee}`
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/', protect, async (req, res) => {
  const user_id = req.user.id

  try {
    const applications = await pool.query(
      'SELECT * FROM loan_applications WHERE user_id = $1 ORDER BY submitted_at DESC',
      [user_id]
    )

    res.json(applications.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router