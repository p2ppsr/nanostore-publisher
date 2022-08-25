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
  // Pay the host for storing the file
  const payment = await paymail.send({
    recipient,
    amount,
    description
  })
  console.log('payment:', payment)
  const pay = await createSignedRequest({
    config,
    path: '/pay',
    body: {
      referenceNumber: payment.reference,
      paymail: sender,
      description: 'Confirmation that payment has been made',
      orderID,
      amount
    }
  })
  console.log('pay:', pay)
  return pay
}
