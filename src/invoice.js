const { AuthriteClient } = require('authrite-js')
const { CONFIG } = require('./defaults')

/**
 * Creates an invoice for a NanoStore file hosting contract.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {Object} obj.config config object, see config section.
 * @param {Number} obj.fileSize The size of the file you want to host in bytes.
 * @param {Number} obj.retentionPeriod The whole number of minutes you want the file to be hosted for.
  *
 * @returns {Promise<Object>} The invoice object, containing `message` giving details, `identityKey` recipient's private key, `amount` (satoshis), `ORDER_ID`, for referencing this contract payment and passed to the `upload` function. The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded and the `status`.
 */
module.exports = async ({ config = CONFIG, fileSize, retentionPeriod } = {}) => {
  // Initialize a new Authrite client depending on the config
  const client = new AuthriteClient(config.nanostoreURL, (config && config.clientPrivateKey) ? { clientPrivateKey: config.clientPrivateKey } : undefined)

  // Send a request to get the invoice
  const invoice = await client.createSignedRequest('/invoice',
    {
      fileSize,
      retentionPeriod
    }
  )

  // Throw an error if an HTTP error is returned
  if (invoice.status === 'error') {
    const e = new Error(invoice.description)
    e.code = invoice.code
    throw e
  }
  return invoice
}
