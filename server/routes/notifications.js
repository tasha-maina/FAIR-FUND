const express = require('express')
const router = express.Router()
const pool = require('../db')
const protect = require('../middleware/auth')

// Get current user's notifications
router.get('/', protect, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id])
    return res.json({ notifications: r.rows })
  } catch (err) {
    console.error('Notifications fetch error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

// Mark notification as read
router.post('/:id/read', protect, async (req, res) => {
  const { id } = req.params
  try {
    const update = await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id])
    if (update.rows.length === 0) return res.status(404).json({ message: 'Notification not found' })
    return res.json({ ok: true, notification: update.rows[0] })
  } catch (err) {
    console.error('Mark read error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
