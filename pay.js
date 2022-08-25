const paymail = require('paymail')
const createSignedRequest = require('./utils/createSignedRequest')
const { CONFIG } = require('./defaults')

/**
 * Payment for the NanoStore file hosting contract.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {Object} obj.config config object, see config section.
 * @param {String} obj.sender The sender paymail making the payment.
 * @param {String} obj.recipient The recipient paymail receiving the payment.
 * @param {Number} obj.amount The number of satoshis being paid.
 * @param {String} obj.description The description to be used for the payment.
 * @param {String} obj.orderID The reference for the payment of the invoice received for hosting.
 *
 * @returns {Promise<Object>} The pay object, containing `txids` array of BSV transaction ids, `note` containing the user's Paymail and thanking them, `reference` to the payment (normally the `ORDER_ID`) and the `status'.
 */

module.exports = async ({ config = CONFIG, sender, recipient, description, orderID, amount } = {}) => {

  // Pay the recipient
  const paymentResult = await paymail.send({
    recipient,
    amount,
    description
  })
  console.log('paymentResult:', paymentResult)
  if (paymentResult.status === 'success') {
    if (!paymentResult.txids) {
      const e = new Error('Payment BSV transaction ids are missing.')
      e.code = 'ERR_PAYMENT_TXIDS_MISSING'
      throw e
    }
    if (!paymentResult.note) {
      const e = new Error('Payment note is missing.')
      e.code = 'ERR_PAYMENT_NOTE_MISSING'
      throw e
    }
    if (!paymentResult.reference) {
      const e = new Error('Payment reference is missing.')
      e.code = 'ERR_PAYMENT_REFERENCE_MISSING'
      throw e
    }

    // Send the recipient proof of payment,
    /**
     * Confirmation of payment for the NanoStore file hosting contract.
     *
     * @param {Object} obj All parameters are given in an object.
     * @param {String} obj.referenceNumber The reference returned for the payment.
     * @param {String} obj.paymail The sender paymail who made the payment.
     * @param {Number} obj.amount The number of satoshis being paid.
     * @param {String} obj.description The description to be used for the payment.
     * @param {String} obj.orderID The reference for the payment of the invoice received for hosting.
     *
     * @returns {Promise<Object>} The paid object, containing `uploadURL` the external URL where the file is uploaded to, `publicURL` for retieving the file and finally the `status`'.
     */

    const paidResult = await createSignedRequest({
      config,
      path: '/pay',
      body: {
        referenceNumber: paymentResult.reference,
        paymail: sender,
        description: 'Confirmation that payment has been made',
        orderID,
        amount
      }
    })
    console.log('paidResult:', paidResult)
    if (paidResult.status === 'success') {
      if (!paidResult.uploadURL) {
        const e = new Error('Paid upload url is missing.')
        e.code = 'ERR_PAID_UPLOAD_URL_MISSING'
        throw e
      }
      if (!paidResult.publicURL) {
        const e = new Error('Paid public url is missing.')
        e.code = 'ERR_PAID_PUBLIC_URL_MISSING'
        throw e
      }
      return paidResult
    } else {
      const e = new Error('Paid confirmation for hosting file response has failed:result:' + JSON.stringify(paidResult))
      e.code = 'ERR_PAID_STATUS_' + paidResult.status
      throw e
    }
  } else {
    const e = new Error('Payment for hosting file has failed:result:' + JSON.stringify(paymentResult))
    e.code = 'ERR_PAYMENT_STATUS_' + paymentResult.status
    throw e
  }
}
