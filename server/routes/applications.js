const express = require('express')
const router = express.Router()
const pool = require('../db')
const protect = require('../middleware/auth')

router.post('/', protect, async (req, res) => {
  const { loan_amount, purpose, employment_status, stable_income, previous_repayment } = req.body
  const user_id = req.user.id

  try {
    const newApplication = await pool.query(
      `INSERT INTO loan_applications 
        (user_id, loan_amount, purpose, employment_status, stable_income, previous_repayment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, loan_amount, purpose, employment_status, stable_income, previous_repayment]
    )

    res.status(201).json(newApplication.rows[0])
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