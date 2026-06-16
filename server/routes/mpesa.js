const express = require('express')
const router = express.Router()
const axios = require('axios')
const pool = require('../db')
const protect = require('../middleware/auth')

let _cachedToken = null
let _tokenExpiry = 0

const getAccessToken = async () => {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  )

  const token = response.data.access_token
  const expiresIn = parseInt(response.data.expires_in || '3500', 10)
  _cachedToken = token
  _tokenExpiry = Date.now() + (expiresIn - 60) * 1000 // refresh 1 minute early

  return token
}

// Shared callback processor so we can reuse logic for real callbacks and tests
const handleStkCallback = async (callbackData) => {
  const {
    ResultCode,
    ResultDesc,
    CheckoutRequestID,
    CallbackMetadata
  } = callbackData

  const feeResult = await pool.query(
    'SELECT id, application_id, payment_status FROM evaluation_fees WHERE checkout_request_id = $1',
    [CheckoutRequestID]
  )

  if (feeResult.rows.length === 0) {
    console.warn('Unknown CheckoutRequestID in callback:', CheckoutRequestID)
    return { status: 'unknown' }
  }

  const fee = feeResult.rows[0]

  if (fee.payment_status === 'completed') {
    return { status: 'already_completed' }
  }

  const items = Array.isArray(CallbackMetadata?.Item) ? CallbackMetadata.Item : []
  const mpesaCode = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null
  const amount = items.find(i => i.Name === 'Amount')?.Value || null
  const phone = items.find(i => i.Name === 'PhoneNumber')?.Value || null

  if (ResultCode === 0) {
    await pool.query(
      `UPDATE evaluation_fees
       SET payment_status = 'completed', mpesa_transaction_id = $1, paid_at = NOW()
       WHERE id = $2`,
      [mpesaCode, fee.id]
    )

    await pool.query(
      `UPDATE loan_applications
       SET status = 'under_review', updated_at = NOW()
       WHERE id = $1`,
      [fee.application_id]
    )

    return { status: 'completed', mpesaCode, amount, phone }
  }

  // non-zero result code => failed
  await pool.query(
    `UPDATE evaluation_fees
     SET payment_status = 'failed'
     WHERE id = $1`,
    [fee.id]
  )

  return { status: 'failed', ResultCode, ResultDesc }
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

  throw new Error('Invalid phone number format. Use 07XXXXXXXX, +2547XXXXXXXX, or 2547XXXXXXXX.')
}

router.post('/stkpush', protect, async (req, res) => {
  const { phone_number, application_id } = req.body

  try {
    const feeResult = await pool.query(
      `SELECT ef.id, ef.amount, ef.payment_status, la.status AS application_status
       FROM evaluation_fees ef
       JOIN loan_applications la ON la.id = ef.application_id
       WHERE ef.application_id = $1`,
      [application_id]
    )

    if (feeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Evaluation fee not found' })
    }

    const fee = feeResult.rows[0]

    if (fee.payment_status === 'completed') {
      return res.status(400).json({ message: 'Evaluation fee already paid' })
    }

    const amount = Math.ceil(parseFloat(fee.amount))
    const accessToken = await getAccessToken()

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    const formattedPhone = normalizePhoneNumber(phone_number)

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: application_id,
        TransactionDesc: 'Loan evaluation fee'
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const { CheckoutRequestID } = response.data

    if (CheckoutRequestID) {
      await pool.query(
        'UPDATE evaluation_fees SET checkout_request_id = $1 WHERE id = $2',
        [CheckoutRequestID, fee.id]
      )
    }

    return res.status(200).json({
      message: 'STK push sent to your phone',
      data: response.data,
      application_status: fee.application_status,
      payment_status: fee.payment_status,
      checkout_request_id: CheckoutRequestID || null
    })

  } catch (err) {
    console.error(err.response?.data || err.message)
    return res.status(500).json({ message: 'M-Pesa request failed', error: err.response?.data || err.message })
  }
})

router.post('/callback', async (req, res) => {
  const callbackData = req.body?.Body?.stkCallback

  if (!callbackData) {
    console.warn('Invalid M-Pesa callback payload', req.body)
    return res.status(400).json({ message: 'Invalid callback payload' })
  }

  try {
    await handleStkCallback(callbackData)
    // Always acknowledge Safaricom with success HTTP payload
    return res.json({ ResultCode: 0, ResultDesc: 'Success' })
  } catch (err) {
    console.error('Error processing M-Pesa callback', err)
    return res.status(500).json({ message: 'Callback processing failed' })
  }
})

// Protected test endpoint to simulate a callback (use for local testing)
router.post('/simulate-callback', protect, async (req, res) => {
  const callbackData = req.body?.stkCallback || req.body

  if (!callbackData) {
    return res.status(400).json({ message: 'Missing callback data' })
  }

  try {
    const result = await handleStkCallback(callbackData)
    return res.json({ ok: true, result })
  } catch (err) {
    console.error('Simulation error', err)
    return res.status(500).json({ ok: false })
  }
})

// Protected status endpoint to inspect a checkout
router.get('/status/:checkout', protect, async (req, res) => {
  const { checkout } = req.params

  try {
    const r = await pool.query('SELECT * FROM evaluation_fees WHERE checkout_request_id = $1', [checkout])
    if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
    return res.json(r.rows[0])
  } catch (err) {
    console.error('Status lookup error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

// Admin-only disbursement endpoint: send funds to applicant via M-Pesa B2C
router.post('/disburse', protect, async (req, res) => {
  const caller = req.user
  if (!caller || caller.role !== 'admin') return res.status(403).json({ message: 'Admin access required' })

  const { application_id } = req.body
  if (!application_id) return res.status(400).json({ message: 'Missing application_id' })

  try {
    // load application and applicant phone
    const appRes = await pool.query(
      `SELECT la.id, la.loan_amount, la.status, u.phone_number
       FROM loan_applications la
       JOIN users u ON u.id = la.user_id
       WHERE la.id = $1`,
      [application_id]
    )

    if (appRes.rows.length === 0) return res.status(404).json({ message: 'Application not found' })

    const application = appRes.rows[0]

    if (application.status !== 'approved') {
      return res.status(400).json({ message: 'Application must be approved before disbursement' })
    }

    // ensure evaluation fee was paid
    const feeRes = await pool.query('SELECT * FROM evaluation_fees WHERE application_id = $1', [application_id])
    if (feeRes.rows.length === 0) return res.status(400).json({ message: 'Evaluation fee record missing' })
    const fee = feeRes.rows[0]
    if (fee.payment_status !== 'completed') return res.status(400).json({ message: 'Evaluation fee not completed' })

    const recipientPhone = normalizePhoneNumber(application.phone_number)

    if (!process.env.MPESA_SECURITY_CREDENTIAL) {
      return res.status(500).json({ message: 'MPESA_SECURITY_CREDENTIAL not configured in environment' })
    }

    const accessToken = await getAccessToken()

    const b2cPayload = {
      InitiatorName: 'testapi',
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
      OriginatorConversationID: Date.now().toString(),
      CommandID: 'BusinessPayment',
      Amount: parseFloat(application.loan_amount),
      PartyA: process.env.MPESA_SHORTCODE,
      PartyB: recipientPhone,
      Remarks: `Disbursement for application ${application_id}`,
      QueueTimeOutURL: process.env.MPESA_B2C_TIMEOUT_URL || process.env.MPESA_CALLBACK_URL,
      ResultURL: process.env.MPESA_B2C_RESULT_URL || process.env.MPESA_CALLBACK_URL,
      Occasion: `LoanDisbursement_${application_id}`
    }

    const resp = await axios.post('https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest', b2cPayload, { headers: { Authorization: `Bearer ${accessToken}` } })

    if (!resp.data || !resp.data.ResponseDescription) {
      console.error('Unexpected B2C response', resp.data)
      return res.status(500).json({ message: 'Unexpected B2C response', data: resp.data })
    }

    // update application status to disbursed
    await pool.query('UPDATE loan_applications SET status = $1, updated_at = NOW() WHERE id = $2', ['disbursed', application_id])

    return res.json({ ok: true, response: resp.data })
  } catch (err) {
    console.error('B2C disbursement error', err.response?.data || err.message)
    return res.status(500).json({ message: 'Disbursement failed', error: err.response?.data || err.message })
  }
})

module.exports = router