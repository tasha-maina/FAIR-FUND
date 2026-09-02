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

const queryStkStatus = async (checkoutRequestId) => {
  if (!checkoutRequestId) return null
  try {
    const accessToken = await getAccessToken()
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      },
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 6000 }
    )
    return response.data
  } catch (err) {
    return err.response?.data || null
  }
}

// Shared callback processor so we can reuse logic for real callbacks and tests
const handleStkCallback = async (callbackData) => {
  const {
    ResultCode,
    ResultDesc,
    CheckoutRequestID,
    CallbackMetadata
  } = callbackData

  // 1. Check if it is an evaluation fee
  const feeResult = await pool.query(
    'SELECT id, application_id, payment_status FROM evaluation_fees WHERE checkout_request_id = $1',
    [CheckoutRequestID]
  )

  if (feeResult.rows.length > 0) {
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

      try {
        const appRes = await pool.query('SELECT user_id, loan_amount FROM loan_applications WHERE id = $1', [fee.application_id])
        if (appRes.rows.length > 0) {
          const { user_id, loan_amount } = appRes.rows[0]
          await pool.query(
            `INSERT INTO notifications (user_id, title, body, type, meta)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              user_id,
              'Evaluation Fee Paid',
              `Your evaluation fee of KES ${parseFloat(amount || 0).toLocaleString()} for loan application of KES ${parseFloat(loan_amount).toLocaleString()} has been received (Receipt: ${mpesaCode}). Your application is now under review.`,
              'payment',
              JSON.stringify({ application_id: fee.application_id, mpesa_receipt: mpesaCode })
            ]
          )
        }
      } catch (e) {
        console.warn('Failed to notify fee payment', e)
      }

      return { status: 'completed', mpesaCode, amount, phone }
    } else {
      await pool.query(
        `UPDATE evaluation_fees
         SET payment_status = 'failed'
         WHERE id = $1`,
        [fee.id]
      )

      return { status: 'failed', ResultCode, ResultDesc }
    }
  }

  // 2. Check if it is a loan repayment
  const repaymentResult = await pool.query(
    'SELECT id, loan_offer_id, payment_status FROM repayments WHERE checkout_request_id = $1',
    [CheckoutRequestID]
  )

  if (repaymentResult.rows.length > 0) {
    const rep = repaymentResult.rows[0]
    if (rep.payment_status === 'completed') {
      return { status: 'already_completed' }
    }

    const items = Array.isArray(CallbackMetadata?.Item) ? CallbackMetadata.Item : []
    const mpesaCode = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null
    const amount = items.find(i => i.Name === 'Amount')?.Value || null
    const phone = items.find(i => i.Name === 'PhoneNumber')?.Value || null

    if (ResultCode === 0) {
      await pool.query(
        `UPDATE repayments
         SET payment_status = 'completed', mpesa_transaction_id = $1, paid_at = NOW()
         WHERE id = $2`,
        [mpesaCode, rep.id]
      )

      await pool.query(
        `UPDATE loan_offers
         SET status = 'repaid'
         WHERE id = $1`,
        [rep.loan_offer_id]
      )

      // Also get the application_id to update loan_applications status
      const offerQuery = await pool.query('SELECT application_id FROM loan_offers WHERE id = $1', [rep.loan_offer_id])
      if (offerQuery.rows.length > 0) {
        const appId = offerQuery.rows[0].application_id
        await pool.query(
          `UPDATE loan_applications
           SET status = 'repaid', updated_at = NOW()
           WHERE id = $1`,
          [appId]
        )

        // Notify user about successful repayment
        try {
          const appRes = await pool.query('SELECT user_id, loan_amount FROM loan_applications WHERE id = $1', [appId])
          if (appRes.rows.length > 0) {
            const { user_id, loan_amount } = appRes.rows[0]
            await pool.query(
              `INSERT INTO notifications (user_id, title, body, type)
               VALUES ($1, $2, $3, $4)`,
              [user_id, 'Loan Repaid Successfully', `Your loan of KES ${parseFloat(loan_amount).toLocaleString()} has been fully repaid. Thank you!`, 'repayment']
            )
          }
        } catch (e) {
          console.warn('Failed to notify repayment', e)
        }
      }

      return { status: 'repayment_completed', mpesaCode, amount, phone }
    } else {
      await pool.query(
        `UPDATE repayments
         SET payment_status = 'failed', paid_at = NOW()
         WHERE id = $1`,
        [rep.id]
      )
      return { status: 'repayment_failed', ResultCode, ResultDesc }
    }
  }

  console.warn('Unknown CheckoutRequestID in callback:', CheckoutRequestID)
  return { status: 'unknown' }
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

  if (!application_id) {
    return res.status(400).json({ message: 'application_id is required' })
  }

  try {
    const feeResult = await pool.query(
      `SELECT la.id, la.user_id, la.loan_amount, la.status AS application_status,
              ef.id AS fee_id, ef.amount AS fee_amount, ef.payment_status
       FROM loan_applications la
       LEFT JOIN evaluation_fees ef ON ef.application_id = la.id
       WHERE la.id = $1`,
      [application_id]
    )

    if (feeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' })
    }

    const app = feeResult.rows[0]

    if (req.user.role !== 'admin' && app.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to application' })
    }

    if (app.payment_status === 'completed') {
      return res.status(200).json({
        message: 'Evaluation fee already paid',
        payment_status: 'completed',
        application_status: app.application_status
      })
    }

    let feeId = app.fee_id
    let feeAmount = app.fee_amount
    if (!feeId) {
      feeAmount = (parseFloat(app.loan_amount) * 0.05).toFixed(2)
      const insertedFee = await pool.query(
        `INSERT INTO evaluation_fees (application_id, amount, payment_status)
         VALUES ($1, $2, 'pending') RETURNING id`,
        [application_id, feeAmount]
      )
      feeId = insertedFee.rows[0].id
    }

    const amount = Math.max(1, Math.ceil(parseFloat(feeAmount)))
    const accessToken = await getAccessToken()

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    const formattedPhone = normalizePhoneNumber(phone_number || '')

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
        AccountReference: application_id.slice(0, 12),
        TransactionDesc: 'Loan evaluation fee'
      },
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
    )

    const { CheckoutRequestID } = response.data

    if (CheckoutRequestID) {
      await pool.query(
        'UPDATE evaluation_fees SET checkout_request_id = $1 WHERE id = $2',
        [CheckoutRequestID, feeId]
      )
    }

    return res.status(200).json({
      message: 'STK push sent to your phone',
      data: response.data,
      application_status: app.application_status,
      payment_status: 'pending',
      fee_amount: feeAmount,
      phone: formattedPhone,
      checkout_request_id: CheckoutRequestID || null
    })

  } catch (err) {
    console.error('STK push error:', err.response?.data || err.message)
    return res.status(500).json({
      message: err.response?.data?.errorMessage || 'M-Pesa request failed',
      error: err.response?.data || err.message
    })
  }
})

router.post('/repay', protect, async (req, res) => {
  const { phone_number, loan_offer_id } = req.body

  if (!loan_offer_id) {
    return res.status(400).json({ message: 'loan_offer_id is required' })
  }

  try {
    // 1. Verify loan offer exists and belongs to the current user
    const offerRes = await pool.query(
      `SELECT lo.id, lo.approved_amount, lo.status, la.user_id, la.id AS application_id
       FROM loan_offers lo
       JOIN loan_applications la ON la.id = lo.application_id
       WHERE lo.id = $1 AND la.user_id = $2`,
      [loan_offer_id, req.user.id]
    )

    if (offerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Active loan offer not found' })
    }

    const offer = offerRes.rows[0]

    if (offer.status === 'repaid') {
      return res.status(400).json({ message: 'This loan has already been repaid' })
    }

    const amount = Math.ceil(parseFloat(offer.approved_amount))
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
        AccountReference: loan_offer_id.slice(0, 20),
        TransactionDesc: 'Loan repayment'
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const { CheckoutRequestID } = response.data

    if (CheckoutRequestID) {
      await pool.query(
        `INSERT INTO repayments (loan_offer_id, amount_paid, checkout_request_id, payment_status)
         VALUES ($1, $2, $3, $4)`,
        [loan_offer_id, amount, CheckoutRequestID, 'pending']
      )
    }

    return res.status(200).json({
      message: 'STK push sent to your phone',
      data: response.data,
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

// Endpoint to check the latest evaluation fee status for a specific application
router.get('/application-status/:applicationId', protect, async (req, res) => {
  const { applicationId } = req.params

  try {
    const appResult = await pool.query(
      `SELECT la.id AS application_id, la.user_id, la.loan_amount, la.purpose, la.credit_score, la.status AS application_status,
              ef.id AS fee_id, ef.amount AS fee_amount, ef.payment_status, ef.checkout_request_id,
              ef.mpesa_transaction_id, ef.paid_at,
              u.full_name, u.phone_number AS user_phone
       FROM loan_applications la
       LEFT JOIN evaluation_fees ef ON ef.application_id = la.id
       JOIN users u ON u.id = la.user_id
       WHERE la.id = $1`,
      [applicationId]
    )

    if (appResult.rows.length === 0) {
      return res.status(404).json({ message: 'Application record not found' })
    }

    const record = appResult.rows[0]

    // Authorization: owner or admin
    if (req.user.role !== 'admin' && record.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to application' })
    }

    // Ensure fee row exists
    if (!record.fee_id) {
      const calculatedFee = (parseFloat(record.loan_amount) * 0.05).toFixed(2)
      const newFee = await pool.query(
        `INSERT INTO evaluation_fees (application_id, amount, payment_status)
         VALUES ($1, $2, 'pending') RETURNING *`,
        [applicationId, calculatedFee]
      )
      record.fee_id = newFee.rows[0].id
      record.fee_amount = calculatedFee
      record.payment_status = 'pending'
    }

    // If pending and has checkout_request_id, check with Safaricom query
    if (record.payment_status === 'pending' && record.checkout_request_id) {
      const queryResult = await queryStkStatus(record.checkout_request_id)
      if (queryResult && (queryResult.ResultCode === 0 || queryResult.ResultCode === '0')) {
        const mpesaReceipt = queryResult.MpesaReceiptNumber || `MPESA_${Date.now()}`
        await pool.query(
          `UPDATE evaluation_fees
           SET payment_status = 'completed', mpesa_transaction_id = $1, paid_at = NOW()
           WHERE application_id = $2`,
          [mpesaReceipt, applicationId]
        )
        await pool.query(
          `UPDATE loan_applications
           SET status = 'under_review', updated_at = NOW()
           WHERE id = $1`,
          [applicationId]
        )
        record.payment_status = 'completed'
        record.application_status = 'under_review'
        record.mpesa_transaction_id = mpesaReceipt
        record.paid_at = new Date().toISOString()

        try {
          await pool.query(
            `INSERT INTO notifications (user_id, title, body, type, meta)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              record.user_id,
              'Evaluation Fee Paid',
              `Your evaluation fee of KES ${parseFloat(record.fee_amount).toLocaleString()} has been confirmed (Receipt: ${mpesaReceipt}). Your loan is now under review.`,
              'payment',
              JSON.stringify({ application_id: applicationId, receipt: mpesaReceipt })
            ]
          )
        } catch (e) {
          console.warn('Failed to insert notification', e)
        }
      }
    }

    return res.json({
      application_id: record.application_id,
      loan_amount: record.loan_amount,
      purpose: record.purpose,
      credit_score: record.credit_score,
      application_status: record.payment_status === 'completed' && record.application_status === 'submitted'
        ? 'under_review'
        : record.application_status,
      fee_id: record.fee_id,
      fee_amount: record.fee_amount,
      payment_status: record.payment_status,
      checkout_request_id: record.checkout_request_id,
      mpesa_transaction_id: record.mpesa_transaction_id,
      paid_at: record.paid_at,
      user_phone: record.user_phone,
      full_name: record.full_name
    })
  } catch (err) {
    console.error('Application fee status error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

router.post('/confirm-payment', protect, async (req, res) => {
  const { application_id, mpesa_receipt_number } = req.body

  if (!application_id) {
    return res.status(400).json({ message: 'application_id is required' })
  }

  try {
    const ownership = await pool.query(
      `SELECT la.id, la.user_id, la.loan_amount, ef.amount AS fee_amount, ef.payment_status
       FROM loan_applications la
       LEFT JOIN evaluation_fees ef ON ef.application_id = la.id
       WHERE la.id = $1 AND (la.user_id = $2 OR $3 = 'admin')`,
      [application_id, req.user.id, req.user.role]
    )

    if (ownership.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' })
    }

    const app = ownership.rows[0]
    const receipt = mpesa_receipt_number?.trim() || `QA${Date.now().toString(36).toUpperCase()}`

    let feeAmount = app.fee_amount
    if (!feeAmount) {
      feeAmount = (parseFloat(app.loan_amount) * 0.05).toFixed(2)
      await pool.query(
        `INSERT INTO evaluation_fees (application_id, amount, payment_status, mpesa_transaction_id, paid_at)
         VALUES ($1, $2, 'completed', $3, NOW())`,
        [application_id, feeAmount, receipt]
      )
    } else {
      await pool.query(
        `UPDATE evaluation_fees
         SET payment_status = 'completed', mpesa_transaction_id = $1, paid_at = NOW()
         WHERE application_id = $2`,
        [receipt, application_id]
      )
    }

    await pool.query(
      `UPDATE loan_applications
       SET status = 'under_review', updated_at = NOW()
       WHERE id = $1`,
      [application_id]
    )

    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, type, meta)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          app.user_id,
          'Evaluation Fee Paid',
          `Your evaluation fee of KES ${parseFloat(feeAmount).toLocaleString()} for Application ${application_id.slice(0, 8)} has been confirmed (Receipt: ${receipt}). Your loan is now under review.`,
          'payment',
          JSON.stringify({ application_id, receipt })
        ]
      )
    } catch (e) {
      console.warn('Failed to insert fee notification', e)
    }

    return res.json({
      ok: true,
      message: 'Payment confirmed successfully',
      payment_status: 'completed',
      application_status: 'under_review',
      mpesa_transaction_id: receipt
    })
  } catch (err) {
    console.error('Confirm payment error', err)
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