const crypto = require('crypto')
const fs = require('fs')

const generateSecurityCredential = (password, certPath) => {
  let publicKey = null

  if (certPath) {
    try {
      if (fs.existsSync(certPath)) {
        const fileContent = fs.readFileSync(certPath)
        const strContent = fileContent.toString('utf8').trim()
        if (strContent.startsWith('<!DOCTYPE') || strContent.startsWith('<html')) {
          console.warn(`Certificate at ${certPath} is invalid HTML (probably a 404 page). Falling back to sandbox key.`)
        } else {
          publicKey = fileContent
        }
      }
    } catch (err) {
      console.warn(`Could not read certificate from ${certPath}, falling back to sandbox key:`, err.message)
    }
  }

  if (!publicKey) {
    publicKey = `-----BEGIN CERTIFICATE-----
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
lMfhiH/jx+vUNGAj35c/TPaBtEsG
-----END CERTIFICATE-----`
  }

  const buffer = Buffer.from(password)
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    buffer
  )

  return encrypted.toString('base64')
}

module.exports = { generateSecurityCredential }