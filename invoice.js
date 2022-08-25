'use strict'
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
 * @returns {Promise<Object>} The invoice object, containing `paymail` address for payment to be sent to, `amount` (satoshis), `ORDER_ID`, for referencing this contract payment and passed to the `upload` function. The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded.
 */

module.exports = async ({ config = CONFIG, fileSize, retentionPeriod } = {}) => {
  const invoiceResult = await createSignedRequest({
    config,
    path: '/invoice',
    body: { fileSize, retentionPeriod }
  })
  console.log('invoiceResult:', invoiceResult)
  if (invoiceResult.status === 'success') {
    if (!invoiceResult.paymail) {
      const e = new Error('Invoice Paymail is missing.')
      e.code = 'ERR_INVOICE_PAYMAIL_MISSING'
      throw e
    }
    if (!invoiceResult.amount) {
      const e = new Error('Invoice amount is missing.')
      e.code = 'ERR_INVOICE_AMOUNT_MISSING'
      throw e
    }
    if (!invoiceResult.ORDER_ID) {
      const e = new Error('Invoice order id is missing.')
      e.code = 'ERR_INVOICE_ORDER_ID_MISSING'
      throw e
    }
    if (!invoiceResult.publicURL) {
      const e = new Error('Invoice public URL is missing.')
      e.code = 'ERR_INVOICE_PUBLIC_URL_MISSING'
      throw e
    }
    return invoiceResult
  } else {
    const e = new Error('Invoice creation has failed:result:' + JSON.stringify(invoiceResult))
    e.code = 'ERR_INVOICE_CREATION_STATUS_' + invoiceResult.status
    throw e
  }
}
