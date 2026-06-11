const fs = require('fs')
const crypto = require('crypto')

/**
 * Generate SecurityCredential by encrypting the initiator password with the
 * Safaricom sandbox/public certificate using RSA PKCS1 v1.5 padding.
 * @param {string} initiatorPassword
 * @param {string} certPath
 * @returns {string} base64 encoded encrypted credential
 */
function generateSecurityCredential(initiatorPassword, certPath = 'server/certs/sandbox.cer') {
  if (!initiatorPassword) throw new Error('Initiator password is required')
  if (!fs.existsSync(certPath)) throw new Error(`Certificate not found at ${certPath}`)

  const cert = fs.readFileSync(certPath)
  const buffer = Buffer.from(initiatorPassword, 'utf8')

  const encrypted = crypto.publicEncrypt(
    { key: cert, padding: crypto.constants.RSA_PKCS1_PADDING },
    buffer
  )

  return encrypted.toString('base64')
}

module.exports = { generateSecurityCredential }
