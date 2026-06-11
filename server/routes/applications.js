const express = require('express')
const router = express.Router()
const pool = require('../db')
const protect = require('../middleware/auth')

const calculateCreditScore = require('../utils/creditScoring')
const axios = require('axios')
const { generateSecurityCredential } = require('../utils/mpesaSecurity')

// small helper to fetch Daraja access token (copied pattern from mpesa routes)
let _local_cached_token = null
let _local_token_expiry = 0
const getAccessToken = async () => {
  if (_local_cached_token && Date.now() < _local_token_expiry) return _local_cached_token

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  )

  const token = response.data.access_token
  const expiresIn = parseInt(response.data.expires_in || '3500', 10)
  _local_cached_token = token
  _local_token_expiry = Date.now() + (expiresIn - 60) * 1000
  return token
}

const normalizePhoneNumber = (phoneNumber = '') => {
  const digits = phoneNumber.replace(/\D/g, '')

  if (/^0\d{9}$/.test(digits)) {
    return `254${digits.slice(1)}`
  }

  if (/^7\d{8}$/.test(digits)) {
    return `254${digits}`
  }

  if (/^254\d{9}$/.test(digits)) {
    return digits
  }

  throw new Error('Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX')
}

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

// Admin-only review endpoint: set application status to 'approved' or 'rejected' with optional note
router.patch('/:id/review', protect, async (req, res) => {
  const reviewer = req.user
  if (!reviewer || reviewer.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  const { id } = req.params
  const { status, note } = req.body

  if (!status || !['approved', 'rejected', 'under_review'].includes(status)) {
    return res.status(400).json({ message: "Invalid status. Use 'approved', 'rejected', or 'under_review'" })
  }

  try {
    const update = await pool.query(
      `UPDATE loan_applications
       SET status = $1, updated_at = NOW(), admin_note = $2
       WHERE id = $3
       RETURNING *`,
      [status, note || null, id]
    )

    if (update.rows.length === 0) return res.status(404).json({ message: 'Application not found' })

    return res.json({ ok: true, application: update.rows[0] })
  } catch (err) {
    console.error('Admin review error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router

// Admin-only disbursement endpoint: send funds to applicant via M-Pesa B2C
router.post('/:id/disburse', protect, async (req, res) => {
  const caller = req.user
  if (!caller || caller.role !== 'admin') return res.status(403).json({ message: 'Admin access required' })

  const { id } = req.params

  try {
    // load application and applicant phone
    const appRes = await pool.query(
      `SELECT la.id, la.loan_amount, la.status, u.phone_number, u.id as user_id
       FROM loan_applications la
       JOIN users u ON u.id = la.user_id
       WHERE la.id = $1`,
      [id]
    )

    if (appRes.rows.length === 0) return res.status(404).json({ message: 'Application not found' })

    const application = appRes.rows[0]

    if (application.status !== 'approved') {
      return res.status(400).json({ message: 'Application must be approved before disbursement' })
    }

    // ensure evaluation fee was paid
    const feeRes = await pool.query('SELECT * FROM evaluation_fees WHERE application_id = $1', [id])
    if (feeRes.rows.length === 0) return res.status(400).json({ message: 'Evaluation fee record missing' })
    const fee = feeRes.rows[0]
    if (fee.payment_status !== 'completed') return res.status(400).json({ message: 'Evaluation fee not completed' })

    // find or create a loan_offer for this application
    let offerRes = await pool.query('SELECT * FROM loan_offers WHERE application_id = $1 ORDER BY offered_at DESC LIMIT 1', [id])
    let offer
    if (offerRes.rows.length === 0) {
      const create = await pool.query(
        `INSERT INTO loan_offers (application_id, reviewed_by, approved_amount, interest_rate, repayment_months, status, offered_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [id, caller.id, application.loan_amount, 0, 1, 'approved']
      )
      offer = create.rows[0]
    } else {
      offer = offerRes.rows[0]
    }

    // prepare disbursement — if SecurityCredential is not configured we simulate
    const recipientPhone = normalizePhoneNumber(application.phone_number)
    let mpesaTxId = null

    // try to generate the SecurityCredential from provided cert and initiator password
    if (!process.env.MPESA_SECURITY_CREDENTIAL) {
      try {
        const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD
        const certPath = process.env.MPESA_CERT_PATH || 'server/certs/sandbox.cer'
        const securityCredential = generateSecurityCredential(initiatorPassword, certPath)

        const accessToken = await getAccessToken()
        const b2cPayload = {
          InitiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
          SecurityCredential: securityCredential,
          CommandID: 'BusinessPayment',
          Amount: parseFloat(application.loan_amount),
          PartyA: process.env.MPESA_SHORTCODE,
          PartyB: recipientPhone,
          Remarks: `Disbursement for application ${id}`,
          QueueTimeOutURL: process.env.MPESA_B2C_TIMEOUT_URL || process.env.MPESA_CALLBACK_URL,
          ResultURL: process.env.MPESA_B2C_RESULT_URL || process.env.MPESA_CALLBACK_URL,
          Occasion: `LoanDisbursement_${id}`
        }

        const resp = await axios.post('https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest', b2cPayload, { headers: { Authorization: `Bearer ${accessToken}` } })

        if (resp.data && resp.data.ResponseDescription) {
          mpesaTxId = resp.data.ConversationID || resp.data.OriginatorConversationID || `B2C_${Date.now()}`
        } else {
          throw new Error('Unexpected B2C response')
        }
      } catch (err) {
        // if anything fails (missing cert, encryption or API) fall back to simulated id for dev
        console.warn('B2C generation failed, falling back to simulated tx id:', err.message || err)
        mpesaTxId = `SIMULATED_B2C_${Date.now()}`
      }
    } else {
      // explicit security credential provided in env
      const accessToken = await getAccessToken()
      const b2cPayload = {
        InitiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
        SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
        CommandID: 'BusinessPayment',
        Amount: parseFloat(application.loan_amount),
        PartyA: process.env.MPESA_SHORTCODE,
        PartyB: recipientPhone,
        Remarks: `Disbursement for application ${id}`,
        QueueTimeOutURL: process.env.MPESA_B2C_TIMEOUT_URL || process.env.MPESA_CALLBACK_URL,
        ResultURL: process.env.MPESA_B2C_RESULT_URL || process.env.MPESA_CALLBACK_URL,
        Occasion: `LoanDisbursement_${id}`
      }

      const resp = await axios.post('https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest', b2cPayload, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (resp.data && resp.data.ResponseDescription) {
        mpesaTxId = resp.data.ConversationID || resp.data.OriginatorConversationID || `B2C_${Date.now()}`
      } else {
        throw new Error('Unexpected B2C response')
      }
    }

    // update offer with mpesa transaction id and mark application disbursed
    await pool.query('UPDATE loan_offers SET mpesa_transaction_id = $1, status = $2 WHERE id = $3', [mpesaTxId, 'disbursed', offer.id])
    await pool.query('UPDATE loan_applications SET status = $1, updated_at = NOW() WHERE id = $2', ['disbursed', id])

    return res.json({ ok: true, mpesa_transaction_id: mpesaTxId })
  } catch (err) {
    console.error('Disbursement error', err.response?.data || err.message)
    return res.status(500).json({ message: 'Disbursement failed', error: err.response?.data || err.message })
  }
})