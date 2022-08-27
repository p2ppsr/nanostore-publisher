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
 * @returns {Promise<Object>} The pay object, contains the `uploadURL` and the `publicURL` and the `status`'.
 */
module.exports = async ({ config = CONFIG, sender, recipient, description, orderID, amount } = {}) => {
  // Pay the host for storing the file, this return the txid.
  const payment = await paymail.send({
    recipient,
    amount,
    description
  })
  if (payment.status === 'error') {
    const e = new Error(payment.description)
    e.code = payment.code
    throw e
  }
  // console.log('payment:', payment)
  const pay = await createSignedRequest({
    config,
    path: '/pay',
    body: {
      reference: payment.reference,
      paymail: sender,
      description,
      orderID
    }
  })
  // console.log('pay:', pay)
  if (pay.status === 'error') {
    const e = new Error(pay.description)
    e.code = pay.code
    throw e
  }
  return pay
}
