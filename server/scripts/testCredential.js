#!/usr/bin/env node
require('dotenv').config()
const path = require('path')
const { generateSecurityCredential } = require('../utils/mpesaSecurity')

const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD || 'Safaricom999!'
const certPath = process.env.MPESA_CERT_PATH || path.join(__dirname, '..', 'certs', 'sandbox.cer')

try {
  const credential = generateSecurityCredential(initiatorPassword, certPath)
  console.log(credential)
} catch (err) {
  console.error('ERROR:', err.message)
  process.exit(1)
}
