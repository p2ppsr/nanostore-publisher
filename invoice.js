const createSignedRequest = require('./utils/createSignedRequest')
const { CONFIG } = require('./defaults')

/**
 * Creates an invoice for a NanoStore file hosting contract.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {Object} obj.config config object, see config section.
 * @param {Number} obj.fileSize The size of the file you want to host in bytes.
 * @param {Number} obj.retentionPeriod The whole number of minutes you want the file to be hosted for.
  *
 * @returns {Promise<Object>} The invoice object, containing `paymail` address for payment to be sent to, `amount` (satoshis), `ORDER_ID`, for referencing this contract payment and passed to the `upload` function. The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded and the `status`.
 */
module.exports = async ({ config = CONFIG, fileSize, retentionPeriod } = {}) => {
  // Send a request to get the invoice
  // console.log('invoice:fileSize:', fileSize, ',retentionPeriod:', retentionPeriod)
  const invoice = await createSignedRequest({
    config,
    path: '/invoice',
    body: {
      fileSize,
      retentionPeriod
    }
  })
  // console.log('invoice:', invoice)
  return invoice
}
