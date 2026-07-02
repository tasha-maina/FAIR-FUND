const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const protect = require('../middleware/auth')

router.post('/register', async (req, res) => {
  const { full_name, email, password, phone_number, national_id } = req.body

  // enforce national_id presence and basic format server-side
  if (!national_id || !/^[0-9]{7,12}$/.test(national_id)) {
    return res.status(400).json({ message: 'National ID is required and must be 7-12 digits' })
  }

  try {
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)

    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, national_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role`,
      [full_name, email, password_hash, phone_number, national_id]
    )

    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, user: newUser.rows[0] })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash)

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user: { id: user.rows[0].id, full_name: user.rows[0].full_name, email: user.rows[0].email, phone_number: user.rows[0].phone_number, role: user.rows[0].role } })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Return current authenticated user's profile
router.get('/me', protect, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, full_name, email, phone_number, role FROM users WHERE id = $1', [req.user.id])
    if (r.rows.length === 0) return res.status(404).json({ message: 'User not found' })
    return res.json({ user: r.rows[0] })
  } catch (err) {
    console.error('Get profile error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router